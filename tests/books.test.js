import { describe, it, expect } from './runner.js';
import {
  PERSONAL, listBooks, activeBook, setActiveBook, addSharedBook, removeBook, bookNameFromFile, fileNameForBook,
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
