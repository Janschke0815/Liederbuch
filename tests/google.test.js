import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine, AuthError, ConflictError, ReadOnlyError } from '../src/sync/sync-engine.js';
import { GoogleAuth, DRIVE_SCOPE, authMessage, googleRedirectUri } from '../src/sync/google-auth.js';
import { GoogleDriveProvider } from '../src/sync/google-drive.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fails = async (fn) => {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return null;
};

/** Attrappe der Google-Anmeldung (Google Identity Services). */
function fakeGis({ error = null, scope = DRIVE_SCOPE, token = 'tok-a' } = {}) {
  const gis = { prompts: [] };
  gis.google = {
    accounts: {
      oauth2: {
        initTokenClient: (cfg) => ({
          requestAccessToken: ({ prompt }) => {
            gis.prompts.push(prompt);
            if (error) cfg.error_callback({ type: error });
            else cfg.callback({ access_token: token, expires_in: 3599, scope });
          },
        }),
        hasGrantedAllScopes: (resp, s) => resp.scope.split(' ').includes(s),
      },
    },
  };
  return gis;
}

/**
 * Attrappe von Google Drive: Dateien mit Version und Freigaben; jedes Token gehört einer Person.
 * tokens: { 'tok-a': 'anna', 'tok-b': 'ben' } – anna besitzt, was sie anlegt.
 */
function fakeDrive(tokens = { 'tok-a': 'anna', 'tok-b': 'ben' }) {
  const d = { files: new Map(), next: 1, calls: [], online: true };
  const roleOf = (f, who) => (f.owner === who ? 'owner' : f.perms.find((p) => p.who === who)?.role || null);
  d.fetch = async (url, opts = {}) => {
    if (!d.online) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    const method = opts.method || 'GET';
    d.calls.push(`${method} ${u.pathname}`);
    if (u.hostname === 'oauth2.googleapis.com') return json({});
    const who = tokens[String(opts.headers?.Authorization || '').replace('Bearer ', '')];
    if (!who) return json({ error: { code: 401, message: 'Invalid Credentials' } }, 401);
    const m = /\/files(?:\/([^/]+))?(\/permissions(?:\/([^/]+))?)?$/.exec(u.pathname);
    const id = m?.[1];
    const f = id ? d.files.get(id) : null;
    if (id && (!f || !roleOf(f, who))) return json({ error: { code: 404, message: 'File not found' } }, 404);
    // Datei anlegen
    if (method === 'POST' && !id) {
      const meta = JSON.parse(await opts.body.get('metadata').text());
      const nf = { id: `f${d.next++}`, name: meta.name, appProperties: meta.appProperties, owner: who, perms: [], version: '1', content: await opts.body.get('file').text() };
      d.files.set(nf.id, nf);
      return json({ id: nf.id, version: nf.version, name: nf.name });
    }
    // Suchen (nur eigene, von der App angelegte Dateien)
    if (method === 'GET' && !id) {
      const files = [...d.files.values()].filter((x) => x.owner === who && x.appProperties?.liederbuch === 'sync');
      return json({ files: files.map((x) => ({ id: x.id })) });
    }
    const role = roleOf(f, who);
    if (m[2]) {
      // Freigaben
      if (method === 'GET') {
        return json({ permissions: [{ id: 'p0', type: 'user', role: 'owner', emailAddress: `${f.owner}@x.de` }, ...f.perms.map((p) => ({ id: p.id, type: 'user', role: p.role, emailAddress: `${p.who}@x.de` }))] });
      }
      if (role !== 'owner' && role !== 'writer') return json({ error: { errors: [{ reason: 'insufficientFilePermissions' }] } }, 403);
      if (method === 'POST') {
        const b = JSON.parse(opts.body);
        const p = { id: `p${f.perms.length + 1}`, who: b.emailAddress.split('@')[0], role: b.role, message: u.searchParams.get('emailMessage') };
        f.perms.push(p);
        return json({ id: p.id });
      }
      if (method === 'PATCH') {
        f.perms.find((p) => p.id === m[3]).role = JSON.parse(opts.body).role;
        return json({});
      }
      if (method === 'DELETE') {
        f.perms = f.perms.filter((p) => p.id !== m[3]);
        return new Response(null, { status: 204 });
      }
    }
    if (method === 'GET' && u.searchParams.get('alt') === 'media') return new Response(f.content);
    if (method === 'GET') {
      return json({ id: f.id, name: f.name, version: f.version, trashed: false, ownedByMe: role === 'owner', capabilities: { canEdit: role !== 'reader', canShare: role !== 'reader' } });
    }
    if (method === 'PATCH') {
      if (role === 'reader') return json({ error: { code: 403, errors: [{ reason: 'insufficientFilePermissions' }], message: 'no write' } }, 403);
      f.content = opts.body;
      f.version = String(Number(f.version) + 1);
      return json({ version: f.version });
    }
    return json({}, 400);
  };
  /** Datei für eine Person freigeben (wie über Drive). */
  d.share = (fileId, who, role) => d.files.get(fileId).perms.push({ id: `p${Math.random()}`, who, role });
  return d;
}

/** Angemeldete Person mit eigenem Gerätespeicher. */
function person(drive, token, { book } = {}) {
  const storage = memory();
  storage.setItem('gdrive.token', JSON.stringify({ accessToken: token, expiresAt: Date.now() + 3600_000 }));
  const auth = new GoogleAuth({ clientId: 'cid', storage, session: memory(), fetch: drive.fetch });
  const provider = new GoogleDriveProvider({ auth, book, storage, fetch: drive.fetch });
  return { storage, auth, provider };
}

const titles = async (repo) => (await repo.list()).map((s) => s.title).sort();

describe('Google: Anmeldung', () => {
  it('Anmelden mit Fenster speichert das Token; still = ohne Rückfrage', async () => {
    const gis = fakeGis();
    const storage = memory();
    const auth = new GoogleAuth({ clientId: 'cid', storage, session: memory(), gis: async () => gis.google });
    expect(auth.signedIn).toBe(false);
    await auth.signIn();
    expect(auth.signedIn).toBe(true);
    expect(auth.token()).toBe('tok-a');
    await auth.signIn({ silent: true });
    expect(gis.prompts).toEqual(['', 'none']);
  });

  it('Abbruch, blockiertes Fenster und fehlende Zustimmung: verständliche Meldung', async () => {
    for (const [error, text] of [['popup_closed', 'abgebrochen'], ['popup_failed_to_open', 'blockiert']]) {
      const gis = fakeGis({ error });
      const auth = new GoogleAuth({ clientId: 'cid', storage: memory(), session: memory(), gis: async () => gis.google });
      const err = await fails(() => auth.signIn());
      expect(err instanceof AuthError).toBe(true);
      expect(err.message).toContain(text);
    }
    const gis = fakeGis({ scope: 'email' });
    const auth = new GoogleAuth({ clientId: 'cid', storage: memory(), session: memory(), gis: async () => gis.google });
    expect((await fails(() => auth.signIn())).message).toContain('nicht erlaubt');
  });

  it('ohne Client-ID: Hinweis auf die Einrichtung', async () => {
    const auth = new GoogleAuth({ clientId: '', storage: memory(), session: memory(), gis: async () => fakeGis().google });
    const err = await fails(() => auth.signIn());
    expect(err instanceof AuthError).toBe(true);
    expect(err.message).toContain('Einrichtung');
  });

  it('abgelaufenes Token zählt nicht; expire() vergisst es, das Gerät bleibt „bekannt“', () => {
    const storage = memory();
    const auth = new GoogleAuth({ clientId: 'cid', storage, session: memory() });
    storage.setItem('gdrive.token', JSON.stringify({ accessToken: 'alt', expiresAt: Date.now() + 30_000 }));
    expect(auth.signedIn).toBe(false); // weniger als eine Minute übrig
    storage.setItem('gdrive.token', JSON.stringify({ accessToken: 'neu', expiresAt: Date.now() + 3600_000 }));
    expect(auth.signedIn).toBe(true);
    auth.expire();
    expect(auth.signedIn).toBe(false);
    expect(auth.known).toBe(true);
  });

  it('Weiterleitung: Anmeldeseite, Rückkehr mit Token, fremde Rückkehr wird ignoriert', () => {
    const storage = memory();
    const auth = new GoogleAuth({ clientId: 'cid', storage, session: memory(), redirectUri: 'https://x.de/app/' });
    const url = new URL(auth.loginUrl({ silent: true, extra: { bookId: 'personal' } }));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toBe(DRIVE_SCOPE);
    expect(url.searchParams.get('redirect_uri')).toBe('https://x.de/app/');
    expect(url.searchParams.get('prompt')).toBe('none');
    expect(auth.finishLogin('#abo=https%3A%2F%2Fx.de')).toBe(null);
    expect(auth.finishLogin('#access_token=t&state=falsch')).toBe(null);
    const state = url.searchParams.get('state');
    const saved = auth.finishLogin(`#access_token=tok-r&expires_in=3599&scope=${encodeURIComponent(DRIVE_SCOPE)}&state=${state}`);
    expect(saved.bookId).toBe('personal');
    expect(auth.token()).toBe('tok-r');
  });

  it('Weiterleitung: still nicht möglich -> noch einmal mit Rückfrage; Ablehnen -> Meldung', () => {
    const auth = new GoogleAuth({ clientId: 'cid', storage: memory(), session: memory(), redirectUri: 'https://x.de/' });
    let state = new URL(auth.loginUrl({ silent: true })).searchParams.get('state');
    let err = null;
    try {
      auth.finishLogin(`#error=interaction_required&state=${state}`);
    } catch (e) {
      err = e;
    }
    expect(err.retry).toBe(true);
    state = new URL(auth.loginUrl()).searchParams.get('state');
    try {
      auth.finishLogin(`#error=access_denied&state=${state}`);
    } catch (e) {
      err = e;
    }
    expect(err instanceof AuthError).toBe(true);
    expect(err.retry).toBe(false);
    expect(err.message).toContain('nicht erlaubt');
  });

  it('Abmelden widerruft den Zugang bei Google', () => {
    const drive = fakeDrive();
    const { auth } = person(drive, 'tok-a');
    auth.signOut();
    expect(auth.signedIn).toBe(false);
    expect(auth.known).toBe(false);
    expect(drive.calls).toEqual(['POST /revoke']);
  });

  it('Rücksprung-Adresse und Meldungen', () => {
    expect(googleRedirectUri({ origin: 'https://x.de', pathname: '/Liederbuch/' })).toBe('https://x.de/Liederbuch/');
    expect(authMessage('redirect_uri_mismatch')).toContain('Weiterleitung');
  });
});

describe('Google: Speicherschicht', () => {
  it('legt die Datei an, liest, erkennt „unverändert“; veralteter Stand überschreibt nie', async () => {
    const drive = fakeDrive();
    const { provider } = person(drive, 'tok-a');
    expect(await provider.read()).toBe(null);
    const v1 = await provider.write({ format: 'liederbuch-sync', version: 2, songs: [] }, null);
    const r = await provider.read();
    expect(r.version).toBe(v1);
    expect(r.data.format).toBe('liederbuch-sync');
    expect(await provider.read(v1)).toEqual({ unchanged: true });
    const v2 = await provider.write({ format: 'liederbuch-sync', version: 2, songs: [] }, v1);
    expect(await fails(() => provider.write({ songs: [] }, v1)) instanceof ConflictError).toBe(true);
    expect((await provider.read()).version).toBe(v2);
  });

  it('Datei wird auf einem zweiten Gerät wiedergefunden', async () => {
    const drive = fakeDrive();
    await person(drive, 'tok-a').provider.write({ format: 'liederbuch-sync', version: 2, songs: [] }, null);
    const r = await person(drive, 'tok-a').provider.read();
    expect(r.data.format).toBe('liederbuch-sync');
    expect(drive.files.size).toBe(1);
  });

  it('abgelaufenes oder widerrufenes Token: AuthError, Token wird vergessen', async () => {
    const drive = fakeDrive();
    const { provider, auth } = person(drive, 'tok-widerrufen');
    const err = await fails(() => provider.read());
    expect(err instanceof AuthError).toBe(true);
    expect(err.message).toContain('neu anmelden');
    expect(auth.signedIn).toBe(false);
    expect(await fails(() => provider.read()) instanceof AuthError).toBe(true); // ohne Netz-Anfrage
  });

  it('offline: verständliche Meldung, keine Abmeldung', async () => {
    const drive = fakeDrive();
    const { provider, auth } = person(drive, 'tok-a');
    drive.online = false;
    expect((await fails(() => provider.read())).message).toContain('offline');
    expect(auth.signedIn).toBe(true);
  });
});

describe('Google: Rollen', () => {
  async function bookOfAnna(drive) {
    const anna = person(drive, 'tok-a');
    await anna.provider.write({ format: 'liederbuch-sync', version: 2, songs: [] }, null);
    return anna;
  }

  it('Besitzer, Bearbeiter und Leser werden erkannt', async () => {
    const drive = fakeDrive();
    const anna = await bookOfAnna(drive);
    const fileId = anna.provider.fileId;
    expect(await anna.provider.role()).toBe('owner');
    drive.share(fileId, 'ben', 'reader');
    const ben = person(drive, 'tok-b', { book: { shared: true, fileId } });
    expect(await ben.provider.role()).toBe('reader');
    drive.files.get(fileId).perms[0].role = 'writer';
    expect(await ben.provider.role()).toBe('writer');
  });

  it('Leser kann nicht schreiben – Google lehnt ab, die App meldet „nur lesen“', async () => {
    const drive = fakeDrive();
    const anna = await bookOfAnna(drive);
    const fileId = anna.provider.fileId;
    drive.share(fileId, 'ben', 'reader');
    const ben = person(drive, 'tok-b', { book: { shared: true, fileId } });
    const { version } = await ben.provider.read();
    const err = await fails(() => ben.provider.write({ songs: [] }, version));
    expect(err instanceof ReadOnlyError).toBe(true);
    expect(drive.files.get(fileId).version).toBe(version);
    // als „nur lesen“ bekannt: schreibt gar nicht erst
    const ro = person(drive, 'tok-b', { book: { shared: true, fileId, readOnly: true } });
    drive.calls = [];
    expect(await fails(() => ro.provider.write({ songs: [] }, version)) instanceof ReadOnlyError).toBe(true);
    expect(drive.calls).toEqual([]);
  });

  it('Leser kann niemanden einladen', async () => {
    const drive = fakeDrive();
    const anna = await bookOfAnna(drive);
    drive.share(anna.provider.fileId, 'ben', 'reader');
    const ben = person(drive, 'tok-b', { book: { shared: true, fileId: anna.provider.fileId } });
    expect(await fails(() => ben.provider.invite('carla@x.de', 'Hallo')) instanceof ReadOnlyError).toBe(true);
  });

  it('Einladung per E-Mail: standardmäßig nur lesen, Rolle änderbar, entfernen', async () => {
    const drive = fakeDrive();
    const anna = await bookOfAnna(drive);
    await anna.provider.invite('ben@x.de', 'Komm dazu: https://x.de/#drive=…');
    let members = await anna.provider.members();
    const ben = members.find((p) => p.emailAddress === 'ben@x.de');
    expect(ben.role).toBe('reader');
    expect(drive.files.get(anna.provider.fileId).perms[0].message).toContain('#drive=');
    await anna.provider.setMemberRole(ben.id, 'writer');
    members = await anna.provider.members();
    expect(members.find((p) => p.emailAddress === 'ben@x.de').role).toBe('writer');
    await anna.provider.removeMember(ben.id);
    expect((await anna.provider.members()).length).toBe(1);
  });

  it('Abonnent mit Leserechten bekommt alles, schreibt aber nie zurück', async () => {
    const drive = fakeDrive();
    const editor = new SongRepository(createMemoryStore());
    await editor.create('{title: Alpha}');
    const anna = person(drive, 'tok-a');
    const eA = new SyncEngine(editor, anna.provider);
    eA.state = 'idle';
    await eA.sync();
    const fileId = anna.provider.fileId;
    drive.share(fileId, 'ben', 'reader');

    const reader = new SongRepository(createMemoryStore());
    const ben = person(drive, 'tok-b', { book: { shared: true, fileId, readOnly: true } });
    const eB = new SyncEngine(reader, ben.provider, { readOnly: true });
    eB.state = 'idle';
    await eB.sync();
    expect(await titles(reader)).toEqual(['Alpha']);
    expect(eB.state).toBe('idle');

    // Editor ändert -> Abonnent bekommt es; die Datei schreibt nur der Editor
    const song = (await editor.list())[0];
    await editor.update(song.id, { chordpro: '{title: Alpha (neu)}', transpose: 2 });
    await eA.sync();
    const version = drive.files.get(fileId).version;
    await eB.sync();
    expect(await titles(reader)).toEqual(['Alpha (neu)']);
    expect((await reader.list())[0].transpose).toBe(2);
    expect(drive.files.get(fileId).version).toBe(version);
    expect(drive.calls.filter((c) => c.startsWith('PATCH')).length).toBe(1); // nur die Änderung des Editors (Anlegen ist POST)
  });
});

describe('Google: Umzug der vorhandenen Lieder', () => {
  it('Lieder vom Gerät landen beim ersten Verbinden in Drive', async () => {
    const drive = fakeDrive();
    const repo = new SongRepository(createMemoryStore());
    await repo.create('{title: Vom Gerät}');
    await repo.create('{title: Aus der Sicherung}');
    const anna = person(drive, 'tok-a');
    const e = new SyncEngine(repo, anna.provider);
    e.state = 'idle';
    await e.sync();
    const file = JSON.parse([...drive.files.values()][0].content);
    expect(file.songs.map((s) => s.chordpro).sort()).toEqual(['{title: Aus der Sicherung}', '{title: Vom Gerät}']);
  });

  it('liegt schon eine Datei in Drive, wird zusammengeführt – nichts geht verloren', async () => {
    const drive = fakeDrive();
    const old = new SongRepository(createMemoryStore());
    await old.create('{title: Schon in Drive}');
    const e1 = new SyncEngine(old, person(drive, 'tok-a').provider);
    e1.state = 'idle';
    await e1.sync();

    const device = new SongRepository(createMemoryStore());
    await device.create('{title: Nur auf dem Gerät}');
    const e2 = new SyncEngine(device, person(drive, 'tok-a').provider);
    e2.state = 'idle';
    await e2.sync();
    expect(await titles(device)).toEqual(['Nur auf dem Gerät', 'Schon in Drive']);
    const file = JSON.parse([...drive.files.values()][0].content);
    expect(file.songs.length).toBe(2);
    expect(drive.files.size).toBe(1);
  });
});
