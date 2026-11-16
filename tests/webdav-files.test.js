// WebDAV als reine ChordPro-Ablage: Lieder/<Titel>.cho und Setlisten/<Name>.txt, keine Daten-JSON
import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { SetlistRepository, slimSetlist } from '../src/storage/setlists.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine } from '../src/sync/sync-engine.js';
import { WebDavProvider } from '../src/sync/webdav.js';
import { songBaseName, cleanFileName, nameFits, parsePropfind } from '../src/formats/song-files.js';
import { songToFile, fileToSong, setlistToFile, fileToSetlist } from '../src/formats/chordpro-files.js';

let tick = 0;
const now = () => new Date(Date.UTC(2026, 2, 1, 0, 0, tick++)).toISOString();
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
};
/** Ein Gerät: Lieder, Setlisten und eigenes Gedächtnis (localStorage). */
function device(name) {
  let n = 0;
  let s = 0;
  return {
    songs: new SongRepository(createMemoryStore(), { now, newId: () => `${name}${++n}` }),
    sets: new SetlistRepository(createMemoryStore(), { now, newId: () => `${name}-set${++s}` }),
    storage: memory(),
  };
}
const BASE = 'https://nas.test/dav/Liederbuch/';
const GUARD = '/dav/Liederbuch/Liederbuch.json';
const DIR = '/dav/Liederbuch/Lieder/';
const SETS = '/dav/Liederbuch/Setlisten/';

/** Nachgebauter WebDAV-Server mit Ordnern, PROPFIND, ETag, If-Match, DELETE. */
function davServer() {
  const files = new Map(); // Pfad -> {body, etag, modified}
  const folders = new Set(['/', '/dav/']);
  let n = 0;
  let clock = Date.UTC(2026, 2, 1, 12);
  const parent = (p) => p.replace(/[^/]+\/?$/, '');
  const srv = {
    files,
    folders,
    log: [],
    /** Datei „von Hand“ auf den Server legen (z. B. im Editor über die Netzwerkfreigabe). */
    put(path, body) {
      for (let p = parent(path); p !== '/' && !folders.has(p); p = parent(p)) folders.add(p);
      files.set(path, { body, etag: `"${++n}"`, modified: (clock += 1000) });
    },
    fetch: async (url, { method, headers = {}, body }) => {
      const path = decodeURIComponent(new URL(url).pathname);
      srv.log.push(`${method} ${path}`);
      const f = files.get(path);
      switch (method) {
        case 'GET':
          if (!f) return new Response(null, { status: 404 });
          return new Response(f.body, { status: 200, headers: { ETag: f.etag } });
        case 'PUT': {
          if (!folders.has(parent(path))) return new Response(null, { status: 409 });
          if (headers['If-None-Match'] === '*' && f) return new Response(null, { status: 412 });
          if (headers['If-Match'] && headers['If-Match'] !== f?.etag) return new Response(null, { status: 412 });
          const etag = `"${++n}"`;
          files.set(path, { body, etag, modified: (clock += 1000) });
          return new Response(null, { status: f ? 204 : 201, headers: { ETag: etag } });
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
          if (headers['If-Match'] && headers['If-Match'] !== f.etag) return new Response(null, { status: 412 });
          files.delete(path);
          return new Response(null, { status: 204 });
        case 'PROPFIND': {
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

const sync = (dev, srv) => {
  const e = new SyncEngine(dev.songs, new WebDavProvider({ url: BASE, user: 'jan', password: 'x', fetch: srv.fetch, now, storage: dev.storage }), {
    extra: [{ key: 'setlists', repo: dev.sets, slim: slimSetlist }],
  });
  e.state = 'idle';
  return e;
};
const titles = async (dev) => (await dev.songs.list()).map((s) => s.title);
const filesIn = (srv, dir) => [...srv.files.keys()].filter((p) => p.startsWith(dir)).map((p) => p.slice(dir.length)).sort();
const body = (srv, path) => srv.files.get(path)?.body;

describe('ChordPro-Dateien: Lied und Setliste', () => {
  it('Dateinamen „Titel - Interpret“, sicher für Windows', () => {
    expect(songBaseName('{title: Clementine}\n{artist: Percy Montrose}')).toBe('Clementine - Percy Montrose');
    expect(songBaseName('{t: AC/DC: Highway?}')).toBe('AC DC Highway');
    expect(songBaseName('nur Text')).toBe('Ohne Titel');
    expect(cleanFileName('con')).toBe('con_');
    expect([nameFits('Clementine (2).cho', 'Clementine'), nameFits('Clementine.cho', 'Oh Susanna')]).toEqual([true, false]);
  });

  it('Transposition, Schreibweise, Notiz als Direktiven hinter dem Liedkopf – und zurück', () => {
    const r = { chordpro: '{title: Clementine}\n{key: C}\n\n[C]Oh my darling', transpose: 2, accidentals: 'flat', note: 'Capo 2\nalle singen' };
    const file = songToFile(r);
    expect(file).toBe('{title: Clementine}\r\n{key: C}\r\n{transpose: 2}\r\n{x_accidentals: flat}\r\n{x_notiz: Capo 2}\r\n{x_notiz: alle singen}\r\n\r\n[C]Oh my darling');
    expect(fileToSong(file)).toEqual({ chordpro: '{title: Clementine}\n{key: C}\n\n[C]Oh my darling', transpose: 2, accidentals: 'flat', note: 'Capo 2\nalle singen' });
    // ohne Einstellungen: Datei = Text aus „Bearbeiten“ (nur CR LF)
    expect(songToFile({ chordpro: '{title: A}\n[C]la', transpose: 0, accidentals: 'auto', note: '' })).toBe('{title: A}\r\n[C]la');
  });

  it('Setliste als lesbare Textdatei – und zurück', () => {
    const files = { s1: 'Kein schöner Land.cho', s2: 'Clementine - Percy Montrose.cho' };
    const text = setlistToFile({ name: 'Lagerfeuer', items: [{ songId: 's1', transpose: null, note: '' }, { songId: 's2', transpose: 2, note: 'Capo 2' }] }, (id) => files[id]);
    expect(text).toBe('# Setliste „Lagerfeuer“ – eine Zeile pro Lied (Datei im Ordner Lieder)\r\nKein schöner Land.cho\r\nClementine - Percy Montrose.cho\r\n  Transposition: 2\r\n  Notiz: Capo 2\r\n');
    const back = fileToSetlist(text, 'Lagerfeuer.txt', (f) => Object.keys(files).find((k) => files[k] === f));
    expect(back).toEqual({ name: 'Lagerfeuer', items: [{ songId: 's1', transpose: null, note: '' }, { songId: 's2', transpose: 2, note: 'Capo 2' }] });
  });

  it('liest eine PROPFIND-Antwort (nur Dateien direkt im Ordner)', () => {
    const xml = '<d:multistatus xmlns:d="DAV:"><d:response><d:href>/dav/L/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>' +
      '<d:response><d:href>/dav/L/Kein%20sch%C3%B6ner%20Land.cho</d:href><d:propstat><d:prop><d:getetag>"7"</d:getetag><d:resourcetype/></d:prop></d:propstat></d:response></d:multistatus>';
    expect([...parsePropfind(xml, 'https://nas.test/dav/L/').keys()]).toEqual(['Kein schöner Land.cho']);
  });
});

describe('WebDAV: nur ChordPro-Dateien, keine Daten-JSON', () => {
  it('jedes Lied als .cho (wie „Bearbeiten“), Einstellungen als Direktiven; zweites Gerät bekommt alles', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const c = await A.songs.create('{title: Clementine}\n{artist: Percy Montrose}\n[C]Oh my darling');
    await A.songs.update(c.id, { transpose: 2, note: 'Capo 2' });
    await A.songs.create('{title: Kein schöner Land}\n[D]Kein schöner Land');
    await sync(A, srv).sync();
    expect(filesIn(srv, DIR)).toEqual(['Clementine - Percy Montrose.cho', 'Kein schöner Land.cho']);
    expect(body(srv, DIR + 'Kein schöner Land.cho')).toBe('{title: Kein schöner Land}\r\n[D]Kein schöner Land');
    expect(body(srv, DIR + 'Clementine - Percy Montrose.cho')).toBe('{title: Clementine}\r\n{artist: Percy Montrose}\r\n{transpose: 2}\r\n{x_notiz: Capo 2}\r\n[C]Oh my darling');
    const guard = JSON.parse(body(srv, GUARD));
    expect([guard.version, 'songs' in guard]).toEqual([4, false]); // nur Hinweis, keine Daten

    await sync(B, srv).sync();
    expect(await titles(B)).toEqual(['Clementine', 'Kein schöner Land']);
    const bc = (await B.songs.list()).find((s) => s.title === 'Clementine');
    expect([bc.chordpro, bc.transpose, bc.note]).toEqual(['{title: Clementine}\n{artist: Percy Montrose}\n[C]Oh my darling', 2, 'Capo 2']);
  });

  it('ohne Änderungen: nur die zwei Ordnerlisten, nichts wird geladen oder geschrieben', async () => {
    const srv = davServer();
    const A = device('a');
    await A.songs.create('{title: Alpha}');
    const sa = sync(A, srv);
    await sa.sync();
    await sa.sync();
    srv.log.length = 0;
    await sa.sync();
    expect(srv.log).toEqual(['PROPFIND ' + DIR, 'PROPFIND ' + SETS]);
  });

  it('Titel geändert: Datei umbenannt, anderes Gerät behält dasselbe Lied; Löschen: in den Papierkorb', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const s = await A.songs.create('{title: Alt}\n[C]la');
    const t = await A.songs.create('{title: Weg}\n[G]li');
    await sync(A, srv).sync();
    await sync(B, srv).sync();
    const bOld = (await B.songs.list()).find((x) => x.title === 'Alt');
    await B.songs.update(bOld.id, { transpose: 3 });
    await sync(B, srv).sync();
    await sync(A, srv).sync();
    await A.songs.update(s.id, { chordpro: '{title: Neu}\n[C]la' });
    await A.songs.remove(t.id);
    await sync(A, srv).sync();
    expect(filesIn(srv, DIR)).toEqual(['Neu.cho']);
    await sync(B, srv).sync();
    expect(await titles(B)).toEqual(['Neu']);
    const bNew = (await B.songs.list())[0];
    expect([bNew.id, bNew.transpose]).toEqual([bOld.id, 3]); // umbenannt erkannt, nicht neu
    expect((await B.songs.trash()).map((x) => x.title)).toEqual(['Weg']);
  });

  it('gleicher Titel zweimal: „Titel (2).cho“', async () => {
    const srv = davServer();
    const A = device('a');
    await A.songs.create('{title: Oh Susanna}\n[C]eins');
    await A.songs.create('{title: Oh Susanna}\n[C]zwei');
    await sync(A, srv).sync();
    expect(filesIn(srv, DIR)).toEqual(['Oh Susanna (2).cho', 'Oh Susanna.cho']);
  });

  it('auf dem Server bearbeitet, angelegt, gelöscht: kommt an, danach Ruhe', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const s = await A.songs.create('{title: Clementine}\n[C]alt');
    await A.songs.create('{title: Beta}\n[G]b');
    await sync(A, srv).sync();
    await sync(B, srv).sync();
    srv.put(DIR + 'Clementine.cho', '{title: Clementine}\r\n{transpose: -2}\r\n[G]neu von Hand');
    srv.put(DIR + 'Wild Rover.cho', "[G]I've been a wild rover");
    srv.files.delete(DIR + 'Beta.cho');
    await sync(A, srv).sync();
    await sync(B, srv).sync();
    for (const dev of [A, B]) {
      expect(await titles(dev)).toEqual(['Clementine', 'Wild Rover']);
      expect((await dev.songs.trash()).map((x) => x.chordpro)).toEqual(['{title: Beta}\n[G]b']);
    }
    const a = await A.songs.get(s.id);
    expect([a.chordpro, a.transpose]).toEqual(['{title: Clementine}\n[G]neu von Hand', -2]);
    // Datei ohne {title:}: Dateiname als Titel, die Datei selbst bleibt unangetastet
    expect(body(srv, DIR + 'Wild Rover.cho')).toBe("[G]I've been a wild rover");
    srv.log.length = 0;
    await sync(A, srv).sync();
    await sync(B, srv).sync();
    expect(srv.log.filter((l) => /^(PUT|DELETE)/.test(l))).toEqual([]);
  });

  it('Bearbeiten gewinnt gegen Löschen: Datei wieder hochgeladen', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const s = await A.songs.create('{title: Alpha}\n[C]la');
    await sync(A, srv).sync();
    await sync(B, srv).sync();
    const b = (await B.songs.list())[0];
    await B.songs.remove(b.id);
    await sync(B, srv).sync(); // B löscht die Datei
    await A.songs.update(s.id, { chordpro: '{title: Alpha}\n[C]la la' }); // A ändert (noch ohne Abgleich)
    await sync(A, srv).sync();
    expect(filesIn(srv, DIR)).toEqual(['Alpha.cho']);
    expect(await titles(A)).toEqual(['Alpha']);
  });

  it('Setlisten als Textdateien; auf jedem Gerät mit den eigenen Liedern verknüpft', async () => {
    const srv = davServer();
    const A = device('a');
    const B = device('b');
    const k = await A.songs.create('{title: Kein schöner Land}\n[D]x');
    const c = await A.songs.create('{title: Clementine}\n[C]y');
    const set = await A.sets.create('Lagerfeuer Samstag', [{ songId: k.id }, { songId: c.id, transpose: 2, note: 'Capo 2' }]);
    await sync(A, srv).sync();
    expect(filesIn(srv, SETS)).toEqual(['Lagerfeuer Samstag.txt']);
    expect(body(srv, SETS + 'Lagerfeuer Samstag.txt')).toContain('Kein schöner Land.cho\r\nClementine.cho\r\n  Transposition: 2\r\n  Notiz: Capo 2');
    await sync(B, srv).sync();
    const bs = (await B.sets.list())[0];
    const bSongs = await B.songs.list();
    expect(bs.name).toBe('Lagerfeuer Samstag');
    expect(bs.items.map((i) => bSongs.find((x) => x.id === i.songId)?.title)).toEqual(['Kein schöner Land', 'Clementine']);
    expect([bs.items[1].transpose, bs.items[1].note]).toEqual([2, 'Capo 2']);
    // Reihenfolge von Hand in der Datei geändert
    srv.put(SETS + 'Lagerfeuer Samstag.txt', 'Clementine.cho\r\nKein schöner Land.cho\r\n');
    await sync(A, srv).sync();
    expect((await A.sets.get(set.id)).items.map((i) => i.songId)).toEqual([c.id, k.id]);
  });

  it('Gedächtnis eines Geräts verloren: keine doppelten Lieder', async () => {
    const srv = davServer();
    const A = device('a');
    await A.songs.create('{title: Alpha}\n[C]a');
    await A.songs.create('{title: Beta}\n[C]b');
    await sync(A, srv).sync();
    A.storage.clear();
    await sync(A, srv).sync();
    expect(await titles(A)).toEqual(['Alpha', 'Beta']);
    expect(filesIn(srv, DIR)).toEqual(['Alpha.cho', 'Beta.cho']);
  });

  it('Ordner „Lieder“ fehlt plötzlich: Fehler statt alles zu löschen', async () => {
    const srv = davServer();
    const A = device('a');
    await A.songs.create('{title: Alpha}');
    const sa = sync(A, srv);
    await sa.sync();
    for (const p of [...srv.files.keys()]) if (p.startsWith(DIR)) srv.files.delete(p);
    srv.folders.delete(DIR);
    await sa.sync();
    expect(sa.state).toBe('error');
    expect(await titles(A)).toEqual(['Alpha']);
  });

  it('ältestes Format (alles in Liederbuch.json) wird umgestellt', async () => {
    const srv = davServer();
    srv.folders.add('/dav/Liederbuch/');
    const t = '2026-01-01T00:00:00.000Z';
    srv.put(GUARD, JSON.stringify({
      format: 'liederbuch-sync', version: 2,
      songs: [{ id: 'x1', chordpro: '{title: Alt}\n[C]la', transpose: 2, accidentals: 'auto', createdAt: t, updatedAt: t, deletedAt: null }],
      setlists: [{ id: 'l1', name: 'Probe', items: [{ songId: 'x1', transpose: null, note: '' }], createdAt: t, updatedAt: t, deletedAt: null }],
    }));
    const A = device('a');
    const sa = sync(A, srv);
    await sa.sync();
    expect(sa.state).toBe('idle');
    expect((await A.songs.get('x1')).transpose).toBe(2);
    expect(body(srv, DIR + 'Alt.cho')).toBe('{title: Alt}\r\n{transpose: 2}\r\n[C]la');
    expect(body(srv, SETS + 'Probe.txt')).toContain('Alt.cho');
    expect('songs' in JSON.parse(body(srv, GUARD))).toBe(false);
  });

  it('Format von Liederbuch 1.13 (Verzeichnis + Liedtexte) wird umgestellt, Lieder bleiben dieselben', async () => {
    const srv = davServer();
    const t = '2026-01-01T00:00:00.000Z';
    srv.put(DIR + 'Alt.cho', '{title: Alt}\r\n[C]la');
    srv.put(GUARD, JSON.stringify({
      format: 'liederbuch-sync', version: 3, layout: 'files',
      songs: [{ id: 'x1', transpose: 1, accidentals: 'sharp', note: 'n', createdAt: t, updatedAt: t, deletedAt: null, file: 'Alt.cho', hash: 'h', etag: 'e' }],
      setlists: [],
    }));
    const A = device('a');
    await A.songs.applyRemote([{ id: 'x1', chordpro: '{title: Alt}\n[C]la', transpose: 1, accidentals: 'sharp', note: 'n', createdAt: t, updatedAt: t, deletedAt: null }]);
    const sa = sync(A, srv);
    await sa.sync();
    expect(sa.state).toBe('idle');
    expect((await A.songs.list()).map((s) => s.id)).toEqual(['x1']);
    expect(body(srv, DIR + 'Alt.cho')).toBe('{title: Alt}\r\n{transpose: 1}\r\n{x_accidentals: sharp}\r\n{x_notiz: n}\r\n[C]la');
    expect(JSON.parse(body(srv, GUARD)).version).toBe(4);
  });
});
