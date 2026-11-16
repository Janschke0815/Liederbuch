import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine, AuthError } from '../src/sync/sync-engine.js';
import { WebDavProvider, webdavFileUrl, webdavUrlProblem } from '../src/sync/webdav.js';

const URL_ = 'https://cloud.example.de/remote.php/dav/files/jan/Liederbuch/';
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

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

describe('WebDAV: Anmeldung und Erreichbarkeit', () => {
  it('falsches Passwort: Status "auth", Lieder bleiben', async () => {
    const fetch = async () => new Response('', { status: 401 });
    const A = new SongRepository(createMemoryStore());
    await A.create('{title: Alpha}');
    const p = new WebDavProvider({ url: URL_, user: 'jan', password: 'falsch', fetch, storage: memory() });
    let err = null;
    try {
      await p.signIn();
    } catch (e) {
      err = e;
    }
    expect(err instanceof AuthError).toBe(true);
    const sa = new SyncEngine(A, p);
    sa.state = 'idle';
    await sa.sync();
    expect(sa.state).toBe('auth');
    expect((await A.list()).map((s) => s.title)).toEqual(['Alpha']);
  });

  it('nicht erreichbarer Server gibt eine verständliche Meldung', async () => {
    const p = new WebDavProvider({ url: URL_, fetch: async () => { throw new TypeError('Failed to fetch'); }, storage: memory() });
    let msg = '';
    try {
      await p.read(null);
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toContain('cloud.example.de');
    expect(msg).toContain('CORS');
  });

  it('Server ohne Ordnerliste (PROPFIND): klare Meldung', async () => {
    const p = new WebDavProvider({ url: URL_, fetch: async () => new Response('', { status: 405 }), storage: memory() });
    let msg = '';
    try {
      await p.read(null);
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toContain('PROPFIND');
  });
});
