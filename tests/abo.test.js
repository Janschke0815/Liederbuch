// Abonnierbare Liederbücher (private Gruppen)
import { describe, it, expect } from './runner.js';
import { buildAboPayload, aboToText, parseAbo, aboLink, parseAboLink, randomFilePart } from '../src/formats/abo.js';
import { SongRepository } from '../src/storage/repository.js';
import { SetlistRepository } from '../src/storage/setlists.js';
import { createMemoryStore } from '../src/storage/stores.js';
import { addAboBook, listBooks, removeBook } from '../src/books.js';

const SONGS = [
  { id: 'a', chordpro: '{title: Eins}\n[C]Text', transpose: 2, note: 'privat', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
  { id: 'b', chordpro: '{title: Zwei}\n[G]Text', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' },
  { id: 'x', chordpro: '{title: Weg}', deletedAt: '2026-01-04T00:00:00Z' },
];

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

describe('Abo-Datei', () => {
  it('enthält, was Abonnenten brauchen – mit Transposition, ohne Notizen', () => {
    const p = buildAboPayload(SONGS, [{ id: 's', name: 'Gig', items: [{ songId: 'a', transpose: 1, note: 'geheim' }, { songId: 'zz' }] }],
      { name: ' Band ', publisher: 'Jan' }, '2026-11-19T10:00:00Z');
    expect(p.name).toBe('Band');
    expect(p.rights).toBe('privat');
    expect(p.songs.map((s) => s.id)).toEqual(['a', 'b']); // gelöschte nicht
    expect('note' in p.songs[0]).toBe(false); // keine Notizen
    expect([p.songs[0].transpose, p.songs[0].accidentals, p.songs[1].transpose]).toEqual([2, 'auto', 0]);
    expect(p.setlists[0].items).toEqual([{ songId: 'a', transpose: 1, note: '' }]); // fremde Lieder raus, Notiz raus
  });
  it('ist lesbares JSON und lässt sich wieder lesen', () => {
    const text = aboToText(buildAboPayload(SONGS, [], { name: 'Band' }));
    expect(text.includes('\r\n  "format": "liederbuch-abo"')).toBe(true);
    const back = parseAbo(text);
    expect(back.songs.length).toBe(2);
    expect(back.songs[0].chordpro).toBe('{title: Eins}\n[C]Text');
  });
  it('verständliche Fehler', () => {
    const msg = (t) => { try { parseAbo(t); return ''; } catch (e) { return e.message; } };
    expect(msg('<html>')).toContain('keine Abo-Datei');
    expect(msg('{"format":"liederbuch"}')).toContain('keine Abo-Datei');
    expect(msg('{"format":"liederbuch-abo","version":99,"songs":[]}')).toContain('neueren Version');
    expect(msg('{"format":"liederbuch-abo","version":1}')).toContain('beschädigt');
  });
  it('Einladungslink hin und zurück, auch nackte Adresse', () => {
    const link = aboLink('https://nas:8081/', 'https://nas:8081/Liederbuch/Abo/Band 1.json');
    expect(link).toBe('https://nas:8081/#abo=https%3A%2F%2Fnas%3A8081%2FLiederbuch%2FAbo%2FBand%201.json');
    expect(parseAboLink(link)).toBe('https://nas:8081/Liederbuch/Abo/Band 1.json');
    expect(parseAboLink('https://x.de/a.json')).toBe('https://x.de/a.json');
    expect(parseAboLink('#abo=javascript%3Aalert(1)')).toBe(null);
    expect(parseAboLink('quatsch')).toBe(null);
  });
  it('Zufallsteil für Dateinamen', () => {
    const a = randomFilePart();
    expect(/^[a-z0-9]{12}$/.test(a)).toBe(true);
    expect(a === randomFilePart()).toBe(false);
  });
});

describe('Abo übernehmen', () => {
  it('neu, geändert, entfernt – eigene Transposition und Notiz bleiben', async () => {
    const repo = new SongRepository(createMemoryStore());
    expect(await repo.replaceFromAbo([{ id: 'a', chordpro: '{title: Eins}' }, { id: 'b', chordpro: '{title: Zwei}' }]))
      .toEqual({ added: 2, changed: 0, removed: 0 });
    await repo.update('a', { transpose: 3, note: 'meins' });
    const r = await repo.replaceFromAbo([{ id: 'a', chordpro: '{title: Eins (neu)}' }, { id: 'c', chordpro: '{title: Drei}' }]);
    expect(r).toEqual({ added: 1, changed: 1, removed: 1 });
    const a = await repo.get('a');
    expect([a.title, a.transpose, a.note]).toEqual(['Eins (neu)', 3, 'meins']);
    expect(await repo.get('b')).toBe(undefined);
    expect((await repo.list()).map((s) => s.title)).toEqual(['Drei', 'Eins (neu)']);
  });
  it('Transposition und Schreibweise des Herausgebers kommen mit', async () => {
    const repo = new SongRepository(createMemoryStore());
    await repo.replaceFromAbo([{ id: 'a', chordpro: 'x', transpose: 2, accidentals: 'flat' }]);
    let a = await repo.get('a');
    expect([a.transpose, a.accidentals]).toEqual([2, 'flat']);
    // selbst umgestellt: bleibt, solange der Herausgeber nichts ändert
    await repo.update('a', { transpose: -1 });
    expect(await repo.replaceFromAbo([{ id: 'a', chordpro: 'x', transpose: 2, accidentals: 'flat' }])).toEqual({ added: 0, changed: 0, removed: 0 });
    expect((await repo.get('a')).transpose).toBe(-1);
    // Herausgeber ändert die Transposition: kommt an
    expect(await repo.replaceFromAbo([{ id: 'a', chordpro: 'x', transpose: 5, accidentals: 'flat' }])).toEqual({ added: 0, changed: 1, removed: 0 });
    a = await repo.get('a');
    expect([a.transpose, a.accidentals]).toEqual([5, 'flat']);
  });
  it('Abo-Datei ohne Transposition (älter): eigene Einstellung bleibt', async () => {
    const repo = new SongRepository(createMemoryStore());
    await repo.replaceFromAbo([{ id: 'a', chordpro: 'x' }]);
    await repo.update('a', { transpose: 4 });
    await repo.replaceFromAbo([{ id: 'a', chordpro: 'y' }]);
    expect((await repo.get('a')).transpose).toBe(4);
  });
  it('unverändert: nichts zu tun', async () => {
    const repo = new SongRepository(createMemoryStore());
    await repo.replaceFromAbo([{ id: 'a', chordpro: 'x' }]);
    expect(await repo.replaceFromAbo([{ id: 'a', chordpro: 'x' }])).toEqual({ added: 0, changed: 0, removed: 0 });
  });
  it('Setlisten: Abo-Setlisten ersetzt, eigene bleiben', async () => {
    const sets = new SetlistRepository(createMemoryStore());
    const own = await sets.create('Meine', []);
    await sets.replaceFromAbo([{ id: 's1', name: 'Gig', items: [] }, { id: 's2', name: 'Probe', items: [] }]);
    await sets.replaceFromAbo([{ id: 's2', name: 'Probe neu', items: [] }]);
    expect((await sets.list()).map((s) => s.name)).toEqual(['Meine', 'Probe neu']);
    expect(Boolean(await sets.get(own.id))).toBe(true);
  });
});

describe('Abo als Liederbuch', () => {
  it('eintragen, auflisten, entfernen', () => {
    const st = memoryStorage();
    const b = addAboBook({ url: 'https://nas/Abo/Band.json', name: 'Band', publisher: 'Jan', user: 'anna', password: 'pw' }, st);
    expect(b.id.startsWith('abo-')).toBe(true);
    expect(b.dbName.startsWith('liederbuch-abo-')).toBe(true);
    expect(listBooks(st).map((x) => x.name)).toEqual(['Mein Liederbuch', 'Band']);
    expect(addAboBook({ url: 'https://nas/Abo/Band.json', name: 'Band 2' }, st).id).toBe(b.id); // gleiche Adresse = gleiches Abo
    expect(listBooks(st).length).toBe(2);
    removeBook(b.id, st);
    expect(listBooks(st).length).toBe(1);
  });
});

describe('Abo laden', () => {
  const realFetch = globalThis.fetch;
  const withFetch = async (fake, fn) => {
    globalThis.fetch = fake;
    try {
      return await fn();
    } finally {
      globalThis.fetch = realFetch;
    }
  };
  const text = aboToText(buildAboPayload(SONGS, [], { name: 'Band' }));

  it('lädt, nutzt das ETag und verlangt ggf. eine Anmeldung', async () => {
    const { fetchAbo } = await import('../src/sync/abo-client.js');
    const calls = [];
    const fake = async (url, opts) => {
      calls.push(opts.headers);
      if (!opts.headers.Authorization) return new Response('', { status: 401 });
      if (opts.headers['If-None-Match'] === '"v1"') return new Response(null, { status: 304 });
      return new Response(text, { status: 200, headers: { ETag: '"v1"' } });
    };
    await withFetch(fake, async () => {
      let msg = '';
      try {
        await fetchAbo('https://nas/Abo/Band.json');
      } catch (e) {
        msg = e.message;
      }
      expect(msg).toContain('Anmeldung');
      const r = await fetchAbo('https://nas/Abo/Band.json', { user: 'anna', password: 'pw' });
      expect([r.data.name, r.etag]).toEqual(['Band', '"v1"']);
      const again = await fetchAbo('https://nas/Abo/Band.json', { user: 'anna', password: 'pw', etag: '"v1"' });
      expect(again.unchanged).toBe(true);
    });
  });
});
