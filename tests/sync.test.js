import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine, mergeRecords, ConflictError, SYNC_FORMAT } from '../src/sync/sync-engine.js';

// Gemeinsame Uhr, damit "später" eindeutig ist
let clock = 0;
const now = () => new Date(Date.UTC(2026, 0, 1, 0, 0, clock++)).toISOString();

function device(name) {
  let n = 0;
  return new SongRepository(createMemoryStore(), { now, newId: () => `${name}${++n}` });
}

/** Cloud-Attrappe mit Versionsnummer wie bei Google Drive. */
function memoryCloud() {
  let file = null;
  let version = 0;
  const cloud = {
    reads: 0,
    downloads: 0,
    writes: 0,
    async read(known) {
      cloud.reads++;
      if (!file) return null;
      if (known === version) return { unchanged: true };
      cloud.downloads++;
      return { data: structuredClone(file), version };
    },
    async write(data, expected) {
      if ((file ? version : null) !== expected) throw new ConflictError();
      cloud.writes++;
      file = structuredClone(data);
      return ++version;
    },
    peek: () => file,
    // simuliert ein anderes Gerät, das zwischendurch schreibt
    touch() {
      version++;
    },
  };
  return cloud;
}

const engine = (repo, cloud) => {
  const e = new SyncEngine(repo, cloud);
  e.state = 'idle'; // ohne Zeitgeber/Ereignisse, Abgleich nur manuell
  return e;
};
const titles = async (repo) => (await repo.list()).map((s) => s.title);

describe('Sync: Zusammenführen', () => {
  const rec = (id, updatedAt, extra = {}) => ({
    id, chordpro: `{title: ${id}}`, transpose: 0, accidentals: 'auto', createdAt: 'a', updatedAt, deletedAt: null, ...extra,
  });

  it('nimmt pro Lied die neuere Fassung', () => {
    const r = mergeRecords([rec('a', '2'), rec('b', '1')], [rec('a', '1'), rec('b', '3'), rec('c', '1')]);
    expect(r.merged.map((x) => `${x.id}${x.updatedAt}`).sort()).toEqual(['a2', 'b3', 'c1']);
    expect(r.toLocal.map((x) => x.id).sort()).toEqual(['b', 'c']);
    expect(r.remoteChanged).toBe(true);
  });

  it('erkennt, wenn nichts hochzuladen ist', () => {
    const r = mergeRecords([rec('a', '1')], [rec('a', '1'), rec('b', '1')]);
    expect(r.remoteChanged).toBe(false);
    expect(r.toLocal.map((x) => x.id)).toEqual(['b']);
  });

  it('Löschung gewinnt, wenn sie neuer ist', () => {
    const r = mergeRecords([rec('a', '1')], [rec('a', '2', { deletedAt: '2' })]);
    expect(r.toLocal[0].deletedAt).toBe('2');
  });
});

describe('Sync: zwei Geräte', () => {
  it('neue, geänderte und gelöschte Lieder kommen auf dem anderen Gerät an', async () => {
    const cloud = memoryCloud();
    const A = device('a');
    const B = device('b');
    const sa = engine(A, cloud);
    const sb = engine(B, cloud);

    const song = await A.create('{title: Clementine}\n[C]la');
    await sa.sync();
    expect(cloud.peek().format).toBe(SYNC_FORMAT);
    await sb.sync();
    expect(await titles(B)).toEqual(['Clementine']);

    await B.update(song.id, { chordpro: '{title: Clementine}\n[G]li', transpose: 2 });
    await sb.sync();
    let changed = null;
    A.addEventListener('remote-change', (e) => (changed = e.detail));
    await sa.sync();
    expect((await A.get(song.id)).chordpro).toContain('[G]li');
    expect((await A.get(song.id)).transpose).toBe(2);
    expect(changed).toEqual([song.id]);

    await A.remove(song.id);
    await sa.sync();
    await sb.sync();
    expect(await titles(B)).toEqual([]);
  });

  it('gleichzeitige Änderungen an verschiedenen Liedern gehen nicht verloren', async () => {
    const cloud = memoryCloud();
    const A = device('a');
    const B = device('b');
    const sa = engine(A, cloud);
    const sb = engine(B, cloud);
    await A.create('{title: Alpha}');
    await B.create('{title: Beta}');
    await sa.sync();
    await sb.sync();
    await sa.sync();
    expect(await titles(A)).toEqual(['Alpha', 'Beta']);
    expect(await titles(B)).toEqual(['Alpha', 'Beta']);
  });

  it('dasselbe Lied auf beiden Geräten: die spätere Änderung gewinnt überall', async () => {
    const cloud = memoryCloud();
    const A = device('a');
    const B = device('b');
    const sa = engine(A, cloud);
    const sb = engine(B, cloud);
    const s = await A.create('{title: Lied}');
    await sa.sync();
    await sb.sync();
    await A.update(s.id, { chordpro: '{title: Lied A}' });
    await B.update(s.id, { chordpro: '{title: Lied B}' }); // später
    await sa.sync();
    await sb.sync();
    await sa.sync();
    expect(await titles(A)).toEqual(['Lied B']);
    expect(await titles(B)).toEqual(['Lied B']);
  });

  it('ohne Änderungen wird nur die Version abgefragt, nichts geladen', async () => {
    const cloud = memoryCloud();
    const A = device('a');
    const sa = engine(A, cloud);
    await A.create('{title: X}');
    await sa.sync();
    const before = { downloads: cloud.downloads, writes: cloud.writes };
    await sa.sync();
    await sa.sync();
    expect([cloud.downloads, cloud.writes]).toEqual([before.downloads, before.writes]);
  });

  it('versucht es erneut, wenn ein anderes Gerät gleichzeitig schreibt', async () => {
    const cloud = memoryCloud();
    const A = device('a');
    const sa = engine(A, cloud);
    await A.create('{title: Eins}');
    await sa.sync();
    await A.create('{title: Zwei}');
    const write = cloud.write;
    let first = true;
    cloud.write = async (data, v) => {
      if (first) {
        first = false;
        cloud.touch();
      }
      return write(data, v);
    };
    await sa.sync();
    expect(sa.state).toBe('idle');
    expect(cloud.peek().songs.length).toBe(2);
  });

  it('lokale Bearbeitung während des Abgleichs wird nicht überschrieben', async () => {
    const A = device('a');
    const s = await A.create('{title: Neu}');
    const old = { ...(await A.allRecords())[0], chordpro: '{title: Alt}', updatedAt: '2000-01-01T00:00:00.000Z' };
    expect(await A.applyRemote([old])).toEqual([]);
    expect((await A.get(s.id)).title).toBe('Neu');
  });
});
