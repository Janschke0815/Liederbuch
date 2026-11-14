import { describe, it, expect } from './runner.js';
import { SongRepository, deriveSummary } from '../src/storage/repository.js';
import { createMemoryStore, openIdbStore } from '../src/storage/stores.js';
import { parseImportFile, looksLikeChordPro } from '../src/core/file-import.js';

// Repository mit steuerbarer Uhr und fortlaufenden IDs
function makeRepo(store = createMemoryStore()) {
  let tick = 0;
  let id = 0;
  const repo = new SongRepository(store, {
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)).toISOString(),
    newId: () => `s${++id}`,
  });
  return repo;
}

const song = (title, artist = '', body = '[G]la') =>
  `{title: ${title}}\n${artist ? `{artist: ${artist}}\n` : ''}${body}\n`;

describe('Speicher: Repository', () => {
  it('leitet Titel, Interpret und Sortiertitel aus dem ChordPro-Text ab', () => {
    expect(deriveSummary('{t: Der Mond ist aufgegangen}\n{sorttitle: Mond ist aufgegangen}\n{artist: A}\n{artist: B}')).toEqual({
      title: 'Der Mond ist aufgegangen', artist: 'A, B', sortTitle: 'Mond ist aufgegangen',
    });
  });

  it('legt an, ändert und liest', async () => {
    const repo = makeRepo();
    const a = await repo.create(song('Wild Rover'));
    expect([a.id, a.title, a.transpose, a.accidentals]).toEqual(['s1', 'Wild Rover', 0, 'auto']);
    const b = await repo.update(a.id, { chordpro: song('The Wild Rover', 'Traditional') });
    expect([b.title, b.artist]).toEqual(['The Wild Rover', 'Traditional']);
    expect(b.updatedAt > a.updatedAt).toBe(true);
    expect((await repo.get(a.id)).chordpro).toContain('The Wild Rover');
  });

  it('speichert Transposition und Schreibweise pro Lied', async () => {
    const repo = makeRepo();
    const a = await repo.create(song('A'));
    await repo.update(a.id, { transpose: 3, accidentals: 'flat' });
    const r = await repo.get(a.id);
    expect([r.transpose, r.accidentals]).toEqual([3, 'flat']);
    expect((await repo.update(a.id, { transpose: 7 })).transpose).toBe(-5); // +7 = -5
    expect((await repo.update(a.id, { transpose: -13 })).transpose).toBe(-1);
  });

  it('sortiert deutsch-alphabetisch (Umlaute, Groß/klein, Zahlen)', async () => {
    const repo = makeRepo();
    for (const t of ['Zebra', 'Über den Wolken', 'apfel', 'Ufer', 'Lied 10', 'Lied 2']) await repo.create(song(t));
    expect((await repo.list()).map((s) => s.title)).toEqual(['apfel', 'Lied 2', 'Lied 10', 'Über den Wolken', 'Ufer', 'Zebra']);
  });

  it('sucht in Titel und Interpret, danach im Liedtext', async () => {
    const repo = makeRepo();
    await repo.create(song('Kein schöner Land', 'Volkslied', 'Kein [D]schöner Land in dieser Zeit'));
    await repo.create(song('Die Gedanken sind frei', 'Volkslied', 'Kein [G]Kerker kann sie halten'));
    await repo.create(song('Amazing Grace', 'John Newton', 'A[G]mazing grace'));
    expect((await repo.list({ query: 'kein' })).map((s) => s.title)).toEqual(['Kein schöner Land', 'Die Gedanken sind frei']);
    expect((await repo.list({ query: 'schoner' })).map((s) => s.title)).toEqual(['Kein schöner Land']);
    expect((await repo.list({ query: 'volkslied frei' })).map((s) => s.title)).toEqual(['Die Gedanken sind frei']);
    expect((await repo.list({ query: 'newton' })).length).toBe(1);
    // Akkorde zählen nicht als Text: "Amazing" steht als A[G]mazing im Quelltext
    expect((await repo.list({ query: 'amazing grace' })).length).toBe(1);
    expect((await repo.list({ query: 'xyz' })).length).toBe(0);
  });

  it('löscht weich (Grabstein bleibt für späteren Sync)', async () => {
    const store = createMemoryStore();
    const repo = makeRepo(store);
    const a = await repo.create(song('Weg damit'));
    await repo.remove(a.id);
    expect(await repo.get(a.id)).toBe(undefined);
    expect((await repo.list()).length).toBe(0);
    expect(Boolean((await store.get(a.id)).deletedAt)).toBe(true);
  });
});

describe('Speicher: Export und Import', () => {
  it('Export -> Import in leeres Liederbuch ergibt dieselben Lieder', async () => {
    const src = makeRepo();
    const a = await src.create(song('Eins'));
    await src.create(song('Zwei'));
    await src.update(a.id, { transpose: 2 });
    const gone = await src.create(song('Gelöscht'));
    await src.remove(gone.id);

    const data = JSON.parse(JSON.stringify(await src.exportData()));
    expect([data.format, data.version, data.songs.length]).toEqual(['liederbuch', 1, 2]);

    const dst = makeRepo();
    expect(await dst.importData(data)).toEqual({ added: 2, updated: 0, skipped: 0 });
    const list = await dst.list();
    expect(list.map((s) => [s.title, s.transpose])).toEqual([['Eins', 2], ['Zwei', 0]]);
  });

  it('beim Zusammenführen gewinnt die neuere Fassung', async () => {
    const repo = makeRepo();
    const a = await repo.create(song('Alt'));
    const b = await repo.create(song('Bleibt'));
    const backup = await repo.exportData();
    await repo.update(b.id, { chordpro: song('Bleibt – lokal geändert') }); // lokal neuer
    backup.songs.find((s) => s.id === a.id).chordpro = song('Alt – aus Sicherung');
    backup.songs.find((s) => s.id === a.id).updatedAt = '2030-01-01T00:00:00.000Z'; // Sicherung neuer
    backup.songs.push({ chordpro: song('Ganz neu') }); // ohne ID
    backup.songs.push({ title: 'kaputt' }); // ungültig

    expect(await repo.importData(backup)).toEqual({ added: 1, updated: 1, skipped: 2 });
    expect((await repo.list()).map((s) => s.title)).toEqual(['Alt – aus Sicherung', 'Bleibt – lokal geändert', 'Ganz neu']);
  });

  it('lehnt fremde Dateien ab', async () => {
    const repo = makeRepo();
    for (const bad of [null, {}, { format: 'x', songs: [] }, { format: 'liederbuch', version: 99, songs: [] }]) {
      let failed = false;
      try { await repo.importData(bad); } catch { failed = true; }
      if (!failed) throw new Error(`hätte abgelehnt werden müssen: ${JSON.stringify(bad)}`);
    }
  });
});

describe('Speicher: IndexedDB', () => {
  it('speichert dauerhaft und liest wieder', async () => {
    const name = 'liederbuch-test-' + Date.now();
    let store = await openIdbStore(name);
    const repo = makeRepo(store);
    const a = await repo.create(song('Persistent'));
    await repo.update(a.id, { transpose: -2 });
    store.close();

    store = await openIdbStore(name); // neu öffnen
    const again = new SongRepository(store);
    const r = await again.get(a.id);
    expect([r.title, r.transpose]).toEqual(['Persistent', -2]);
    expect((await again.list()).length).toBe(1);
    store.close();
    await new Promise((res) => { const d = indexedDB.deleteDatabase(name); d.onsuccess = d.onerror = d.onblocked = res; });
  });
});

describe('Datei-Import', () => {
  it('erkennt Sicherungen', () => {
    const r = parseImportFile('backup.json', '{"format":"liederbuch","version":1,"songs":[]}');
    expect(r.kind).toBe('backup');
    let failed = false;
    try { parseImportFile('kaputt.json', '{nope'); } catch { failed = true; }
    expect(failed).toBe(true);
  });

  it('erkennt ChordPro und trennt mehrere Lieder', () => {
    const r = parseImportFile('sammlung.cho', '{title: Eins}\n[G]la\n{new_song}\n{t: Zwei}\n[C]li\n');
    expect(r).toEqual({ kind: 'songs', songs: ['{title: Eins}\n[G]la\n', '{t: Zwei}\n[C]li\n'] });
  });

  it('ergänzt fehlenden Titel aus dem Dateinamen', () => {
    expect(parseImportFile('C:\\Lieder\\Wild_Rover.cho', "[D]I've been a wild rover").songs[0])
      .toBe("{title: Wild Rover}\n[D]I've been a wild rover\n");
  });

  it('wandelt Akkorde-über-Text um', () => {
    const r = parseImportFile('Scarborough Fair.txt', '[Verse]\nAm      G\nScarborough Fair');
    expect(r.songs[0]).toBe('{title: Scarborough Fair}\n\n{start_of_verse: Verse}\n[Am]Scarboro[G]ugh Fair\n{end_of_verse}\n');
  });

  it('unterscheidet ChordPro von Abschnittsmarken', () => {
    expect(looksLikeChordPro('[Verse]\nAm  G\nla la')).toBe(false);
    expect(looksLikeChordPro('[Bridge]\nla')).toBe(false);
    expect(looksLikeChordPro('Hello [Am]world')).toBe(true);
    expect(looksLikeChordPro('{soc}\nla\n{eoc}')).toBe(true);
  });
});
