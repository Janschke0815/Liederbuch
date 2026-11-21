// Mehrere Liederbücher auf einem Gerät: das persönliche und beliebig viele gemeinsame.
// Jedes hat eine eigene lokale Datenbank; gemeinsame sind an eine geteilte Drive-Datei gebunden.
//
// Buch: { id, name, dbName, shared, fileId, readOnly? }  readOnly: nur Leserechte in Drive
//   abonniertes Liederbuch (nur lesen): { id: 'abo-…', name, dbName, abo: { url, publisher, user, password } }

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
    return Array.isArray(list) ? list.filter((b) => b && typeof b.id === 'string' && (b.fileId || b.abo?.url)) : [];
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

/**
 * Gemeinsames Liederbuch eintragen (oder Namen/Rechte aktualisieren).
 * @param {{fileId: string, name?: string, readOnly?: boolean}} entry  readOnly: nur Leserechte
 */
export function addSharedBook({ fileId, name, readOnly = false }, storage = localStorage) {
  const list = read(storage);
  const id = `shared-${fileId}`;
  const book = { id, name: name || 'Gemeinsames Liederbuch', dbName: `liederbuch-${fileId}`, shared: true, fileId };
  if (readOnly) book.readOnly = true;
  const i = list.findIndex((b) => b.id === id);
  if (i >= 0) list[i] = book;
  else list.push(book);
  storage.setItem(KEY, JSON.stringify(list));
  return book;
}

/** Kurze, feste Kennung aus einem Text (für IDs und Datenbanknamen). */
function shortHash(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Abonniertes Liederbuch eintragen (oder Namen/Schlüssel aktualisieren). Eigene Datenbank, nur lesen.
 * @param {{url: string, name?: string, publisher?: string, user?: string, password?: string}} abo
 *   user/password: Anmeldung am Server, falls der Ordner geschützt ist (bleibt auf diesem Gerät)
 */
export function addAboBook({ url, name, publisher = '', user = '', password = '' }, storage = localStorage) {
  const list = read(storage);
  const h = shortHash(url);
  const id = `abo-${h}`;
  const book = { id, name: name || 'Abonniertes Liederbuch', dbName: `liederbuch-abo-${h}`, shared: false, abo: { url, publisher, user, password } };
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

/**
 * Anzeigename für ein in Drive geteiltes Liederbuch: das persönliche „Liederbuch.json“ einer anderen
 * Person heißt „Liederbuch von <Name>“, sonst wie bookNameFromFile.
 */
export function driveBookName(fileName, ownerName = '') {
  if (/^Liederbuch\.json$/i.test(String(fileName || '').trim())) {
    return ownerName ? `Liederbuch von ${ownerName}` : 'Geteiltes Liederbuch';
  }
  return bookNameFromFile(fileName);
}

/** Dateiname der Drive-Datei für ein gemeinsames Liederbuch: „Liederbuch – Name.json“. */
export const fileNameForBook = (name) => `Liederbuch – ${String(name).trim()}.json`;
