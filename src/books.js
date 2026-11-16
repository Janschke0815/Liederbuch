// Mehrere Liederbücher auf einem Gerät: das persönliche und beliebig viele gemeinsame.
// Jedes hat eine eigene lokale Datenbank; gemeinsame sind an eine geteilte Drive-Datei gebunden.
//
// Buch: { id, name, dbName, shared, fileId }

export const PERSONAL = Object.freeze({
  id: 'personal',
  name: 'Mein Liederbuch',
  dbName: 'liederbuch',
  shared: false,
  fileId: null,
});

const KEY = 'books';
const ACTIVE = 'activeBook';

function read(storage) {
  try {
    const list = JSON.parse(storage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((b) => b && typeof b.id === 'string' && b.fileId) : [];
  } catch {
    return [];
  }
}

/** Alle Liederbücher, das persönliche zuerst. */
export function listBooks(storage = localStorage) {
  return [PERSONAL, ...read(storage)];
}

/** Liederbuch mit dieser ID oder null. */
export function getBook(id, storage = localStorage) {
  return listBooks(storage).find((b) => b.id === id) || null;
}

/** Das Liederbuch, das gerade geöffnet ist (sonst das persönliche). */
export function activeBook(storage = localStorage) {
  return getBook(storage.getItem(ACTIVE), storage) || PERSONAL;
}

/** Liederbuch für den nächsten Start merken (nur bekannte IDs). */
export function setActiveBook(id, storage = localStorage) {
  if (getBook(id, storage)) storage.setItem(ACTIVE, id);
}

/** Gemeinsames Liederbuch eintragen (oder Namen aktualisieren). */
export function addSharedBook({ fileId, name }, storage = localStorage) {
  const list = read(storage);
  const id = `shared-${fileId}`;
  const book = { id, name: name || 'Gemeinsames Liederbuch', dbName: `liederbuch-${fileId}`, shared: true, fileId };
  const i = list.findIndex((b) => b.id === id);
  if (i >= 0) list[i] = book;
  else list.push(book);
  storage.setItem(KEY, JSON.stringify(list));
  return book;
}

/** Aus der Liste entfernen; die lokale Datenbank löscht der Aufrufer. */
export function removeBook(id, storage = localStorage) {
  storage.setItem(KEY, JSON.stringify(read(storage).filter((b) => b.id !== id)));
  if (storage.getItem(ACTIVE) === id) storage.removeItem(ACTIVE);
}

/** Dateiname in Drive -> Anzeigename ("Liederbuch – Band.json" -> "Band"). */
export function bookNameFromFile(fileName) {
  const base = String(fileName || '').replace(/\.json$/i, '').trim();
  const m = /^Liederbuch\s*[–—-]\s*(.+)$/i.exec(base);
  return (m ? m[1] : base).trim() || 'Gemeinsames Liederbuch';
}

/** Dateiname der Drive-Datei für ein gemeinsames Liederbuch: „Liederbuch – Name.json“. */
export const fileNameForBook = (name) => `Liederbuch – ${String(name).trim()}.json`;
