import { describe, it, expect } from './runner.js';
import { SongRepository } from '../src/storage/repository.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { getTags, setTags } from '../src/core/meta-edit.js';

let n = 0;
const repo = () => new SongRepository(createMemoryStore(), { newId: () => `t${++n}` });

describe('Tags', () => {
  it('lesen und setzen im Text', () => {
    const src = '{title: X}\n{key: G}\n\n[G]la';
    const t = setTags(src, ['Lagerfeuer', ' Advent ', 'Lagerfeuer', '']);
    expect(t.split('\n').slice(0, 4)).toEqual(['{title: X}', '{key: G}', '{tag: Lagerfeuer}', '{tag: Advent}']);
    expect(getTags(t)).toEqual(['Lagerfeuer', 'Advent']);
    expect(getTags(setTags(t, ['Band']))).toEqual(['Band']);
    expect(setTags(setTags(t, []), [])).toBe(src);
  });

  it('Liste nach Tag filtern, Tags zählen, nach Tag suchen', async () => {
    const r = repo();
    await r.create('{title: A}\n{tag: Advent}');
    await r.create('{title: B}\n{tag: Advent}\n{tag: Lagerfeuer}');
    await r.create('{title: C}');
    expect(await r.tags()).toEqual([{ tag: 'Advent', count: 2 }, { tag: 'Lagerfeuer', count: 1 }]);
    expect((await r.list({ tag: 'Advent' })).map((s) => s.title)).toEqual(['A', 'B']);
    expect((await r.list({ query: 'lagerf' })).map((s) => s.title)).toEqual(['B']);
  });
});

describe('Notizen und Papierkorb', () => {
  it('Notiz wird gespeichert, exportiert und importiert', async () => {
    const r = repo();
    const s = await r.create('{title: N}');
    await r.update(s.id, { note: 'Capo 2, leise anfangen' });
    const data = await r.exportData();
    expect(data.songs[0].note).toBe('Capo 2, leise anfangen');
    const r2 = repo();
    await r2.importData(data);
    expect((await r2.get(s.id)).note).toBe('Capo 2, leise anfangen');
  });

  it('gelöschte Lieder im Papierkorb, wiederherstellen und endgültig leeren', async () => {
    const r = repo();
    const a = await r.create('{title: Weg}');
    const b = await r.create('{title: Auch weg}');
    await r.remove(a.id);
    await r.remove(b.id);
    expect((await r.trash()).length).toBe(2);
    await r.restore(a.id);
    expect((await r.list()).map((s) => s.title)).toEqual(['Weg']);
    await r.purge(b.id);
    expect((await r.trash()).length).toBe(0);
    const tomb = (await r.allRecords()).find((x) => x.id === b.id);
    expect([Boolean(tomb.deletedAt), tomb.chordpro]).toEqual([true, '']);
  });
});

describe('Gleichzeitige Änderungen', () => {
  it('Text und Notiz gleichzeitig gespeichert – beides bleibt erhalten', async () => {
    const r = repo();
    const s = await r.create('{title: Alt}');
    await Promise.all([r.update(s.id, { chordpro: '{title: Neu}' }), r.update(s.id, { note: 'Notiz' })]);
    const got = await r.get(s.id);
    expect([got.title, got.note]).toEqual(['Neu', 'Notiz']);
  });
});
