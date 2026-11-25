import { describe, it, expect } from './runner.js';
import {
  PERSONAL, listBooks, activeBook, setActiveBook, addSharedBook, removeBook, bookNameFromFile, fileNameForBook,
  addBook, renameBook, bookKey, BOOK_KEYS, addAboBook, removePersonal, restorePersonal, isPersonalHidden, homeBook, myBook,
} from '../src/books.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('Liederbücher', () => {
  it('ohne Einträge gibt es nur das persönliche, und es ist aktiv', () => {
    const st = memoryStorage();
    expect(listBooks(st).map((b) => b.id)).toEqual(['personal']);
    expect(activeBook(st)).toEqual(PERSONAL);
  });

  it('gemeinsames Liederbuch anlegen, wechseln, entfernen', () => {
    const st = memoryStorage();
    const band = addSharedBook({ fileId: 'f1', name: 'Band' }, st);
    expect(band).toEqual({ id: 'shared-f1', name: 'Band', dbName: 'liederbuch-f1', shared: true, fileId: 'f1' });
    addSharedBook({ fileId: 'f1', name: 'Band neu' }, st); // kein Doppel, nur umbenannt
    expect(listBooks(st).map((b) => b.name)).toEqual(['Mein Liederbuch', 'Band neu']);
    setActiveBook('shared-f1', st);
    expect(activeBook(st).dbName).toBe('liederbuch-f1');
    removeBook('shared-f1', st);
    expect(activeBook(st).id).toBe('personal');
  });

  it('unbekannte oder kaputte Einträge werden ignoriert', () => {
    const st = memoryStorage();
    st.setItem('books', '{kaputt');
    st.setItem('activeBook', 'gibts-nicht');
    expect(listBooks(st).length).toBe(1);
    expect(activeBook(st).id).toBe('personal');
  });

  it('Dateiname und Anzeigename', () => {
    expect(fileNameForBook(' Band ')).toBe('Liederbuch – Band.json');
    expect(bookNameFromFile('Liederbuch – Band.json')).toBe('Band');
    expect(bookNameFromFile('Liederbuch - Lagerfeuer.json')).toBe('Lagerfeuer');
    expect(bookNameFromFile('Liederbuch.json')).toBe('Liederbuch');
  });
});

describe('Liederbücher: mehrere eigene (2.2)', () => {
  it('eigenes Liederbuch anlegen: eigene Datenbank und Datei, bleibt nach dem Neuladen', () => {
    const st = memoryStorage();
    const a = addBook({ name: ' Band ' }, st);
    const b = addBook({ name: 'Lagerfeuer' }, st);
    expect(/^book-[0-9a-z]+$/.test(a.id)).toBe(true);
    expect(a.id === b.id).toBe(false);
    expect(a.name).toBe('Band');
    expect(a.dbName).toBe(`liederbuch-${a.id}`);
    expect(a.file).toBe('Liederbuch – Band.json');
    expect(a.own).toBe(true);
    expect(listBooks(st).map((x) => x.name)).toEqual(['Mein Liederbuch', 'Band', 'Lagerfeuer']);
    setActiveBook(b.id, st);
    expect(activeBook(st).id).toBe(b.id);
  });

  it('umbenennen: nur der Name, die Datei bleibt; Abos nicht', () => {
    const st = memoryStorage();
    const a = addBook({ name: 'Band' }, st);
    expect(renameBook(a.id, ' Die Band ', st)).toBe(true);
    const now = listBooks(st).find((x) => x.id === a.id);
    expect(now.name).toBe('Die Band');
    expect(now.file).toBe('Liederbuch – Band.json');
    expect(renameBook(a.id, '   ', st)).toBe(false);
    expect(renameBook('personal', 'Meine Lieder', st)).toBe(true);
    expect(listBooks(st)[0].name).toBe('Meine Lieder');
    expect(activeBook(st).name).toBe('Meine Lieder');
    expect(activeBook(st).dbName).toBe(PERSONAL.dbName);
    expect(renameBook('personal', 'Mein Liederbuch', st)).toBe(true); // zurück zum Standard
    expect(st.getItem('personalName')).toBe(null);
    expect(PERSONAL.name).toBe('Mein Liederbuch'); // die Vorlage bleibt unverändert
    const abo = addAboBook({ url: 'https://x.de/a.json', name: 'Abo' }, st);
    expect(renameBook(abo.id, 'Neu', st)).toBe(false);
    const shared = addSharedBook({ fileId: 'f1', name: 'Geteilt' }, st);
    expect(renameBook(shared.id, 'Chor', st)).toBe(true);
  });

  it('eigene Einstellungen je Buch; das persönliche und alte geteilte behalten die alten Schlüssel', () => {
    const st = memoryStorage();
    const a = addBook({ name: 'Band' }, st);
    expect(bookKey(PERSONAL, 'webdav.url')).toBe('webdav.url');
    expect(bookKey(a, 'webdav.url')).toBe(`webdav.url:${a.id}`);
    const old = addSharedBook({ fileId: 'f1', name: 'Alt' }, st);
    expect(bookKey(old, 'gdrive.token')).toBe('gdrive.token');
    // … aber nie den Speicherort des persönlichen (2.1.2)
    expect(bookKey(old, 'sync.provider')).toBe('sync.provider:shared-f1');
    const neu = addSharedBook({ fileId: 'f2', name: 'Neu', ownAuth: true }, st);
    expect(bookKey(neu, 'gdrive.token')).toBe('gdrive.token:shared-f2');
    // Rechte ändern sich (erneut eintragen), die eigene Anmeldung bleibt
    expect(addSharedBook({ fileId: 'f2', name: 'Neu', readOnly: true }, st).ownAuth).toBe(true);
  });

  it('entfernen löscht die Einstellungen dieses Buchs, nicht die anderer', () => {
    const st = memoryStorage();
    const a = addBook({ name: 'Band' }, st);
    for (const k of BOOK_KEYS) {
      st.setItem(bookKey(a, k), 'x');
      st.setItem(k, 'persönlich');
    }
    removeBook(a.id, st);
    for (const k of BOOK_KEYS) {
      expect(st.getItem(bookKey(a, k))).toBe(null);
      expect(st.getItem(k)).toBe('persönlich');
    }
    // altes geteiltes Buch nutzt die globalen Schlüssel – die bleiben
    addSharedBook({ fileId: 'f1', name: 'Alt' }, st);
    removeBook('shared-f1', st);
    expect(st.getItem('gdrive.token')).toBe('persönlich');
  });

  it('Dateiname ohne Zeichen, die Dropbox/Drive stören', () => {
    expect(fileNameForBook('AC/DC: Best?')).toBe('Liederbuch – AC-DC- Best-.json');
    expect(fileNameForBook('a\\b')).toBe('Liederbuch – a-b.json');
  });
});

describe('„Mein Liederbuch“ entfernen (2.6)', () => {
  it('nur, wenn es weitere gibt; danach ist das erste andere Buch die Heimat', () => {
    const st = memoryStorage();
    expect(removePersonal(st)).toBe(false);
    const band = addBook({ name: 'Band' }, st);
    st.setItem('sync.kind', 'webdav');
    st.setItem('webdav.url', 'https://x.de/');
    st.setItem('gdrive.token', 'bleibt');
    setActiveBook('personal', st);
    expect(removePersonal(st)).toBe(true);
    expect(listBooks(st).map((b) => b.id)).toEqual([band.id]);
    expect([isPersonalHidden(st), activeBook(st).id, homeBook(st).id]).toEqual([true, band.id, band.id]);
    expect([st.getItem('sync.kind'), st.getItem('webdav.url'), st.getItem('gdrive.token')]).toEqual([null, null, 'bleibt']);
  });

  it('„Zu deinen Liedern“ und „hierhin kopieren“ nehmen das erste beschreibbare Buch, nicht ein Abo', () => {
    const st = memoryStorage();
    addAboBook({ url: 'https://x.de/a.json', name: 'Abo' }, st);
    const band = addBook({ name: 'Band' }, st);
    removePersonal(st);
    expect(myBook(st).id).toBe(band.id);
  });

  it('wieder anlegen; ist das letzte andere Buch weg, ist es von selbst wieder da', () => {
    const st = memoryStorage();
    const band = addBook({ name: 'Band' }, st);
    removePersonal(st);
    restorePersonal(st);
    expect(listBooks(st).map((b) => b.id)).toEqual(['personal', band.id]);
    removePersonal(st);
    removeBook(band.id, st);
    expect(listBooks(st).map((b) => b.id)).toEqual(['personal']);
    addBook({ name: 'Neu' }, st); // bleibt da, auch wenn wieder ein Buch dazukommt
    expect(listBooks(st)[0].id).toBe('personal');
  });
});
