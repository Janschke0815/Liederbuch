import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { SetlistRepository, slimSetlist } from '../src/storage/setlists.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { SyncEngine, ConflictError } from '../src/sync/sync-engine.js';

let clock = 0;
const now = () => new Date(Date.UTC(2026, 1, 1, 0, 0, clock++)).toISOString();

function device(name) {
  let n = 0;
  const newId = () => `${name}${++n}`;
  const songs = new SongRepository(createMemoryStore(), { now, newId });
  const sets = new SetlistRepository(createMemoryStore(), { now, newId: () => `${name}-set${++n}` });
  return { songs, sets };
}

function memoryCloud() {
  let file = null;
  let version = 0;
  return {
    async read(known) {
      if (!file) return null;
      if (known === version) return { unchanged: true };
      return { data: structuredClone(file), version };
    },
    async write(data, expected) {
      if ((file ? version : null) !== expected) throw new ConflictError();
      file = structuredClone(data);
      return ++version;
    },
    peek: () => file,
    put(data) {
      file = structuredClone(data);
      version++;
    },
  };
}

const engine = (d, cloud) => {
  const e = new SyncEngine(d.songs, cloud, { extra: [{ key: 'setlists', repo: d.sets, slim: slimSetlist }] });
  e.state = 'idle';
  return e;
};

describe('Setlisten: Speicher', () => {
  it('anlegen, ordnen, Notiz und eigene Transposition, löschen', async () => {
    const { sets } = device('a');
    const s = await sets.create('Samstag', [{ songId: 'x' }, { songId: 'y', transpose: 14, note: 'Capo 2' }, { bad: 1 }]);
    expect(s.items).toEqual([
      { songId: 'x', transpose: null, note: '' },
      { songId: 'y', transpose: 2, note: 'Capo 2' },
    ]);
    const moved = await sets.update(s.id, { items: [s.items[1], s.items[0]] });
    expect(moved.items.map((i) => i.songId)).toEqual(['y', 'x']);
    await sets.create('Advent');
    expect((await sets.list()).map((x) => x.name)).toEqual(['Advent', 'Samstag']);
    await sets.remove(s.id);
    expect((await sets.list()).map((x) => x.name)).toEqual(['Advent']);
  });
});

describe('Setlisten: Abgleich', () => {
  it('Setlisten kommen zusammen mit den Liedern auf dem anderen Gerät an', async () => {
    const cloud = memoryCloud();
    const A = device('a');
    const B = device('b');
    const sa = engine(A, cloud);
    const sb = engine(B, cloud);
    const song = await A.songs.create('{title: Clementine}');
    const set = await A.sets.create('Lagerfeuer', [{ songId: song.id, note: 'langsam' }]);
    await sa.sync();
    expect(cloud.peek().version).toBe(2);
    await sb.sync();
    expect((await B.sets.list()).map((s) => s.name)).toEqual(['Lagerfeuer']);
    expect((await B.sets.get(set.id)).items[0].note).toBe('langsam');

    await B.sets.update(set.id, { name: 'Lagerfeuer 2026' });
    await sb.sync();
    await sa.sync();
    expect((await A.sets.get(set.id)).name).toBe('Lagerfeuer 2026');
  });

  it('alte Cloud-Datei (Version 1, ohne Setlisten) wird übernommen und aufgerüstet', async () => {
    const cloud = memoryCloud();
    cloud.put({ format: 'liederbuch-sync', version: 1, songs: [] });
    const A = device('a');
    await A.sets.create('Neu');
    await engine(A, cloud).sync();
    expect(cloud.peek().version).toBe(2);
    expect(cloud.peek().setlists.length).toBe(1);
  });
});
