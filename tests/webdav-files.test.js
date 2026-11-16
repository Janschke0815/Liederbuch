// WebDAV mit einer Datei pro Lied (Fahrplan 12): Lieder/<Titel>.cho + Verzeichnis Liederbuch.json
import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine } from '../src/sync/sync-engine.js';
import { WebDavProvider } from '../src/sync/webdav.js';
import { songBaseName, cleanFileName, nameFits, parsePropfind } from '../src/sync/song-files.js';

let tick = 0;
const now = () => new Date(Date.UTC(2026, 2, 1, 0, 0, tick++)).toISOString();
const device = (name) => {
  let n = 0;
  return new SongRepository(createMemoryStore(), { now, newId: () => `${name}${++n}` });
};
const BASE = 'https://nas.test/dav/Liederbuch/';
const INDEX = '/dav/Liederbuch/Liederbuch.json';
const DIR = '/dav/Liederbuch/Lieder/';
const later = () => Date.now() + 10 * 60_000; // „10 Minuten später“ für von Hand angelegte Dateien

/** Nachgebauter WebDAV-Server mit Ordnern, PROPFIND, ETag, If-Match, DELETE. */
function davServer({ propfind = true } = {}) {
  const files = new Map(); // Pfad -> {body, etag, modified}
  const folders = new Set(['/', '/dav/']);
  let n = 0;
  const parent = (p) => p.replace(/[^/]+\/?$/, '');
  const srv = {
    files,
    folders,
    log: [],
    put(path, body) {
      files.set(path, { body, etag: `"${++n}"`, modified: Date.now() - 3600_000 });
    },
    fetch: async (url, { method, headers = {}, body }) => {
      const path = decodeURIComponent(new URL(url).pathname);
      srv.log.push(`${method} ${path}`);
      const f = files.get(path);
      const etagHeader = (e) => ({ ETag: e });
      switch (method) {
        case 'GET':
        case 'HEAD':
          if (!f) return new Response(null, { status: 404 });
          if (headers['If-None-Match'] && headers['If-None-Match'] === f.etag) return new Response(null, { status: 304, headers: etagHeader(f.etag) });
          return new Response(method === 'GET' ? f.body : null, { status: 200, headers: etagHeader(f.etag) });
        case 'PUT': {
          if (!folders.has(parent(path))) return new Response(null, { status: 409 });
          if (headers['If-None-Match'] === '*' && f) return new Response(null, { status: 412 });
          if (headers['If-Match'] && headers['If-Match'] !== f?.etag) return new Response(null, { status: 412 });
          const etag = `"${++n}"`;
          files.set(path, { body, etag, modified: Date.now() });
          return new Response(null, { status: f ? 204 : 201, headers: etagHeader(etag) });
        }
        case 'MKCOL': {
          const p = path.endsWith('/') ? path : path + '/';
          if (folders.has(p)) return new Response(null, { status: 405 });
          if (!folders.has(parent(p))) return new Response(null, { status: 409 });
          folders.add(p);
          return new Response(null, { status: 201 });
        }
        case 'DELETE':
          if (!f) return new Response(null, { status: 404 });
          files.delete(path);
          return new Response(null, { status: 204 });
        case 'PROPFIND': {
          if (!propfind) return new Response(null, { status: 405 });
          const p = path.endsWith('/') ? path : path + '/';
          if (!folders.has(p)) return new Response(null, { status: 404 });
          const rows = [`<d:response><d:href>${encodeURI(p)}</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>`];
          for (const [fp, file] of files) {
            if (parent(fp) !== p) continue;
            rows.push(`<d:response><d:href>${encodeURI(fp)}</d:href><d:propstat><d:prop><d:getetag>${file.etag}</d:getetag><d:getlastmodified>${new Date(file.modified).toUTCString()}</d:getlastmodified><d:resourcetype/></d:prop></d:propstat></d:response>`);
          }
          return new Response(`<?xml version="1.0"?><d:multistatus xmlns:d="DAV:">${rows.join('')}</d:multistatus>`, { status: 207 });
        }
        default:
          return new Response(null, { status: 405 });
      }
    },
  };
  return srv;
}

const engineFor = (repo, srv, opts = {}) => {
  const e = new SyncEngine(repo, new WebDavProvider({ url: BASE, user: 'jan', password: 'x', fetch: srv.fetch, now, ...opts }));
  e.state = 'idle';
  return e;
};
const titles = async (repo) => (await repo.list()).map((s) => s.title);
const songFiles = (srv) => [...srv.files.keys()].filter((p) => p.startsWith(DIR)).map((p) => p.slice(DIR.length)).sort();
const index = (srv) => JSON.parse(srv.files.get(INDEX).body);

describe('WebDAV: Dateinamen', () => {
  it('Titel - Interpret, sicher für Windows', () => {
    expect(songBaseName('{title: Clementine}\n{artist: Percy Montrose}')).toBe('Clementine - Percy Montrose');
    expect(songBaseName('{t: AC/DC: Highway?}')).toBe('AC DC Highway');
    expect(songBaseName('nur Text')).toBe('Ohne Titel');
    expect(cleanFileName('con')).toBe('con_');
    expect(cleanFileName('Ende. ')).toBe('Ende');
    expect([nameFits('Clementine (2).cho', 'Clementine'), nameFits('Clementine.cho', 'Oh Susanna')]).toEqual([true, false]);
  });

  it('liest eine PROPFIND-Antwort (nur Dateien direkt im Ordner)', () => {
    const xml = '<d:multistatus xmlns:d="DAV:"><d:response><d:href>/dav/L/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>' +
      '<d:response><d:href>/dav/L/Kein%20sch%C3%B6ner%20Land.cho</d:href><d:propstat><d:prop><d:getetag>"7"</d:getetag><d:resourcetype/></d:prop></d:propstat></d:response></d:multistatus>';
    const m = parsePropfind(xml, 'https://nas.test/dav/L/');
    expect([...m.keys()]).toEqual(['Kein schöner Land.cho']);
    expect(m.get('Kein schöner Land.cho').etag).toBe('"7"');
  });
});

describe('WebDAV: eine Datei pro Lied', () => {
  it('jedes Lied als .cho-Datei (CR LF), Verzeichnis ohne Liedtext; zweites Gerät bekommt alles', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    await A.create('{title: Clementine}\n{artist: Percy Montrose}\n[C]Oh my darling');
    await A.create('{title: Kein schöner Land}\n[D]Kein schöner Land');
    const sa = engineFor(A, srv);
    await sa.sync();
    expect(sa.state).toBe('idle');
    expect(songFiles(srv)).toEqual(['Clementine - Percy Montrose.cho', 'Kein schöner Land.cho']);
    expect(srv.files.get(DIR + 'Clementine - Percy Montrose.cho').body).toBe('{title: Clementine}\r\n{artist: Percy Montrose}\r\n[C]Oh my darling');
    const idx = index(srv);
    expect([idx.version, idx.layout, idx.songs.length]).toEqual([3, 'files', 2]);
    expect(idx.songs.some((s) => 'chordpro' in s)).toBe(false);
    expect(srv.files.get(INDEX).body.includes('\r\n')).toBe(true);

    const sb = engineFor(B, srv);
    await sb.sync();
    expect(await titles(B)).toEqual(['Clementine', 'Kein schöner Land']);
    expect((await B.list()).find((s) => s.title === 'Clementine').chordpro).toBe('{title: Clementine}\n{artist: Percy Montrose}\n[C]Oh my darling');
  });

  it('ohne Änderungen: nur Verzeichnis (304) und Ordnerliste, nichts wird geschrieben', async () => {
    const srv = davServer();
    const A = device('a');
    await A.create('{title: Alpha}');
    const sa = engineFor(A, srv);
    await sa.sync();
    await sa.sync();
    srv.log.length = 0;
    await sa.sync();
    expect(srv.log).toEqual(['GET ' + INDEX, 'PROPFIND ' + DIR]);
  });

  it('Titel geändert: neue Datei, alte wird gelöscht; Lied gelöscht: Datei weg, im Papierkorb', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const s = await A.create('{title: Alt}\n[C]la');
    const t = await A.create('{title: Weg}\n[G]li');
    const sa = engineFor(A, srv);
    const sb = engineFor(B, srv);
    await sa.sync();
    await sb.sync();
    await A.update(s.id, { chordpro: '{title: Neu}\n[C]la' });
    await A.remove(t.id);
    await sa.sync();
    expect(songFiles(srv)).toEqual(['Neu.cho']);
    expect(index(srv).songs.find((e) => e.id === t.id).deletedAt).toBeTruthy();
    await sb.sync();
    expect(await titles(B)).toEqual(['Neu']);
    expect((await B.trash()).map((x) => x.title)).toEqual(['Weg']);
  });

  it('gleicher Titel zweimal: "Titel (2).cho"', async () => {
    const srv = davServer();
    const A = device('a');
    await A.create('{title: Oh Susanna}\n[C]eins');
    await A.create('{title: Oh Susanna}\n[C]zwei');
    await engineFor(A, srv).sync();
    expect(songFiles(srv)).toEqual(['Oh Susanna (2).cho', 'Oh Susanna.cho']);
  });

  it('Datei direkt auf dem Server bearbeitet: kommt auf allen Geräten an, danach Ruhe', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const s = await A.create('{title: Clementine}\n[C]alt');
    const sa = engineFor(A, srv);
    const sb = engineFor(B, srv);
    await sa.sync();
    await sb.sync();
    srv.put(DIR + 'Clementine.cho', '{title: Clementine}\r\n[G]neu von Hand');
    await sb.sync();
    expect((await B.get(s.id)).chordpro).toBe('{title: Clementine}\n[G]neu von Hand');
    await sa.sync();
    expect((await A.get(s.id)).chordpro).toBe('{title: Clementine}\n[G]neu von Hand');
    // keine Endlosschleife: weitere Abgleiche schreiben nichts mehr
    srv.log.length = 0;
    await sa.sync();
    await sb.sync();
    expect(srv.log.filter((l) => l.startsWith('PUT')).length).toBe(0);
  });

  it('Datei von Hand angelegt: wird ein Lied (Titel aus dem Dateinamen), auf allen Geräten dasselbe', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    await A.create('{title: Alpha}');
    const sa = engineFor(A, srv, { clock: later });
    const sb = engineFor(B, srv, { clock: later });
    await sa.sync();
    srv.put(DIR + 'Wild Rover.cho', '[G]I\'ve been a wild rover');
    await sa.sync();
    await sb.sync();
    expect(await titles(A)).toEqual(['Alpha', 'Wild Rover']);
    expect(await titles(B)).toEqual(['Alpha', 'Wild Rover']);
    expect((await B.list()).filter((x) => x.title === 'Wild Rover').length).toBe(1);
    expect(index(srv).songs.length).toBe(2);
  });

  it('Datei von Hand gelöscht: Lied landet im Papierkorb', async () => {
    const srv = davServer();
    const A = device('a');
    await A.create('{title: Alpha}');
    await A.create('{title: Beta}');
    const sa = engineFor(A, srv);
    await sa.sync();
    srv.files.delete(DIR + 'Beta.cho');
    await sa.sync();
    expect(await titles(A)).toEqual(['Alpha']);
    expect((await A.trash()).map((x) => x.title)).toEqual(['Beta']);
  });

  it('Datei gelöscht, Gerät kannte nur seinen eigenen Text: Text bleibt im Papierkorb', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    await A.create('{title: Beta}\n[C]la');
    await engineFor(A, srv).sync();
    await engineFor(B, srv).sync();
    srv.files.delete(DIR + 'Beta.cho');
    await engineFor(B, srv).sync(); // neuer Abgleich ohne Zwischenspeicher des Textes
    expect(await titles(B)).toEqual([]);
    expect((await B.trash()).map((x) => x.chordpro)).toEqual(['{title: Beta}\n[C]la']);
  });

  it('Ordner „Lieder“ fehlt plötzlich: Fehler statt alles zu löschen', async () => {
    const srv = davServer();
    const A = device('a');
    await A.create('{title: Alpha}');
    const sa = engineFor(A, srv);
    await sa.sync();
    for (const p of [...srv.files.keys()]) if (p.startsWith(DIR)) srv.files.delete(p);
    srv.folders.delete(DIR);
    await sa.sync();
    expect(sa.state).toBe('error');
    expect(await titles(A)).toEqual(['Alpha']);
  });

  it('altes Format (alles in einer Datei) wird gelesen und umgestellt', async () => {
    const srv = davServer();
    srv.folders.add('/dav/Liederbuch/');
    const t = '2026-01-01T00:00:00.000Z';
    srv.put(INDEX, JSON.stringify({
      format: 'liederbuch-sync', version: 2, songs: [
        { id: 'x1', chordpro: '{title: Alt}\n[C]la', transpose: 2, accidentals: 'auto', createdAt: t, updatedAt: t, deletedAt: null },
      ], setlists: [],
    }));
    const A = device('a');
    const sa = engineFor(A, srv);
    await sa.sync();
    expect(sa.state).toBe('idle');
    expect(await titles(A)).toEqual(['Alt']);
    expect((await A.get('x1')).transpose).toBe(2);
    const idx = index(srv);
    expect([idx.version, idx.layout, idx.songs[0].file]).toEqual([3, 'files', 'Alt.cho']);
    expect(songFiles(srv)).toEqual(['Alt.cho']);
  });

  it('Server ohne Ordnerliste (kein PROPFIND): Abgleich klappt trotzdem', async () => {
    const srv = davServer({ propfind: false });
    const A = device('a');
    const B = device('b');
    await A.create('{title: Alpha}');
    await engineFor(A, srv).sync();
    const sb = engineFor(B, srv);
    await sb.sync();
    expect(sb.state).toBe('idle');
    expect(await titles(B)).toEqual(['Alpha']);
  });
});
