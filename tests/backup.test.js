import { describe, it, expect } from './runner.js';
import { createZip, readZip, isZip, crc32 } from '../src/core/zip.js';
import { backupFiles, parseBackupZip, BACKUP_JSON } from '../src/core/backup.js';
import { SongRepository } from '../src/storage/repository.js';
import { SetlistRepository, slimSetlist } from '../src/storage/setlists.js';
import { createMemoryStore } from '../src/storage/stores.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

/** ZIP mit „deflate“ bauen, wie Windows/macOS es tun (zum Testen des Lesens). */
async function deflateZip(name, text) {
  const raw = enc.encode(text);
  const comp = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const n = enc.encode(name);
  const local = new DataView(new ArrayBuffer(30));
  local.setUint32(0, 0x04034b50, true);
  local.setUint16(4, 20, true);
  local.setUint16(6, 0x0800, true);
  local.setUint16(8, 8, true);
  local.setUint32(14, crc32(raw), true);
  local.setUint32(18, comp.length, true);
  local.setUint32(22, raw.length, true);
  local.setUint16(26, n.length, true);
  const central = new DataView(new ArrayBuffer(46));
  central.setUint32(0, 0x02014b50, true);
  central.setUint16(8, 0x0800, true);
  central.setUint16(10, 8, true);
  central.setUint32(16, crc32(raw), true);
  central.setUint32(20, comp.length, true);
  central.setUint32(24, raw.length, true);
  central.setUint16(28, n.length, true);
  const cdOffset = 30 + n.length + comp.length;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, 1, true);
  end.setUint16(10, 1, true);
  end.setUint32(12, 46 + n.length, true);
  end.setUint32(16, cdOffset, true);
  const parts = [new Uint8Array(local.buffer), n, comp, new Uint8Array(central.buffer), n, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

let tick = 0;
const now = () => new Date(Date.UTC(2026, 3, 1, 0, 0, tick++)).toISOString();
function device(name) {
  let n = 0;
  let s = 0;
  return {
    songs: new SongRepository(createMemoryStore(), { now, newId: () => `${name}${++n}` }),
    sets: new SetlistRepository(createMemoryStore(), { now, newId: () => `${name}-set${++s}` }),
  };
}
async function exportOf(dev) {
  const data = await dev.songs.exportData();
  data.setlists = (await dev.sets.allRecords()).filter((s) => !s.deletedAt).map(slimSetlist);
  return data;
}

describe('ZIP', () => {
  it('Prüfsumme (CRC-32) stimmt', () => {
    expect(crc32(enc.encode('123456789')).toString(16)).toBe('cbf43926');
  });

  it('schreiben und lesen, Umlaute im Namen, Ordner', async () => {
    const zip = createZip([
      { name: 'Lieder/Kein schöner Land.cho', data: '{title: Kein schöner Land}\r\n[D]Kein' },
      { name: 'LIESMICH.txt', data: 'Hallo' },
    ]);
    expect(isZip(zip)).toBe(true);
    const files = await readZip(zip);
    expect(files.map((f) => f.name)).toEqual(['Lieder/Kein schöner Land.cho', 'LIESMICH.txt']);
    expect(dec.decode(files[0].data)).toBe('{title: Kein schöner Land}\r\n[D]Kein');
  });

  it('liest auch gepackte ZIP-Dateien (deflate, wie von Windows)', async () => {
    const text = '{title: Clementine}\r\n' + '[C]Oh my darling\r\n'.repeat(50);
    const files = await readZip(await deflateZip('Lieder/Clementine.cho', text));
    expect(dec.decode(files[0].data)).toBe(text);
  });

  it('kaputte Datei: verständliche Meldung', async () => {
    let msg = '';
    try {
      await readZip(enc.encode('kein zip'));
    } catch (e) {
      msg = e.message;
    }
    expect(msg).toContain('ZIP');
  });
});

describe('Sicherung als ZIP', () => {
  it('enthält lesbare .cho-Dateien, Setlisten, vollständige JSON und LIESMICH', async () => {
    const A = device('a');
    const c = await A.songs.create('{title: Clementine}\n{artist: Percy Montrose}\n[C]Oh my darling');
    await A.songs.update(c.id, { transpose: 2, note: 'Capo 2' });
    const k = await A.songs.create('{title: Kein schöner Land}\n[D]Kein');
    const w = await A.songs.create('{title: Weg}\n[G]x');
    await A.songs.remove(w.id);
    await A.sets.create('Lagerfeuer', [{ songId: k.id }, { songId: c.id, transpose: 1, note: 'leise' }]);
    const files = backupFiles(await exportOf(A));
    expect(files.map((f) => f.name)).toEqual([
      'Lieder/Clementine - Percy Montrose.cho', 'Lieder/Kein schöner Land.cho', 'Setlisten/Lagerfeuer.txt', BACKUP_JSON, 'LIESMICH.txt',
    ]);
    expect(files[0].data).toBe('{title: Clementine}\r\n{artist: Percy Montrose}\r\n{transpose: 2}\r\n{x_notiz: Capo 2}\r\n[C]Oh my darling');
    expect(files[2].data).toContain('Kein schöner Land.cho\r\nClementine - Percy Montrose.cho\r\n  Transposition: 1\r\n  Notiz: leise');
    const json = JSON.parse(files[3].data);
    expect([json.version, json.songs.length, json.trash.map((t) => t.chordpro), json.setlists.length]).toEqual([2, 2, ['{title: Weg}\n[G]x'], 1]);
  });

  it('Wiederherstellen auf einem anderen Gerät: Lieder, Einstellungen, Papierkorb, Setlisten', async () => {
    const A = device('a');
    const B = device('b');
    const c = await A.songs.create('{title: Clementine}\n[C]x');
    await A.songs.update(c.id, { transpose: 2, note: 'Capo 2' });
    const w = await A.songs.create('{title: Weg}\n[G]y');
    await A.songs.remove(w.id);
    await A.sets.create('Probe', [{ songId: c.id, transpose: 1 }]);
    const own = await B.songs.create('{title: Eigenes Lied}');
    const parsed = parseBackupZip(await readZip(createZip(backupFiles(await exportOf(A)))));
    expect(parsed.kind).toBe('backup');
    const r = await B.songs.importData(parsed.data);
    const nSets = await B.sets.importRecords(parsed.data.setlists);
    expect([r.added, r.trash, nSets]).toEqual([1, 1, 1]);
    expect((await B.songs.list()).map((s) => s.title)).toEqual(['Clementine', 'Eigenes Lied']);
    expect((await B.songs.get(c.id)).transpose).toBe(2);
    expect((await B.songs.trash()).map((s) => s.title)).toEqual(['Weg']);
    expect((await B.sets.list())[0].items).toEqual([{ songId: c.id, transpose: 1, note: '' }]);
    expect(await B.songs.get(own.id)).toBeTruthy(); // eigene Lieder bleiben
  });

  it('ZIP nur mit .cho/.txt (ohne JSON): Lieder und Setlisten aus den Dateien', async () => {
    const zip = createZip([
      { name: 'Lieder/Clementine.cho', data: '{title: Clementine}\r\n{transpose: 2}\r\n[C]x' },
      { name: 'Lieder/Wild Rover.cho', data: '[G]wild' },
      { name: 'Setlisten/Abend.txt', data: 'Wild Rover.cho\r\nClementine.cho\r\n  Notiz: zum Schluss\r\n' },
    ]);
    const parsed = parseBackupZip(await readZip(zip));
    expect(parsed.kind).toBe('files');
    expect(parsed.songs.map((s) => [s.file, s.transpose, s.chordpro])).toEqual([
      ['Clementine.cho', 2, '{title: Clementine}\n[C]x'],
      ['Wild Rover.cho', 0, '{title: Wild Rover}\n[G]wild'],
    ]);
    expect(parsed.setlists[0]).toEqual({ name: 'Abend', items: [
      { songId: 'Wild Rover.cho', transpose: null, note: '' }, { songId: 'Clementine.cho', transpose: null, note: 'zum Schluss' },
    ] });
  });

  it('alte Sicherungen (nur Lieder, Version 1) lassen sich weiter öffnen', async () => {
    const B = device('b');
    const r = await B.songs.importData({ format: 'liederbuch', version: 1, songs: [{ id: 'x', chordpro: '{title: Alt}' }] });
    expect([r.added, r.trash]).toEqual([1, 0]);
    expect(await B.sets.importRecords(undefined)).toBe(0);
  });
});
