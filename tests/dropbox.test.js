import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine, AuthError, ConflictError } from '../src/sync/sync-engine.js';
import { DropboxProvider, headerJson, pkceChallenge, dropboxRedirectUri } from '../src/sync/dropbox.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

/** Dropbox-Attrappe: eine Datei mit rev, Tokens, Aufrufprotokoll. */
function fakeDropbox() {
  const box = { file: null, rev: 0, calls: [], validToken: 'tok1', refreshes: 0, paths: new Set() };
  box.fetch = async (url, opts = {}) => {
    const path = new URL(url).pathname;
    box.calls.push(path);
    if (path === '/oauth2/token') {
      const f = new URLSearchParams(opts.body);
      if (f.get('grant_type') === 'refresh_token' && f.get('refresh_token') === 'langzeit') {
        box.refreshes++;
        box.validToken = `tok${box.refreshes + 1}`;
        return json({ access_token: box.validToken, expires_in: 14400 });
      }
      if (f.get('grant_type') === 'authorization_code' && f.get('code') === 'c0de' && f.get('code_verifier')) {
        return json({ access_token: box.validToken, expires_in: 14400, refresh_token: 'langzeit' });
      }
      return json({ error: 'invalid_grant', error_description: 'refresh token is invalid' }, 400);
    }
    if (opts.headers?.Authorization !== `Bearer ${box.validToken}`) return json({ error_summary: 'expired_access_token/' }, 401);
    const arg = JSON.parse(opts.headers['Dropbox-API-Arg'] || opts.body || '{}');
    if (arg.path) box.paths.add(arg.path);
    const rev = () => `r${box.rev}`;
    if (path === '/2/files/get_metadata') {
      return box.file === null ? json({ error_summary: 'path/not_found/..' }, 409) : json({ rev: rev() });
    }
    if (path === '/2/files/download') {
      if (box.file === null) return json({ error_summary: 'path/not_found/' }, 409);
      return new Response(box.file, { headers: { 'Dropbox-API-Result': JSON.stringify({ rev: rev() }) } });
    }
    if (path === '/2/files/upload') {
      const m = arg.mode;
      const ok = m['.tag'] === 'add' ? box.file === null : box.file !== null && m.update === rev();
      if (!ok) return json({ error_summary: 'path/conflict/file/..' }, 409);
      box.file = opts.body;
      box.rev++;
      return json({ rev: rev() });
    }
    return json({}, 404);
  };
  return box;
}

const signedIn = (box, storage = memory(), token = box.validToken) => {
  storage.setItem('dropbox.token', JSON.stringify({ accessToken: token, expiresAt: Date.now() + 3600_000, refreshToken: 'langzeit' }));
  return new DropboxProvider({ appKey: 'key', fetch: box.fetch, storage, redirectUri: 'https://x.de/app/' });
};

describe('Dropbox: Hilfen', () => {
  it('PKCE-Prüfwert wie im Standard (RFC 7636, Anhang B)', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('Dropbox-API-Arg enthält nur ASCII', () => {
    expect(headerJson({ path: '/Lieder/Über mir.json' })).toBe('{"path":"/Lieder/\\u00dcber mir.json"}');
  });

  it('Rücksprung-Adresse ohne Abfrage und Anker', () => {
    expect(dropboxRedirectUri({ origin: 'https://x.de', pathname: '/Liederbuch/' })).toBe('https://x.de/Liederbuch/');
  });
});

describe('Dropbox: Anmeldung', () => {
  it('Anmeldeseite mit PKCE und Langzeit-Token, Rückkehr tauscht den Code', async () => {
    const box = fakeDropbox();
    const storage = memory();
    const p = new DropboxProvider({ appKey: 'key', fetch: box.fetch, storage, redirectUri: 'https://x.de/app/' });
    expect(p.signedIn).toBe(false);
    const url = new URL(await p.loginUrl({ bookId: 'personal' }));
    expect(url.origin + url.pathname).toBe('https://www.dropbox.com/oauth2/authorize');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('token_access_type')).toBe('offline');
    expect(url.searchParams.get('redirect_uri')).toBe('https://x.de/app/');
    // fremder state: keine Dropbox-Rückkehr für uns
    expect(await p.finishLogin(new URLSearchParams('code=c0de&state=falsch'))).toBe(null);
    const state = url.searchParams.get('state');
    const saved = await p.finishLogin(new URLSearchParams(`code=c0de&state=${state}`));
    expect(saved.bookId).toBe('personal');
    expect(p.signedIn).toBe(true);
    expect(JSON.parse(storage.getItem('dropbox.token')).refreshToken).toBe('langzeit');
  });

  it('Abbruch bei Dropbox wird als Anmeldefehler gemeldet', async () => {
    const box = fakeDropbox();
    const p = new DropboxProvider({ appKey: 'key', fetch: box.fetch, storage: memory(), redirectUri: 'https://x.de/' });
    const state = new URL(await p.loginUrl()).searchParams.get('state');
    let err = null;
    try {
      await p.finishLogin(new URLSearchParams(`error=access_denied&state=${state}`));
    } catch (e) {
      err = e;
    }
    expect(err instanceof AuthError).toBe(true);
    expect(err.message).toContain('abgebrochen');
  });

  it('abgelaufenes Zugangstoken wird still erneuert', async () => {
    const box = fakeDropbox();
    const p = signedIn(box, memory(), 'alt');
    expect(await p.read()).toBe(null);
    expect(box.refreshes).toBe(1);
  });

  it('ungültiges Langzeit-Token: Anmeldung nötig, Token weg', async () => {
    const box = fakeDropbox();
    const storage = memory();
    storage.setItem('dropbox.token', JSON.stringify({ accessToken: 'alt', expiresAt: 0, refreshToken: 'widerrufen' }));
    const p = new DropboxProvider({ appKey: 'key', fetch: box.fetch, storage });
    let err = null;
    try {
      await p.read();
    } catch (e) {
      err = e;
    }
    expect(err instanceof AuthError).toBe(true);
    expect(storage.getItem('dropbox.token')).toBe(null);
  });
});

describe('Dropbox: Datei', () => {
  it('legt an, liest, erkennt „unverändert“ und Konflikte', async () => {
    const box = fakeDropbox();
    const p = signedIn(box);
    expect(await p.read()).toBe(null);
    const v1 = await p.write({ format: 'liederbuch-sync', version: 2, songs: [] }, null);
    expect(v1).toBe('r1');
    const r = await p.read();
    expect(r.version).toBe('r1');
    expect(r.data.format).toBe('liederbuch-sync');
    expect(await p.read('r1')).toEqual({ unchanged: true });
    const v2 = await p.write({ format: 'liederbuch-sync', version: 2, songs: [] }, 'r1');
    expect(v2).toBe('r2');
    let err = null;
    try {
      await p.write({ songs: [] }, 'r1'); // veraltet
    } catch (e) {
      err = e;
    }
    expect(err instanceof ConflictError).toBe(true);
  });

  it('zwei Geräte gleichen über Dropbox ab', async () => {
    const box = fakeDropbox();
    const A = new SongRepository(createMemoryStore());
    const B = new SongRepository(createMemoryStore());
    await A.create('{title: Alpha}');
    await B.create('{title: Beta}');
    const eA = new SyncEngine(A, signedIn(box));
    const eB = new SyncEngine(B, signedIn(box));
    eA.state = eB.state = 'idle';
    await eA.sync();
    await eB.sync();
    await eA.sync();
    const titles = async (repo) => (await repo.list()).map((s) => s.title).sort();
    expect(await titles(A)).toEqual(['Alpha', 'Beta']);
    expect(await titles(B)).toEqual(['Alpha', 'Beta']);
    expect(eA.state).toBe('idle');
  });
});

describe('Dropbox: mehrere Liederbücher (2.2)', () => {
  it('eigene Datei und eigene Anmeldung je Buch; Kontoauswahl bei der ersten Anmeldung', async () => {
    const box = fakeDropbox();
    const storage = memory();
    storage.setItem('dropbox.token:book-1', JSON.stringify({ accessToken: box.validToken, expiresAt: Date.now() + 3600_000, refreshToken: 'langzeit' }));
    const band = new DropboxProvider({ appKey: 'key', fetch: box.fetch, storage, path: 'Liederbuch – Band.json', tokenKey: 'dropbox.token:book-1' });
    const mine = new DropboxProvider({ appKey: 'key', fetch: box.fetch, storage, redirectUri: 'https://x.de/' });
    expect(band.signedIn).toBe(true);
    expect(mine.signedIn).toBe(false);
    await band.write({ songs: [] }, null);
    expect([...box.paths]).toEqual(['/Liederbuch – Band.json']);
    const url = new URL(await mine.loginUrl({ bookId: 'book-2' }, { choose: true }));
    expect(url.searchParams.get('force_reauthentication')).toBe('true');
    expect(new URL(await mine.loginUrl()).searchParams.has('force_reauthentication')).toBe(false);
  });
});
