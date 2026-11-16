import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine, AuthError } from '../src/sync/sync-engine.js';
import { WebDavProvider, webdavFileUrl, webdavUrlProblem } from '../src/sync/webdav.js';

let clock = 0;
const now = () => new Date(Date.UTC(2026, 1, 1, 0, 0, clock++)).toISOString();
const device = (name) => {
  let n = 0;
  return new SongRepository(createMemoryStore(), { now, newId: () => `${name}${++n}` });
};
const engine = (repo, provider) => {
  const e = new SyncEngine(repo, provider);
  e.state = 'idle'; // nur manueller Abgleich
  return e;
};
const titles = async (repo) => (await repo.list()).map((s) => s.title);

/** Kleiner WebDAV-Server als fetch-Attrappe (ETag, If-Match, If-None-Match, MKCOL). */
function fakeServer({ user = 'jan', password = 'geheim', etags = true, folder = true } = {}) {
  const files = new Map();
  let folderExists = folder;
  let n = 0;
  const srv = {
    requests: [],
    files,
    fetch: async (url, { method, headers = {}, body }) => {
      srv.requests.push({ method, url, headers });
      const auth = 'Basic ' + btoa(`${user}:${password}`);
      if (headers.Authorization !== auth) return new Response('', { status: 401 });
      const f = files.get(url);
      const h = (etag) => (etags && etag ? { ETag: etag } : {});
      if (method === 'GET') {
        if (!f) return new Response('', { status: 404 });
        if (headers['If-None-Match'] && headers['If-None-Match'] === f.etag) return new Response(null, { status: 304 });
        return new Response(f.body, { status: 200, headers: h(f.etag) });
      }
      if (method === 'PUT') {
        if (!folderExists) return new Response('', { status: 409 });
        if (headers['If-None-Match'] === '*' && f) return new Response('', { status: 412 });
        if (headers['If-Match'] && headers['If-Match'] !== f?.etag) return new Response('', { status: 412 });
        const etag = `"${++n}"`;
        files.set(url, { body, etag });
        return new Response(null, { status: f ? 204 : 201, headers: h(etag) });
      }
      if (method === 'MKCOL') {
        folderExists = true;
        return new Response('', { status: 201 });
      }
      return new Response('', { status: 405 });
    },
  };
  return srv;
}

const URL_ = 'https://cloud.example.de/remote.php/dav/files/jan/Liederbuch/';
const FILE = URL_ + 'Liederbuch.json';
const dav = (srv, extra = {}) => new WebDavProvider({ url: URL_, user: 'jan', password: 'geheim', fetch: srv.fetch, ...extra });

describe('WebDAV: Adressen', () => {
  it('hängt an einen Ordner Liederbuch.json an, nimmt .json-Adressen direkt', () => {
    expect(webdavFileUrl('https://x.de/dav/Lieder')).toBe('https://x.de/dav/Lieder/Liederbuch.json');
    expect(webdavFileUrl('https://x.de/dav/Lieder///')).toBe('https://x.de/dav/Lieder/Liederbuch.json');
    expect(webdavFileUrl('https://x.de/dav/band.json')).toBe('https://x.de/dav/band.json');
  });

  it('verlangt https (außer auf diesem Rechner)', () => {
    expect(webdavUrlProblem('https://x.de/dav/')).toBe(null);
    expect(webdavUrlProblem('http://localhost:8080/dav/')).toBe(null);
    expect(webdavUrlProblem('http://x.de/dav/')).toContain('https://');
    expect(webdavUrlProblem('cloud.example.de')).toContain('vollständige Adresse');
  });
});

describe('WebDAV: Abgleich', () => {
  it('zwei Geräte gleichen über die Datei ab, ohne Änderung wird nichts geladen', async () => {
    const srv = fakeServer();
    const A = device('a');
    const B = device('b');
    const sa = engine(A, dav(srv));
    const sb = engine(B, dav(srv));
    const song = await A.create('{title: Clementine}\n[C]la');
    await sa.sync();
    expect(JSON.parse(srv.files.get(FILE).body).songs.length).toBe(1);
    await sb.sync();
    expect(await titles(B)).toEqual(['Clementine']);

    await B.update(song.id, { chordpro: '{title: Clementine}\n[G]li' });
    await sb.sync();
    await sa.sync();
    expect((await A.get(song.id)).chordpro).toContain('[G]li');

    expect([sa.state, sb.state]).toEqual(['idle', 'idle']);
    const before = srv.requests.length;
    await sa.sync();
    const last = srv.requests.slice(before);
    // Verzeichnis mit If-None-Match, dazu die Ordnerliste (dieser Server kann kein PROPFIND)
    expect(last.map((r) => r.method)).toEqual(['GET', 'PROPFIND']);
    expect(last[0].headers['If-None-Match']).toBeTruthy();
  });

  it('erkennt gleichzeitiges Schreiben (412) und führt beide Änderungen zusammen', async () => {
    const srv = fakeServer();
    const A = device('a');
    const B = device('b');
    const sa = engine(A, dav(srv));
    const sb = engine(B, dav(srv));
    await A.create('{title: Alpha}');
    await sa.sync();
    await sb.sync();
    // A schreibt, B kennt noch die alte Version
    await A.create('{title: Beta}');
    await sa.sync();
    await B.create('{title: Gamma}');
    await sb.sync();
    expect(srv.requests.some((r) => r.method === 'PUT' && r.headers['If-Match'])).toBe(true);
    await sa.sync();
    expect([sa.state, sb.state]).toEqual(['idle', 'idle']);
    expect(await titles(A)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(await titles(B)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('legt einen fehlenden Ordner an', async () => {
    const srv = fakeServer({ folder: false });
    const A = device('a');
    await A.create('{title: Alpha}');
    await engine(A, dav(srv)).sync();
    expect(srv.requests.some((r) => r.method === 'MKCOL' && r.url === URL_)).toBe(true);
    expect(srv.files.has(FILE)).toBe(true);
  });

  it('funktioniert auch mit einem Server ohne ETag', async () => {
    const srv = fakeServer({ etags: false });
    const A = device('a');
    const B = device('b');
    const sa = engine(A, dav(srv));
    const sb = engine(B, dav(srv));
    await A.create('{title: Alpha}');
    await sa.sync();
    await B.create('{title: Beta}');
    await sb.sync();
    await sa.sync();
    expect(sa.state).toBe('idle');
    expect(sb.state).toBe('idle');
    expect(await titles(A)).toEqual(['Alpha', 'Beta']);
  });

  it('falsches Passwort: Status "auth", Lieder bleiben', async () => {
    const srv = fakeServer();
    const A = device('a');
    await A.create('{title: Alpha}');
    const p = dav(srv, { password: 'falsch' });
    let err = null;
    try {
      await p.signIn();
    } catch (e) {
      err = e;
    }
    expect(err instanceof AuthError).toBe(true);
    const sa = engine(A, p);
    await sa.sync();
    expect(sa.state).toBe('auth');
    expect(await titles(A)).toEqual(['Alpha']);
  });

  it('nicht erreichbarer Server gibt eine verständliche Meldung', async () => {
    const p = new WebDavProvider({ url: URL_, fetch: async () => { throw new TypeError('Failed to fetch'); } });
    let msg = '';
    try {
      await p.read(null);
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toContain('cloud.example.de');
    expect(msg).toContain('CORS');
  });
});
