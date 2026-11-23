// Mehrere Liederbücher auf einem Gerät. Jedes hat eine eigene lokale Datenbank.
//
//   persönlich (immer da):  PERSONAL – Speicherort und Anmeldung wie vor 2.2 (globale Schlüssel)
//   eigenes Liederbuch:      { id: 'book-…', name, dbName, own: true, file }
//                            eigener Speicherort und eigenes Konto (Schlüssel mit „:<id>“, siehe bookKey);
//                            file: Dateiname in Google Drive bzw. Dropbox („Liederbuch – Name.json“)
//   geteilt (Drive):         { id: 'shared-…', name, dbName, shared, fileId, readOnly?, ownAuth? }
//                            readOnly: nur Leserechte; ownAuth: eigene Google-Anmeldung (ab 2.2)
//   abonniert (nur lesen):   { id: 'abo-…', name, dbName, abo: { url, publisher, user, password } }

export const PERSONAL = Object.freeze({
  id: 'personal',
  name: 'Mein Liederbuch',
  dbName: 'liederbuch',
  shared: false,
  fileId: null,
});

const KEY = 'books';
const ACTIVE = 'activeBook';
const PERSONAL_NAME = 'personalName'; // eigener Name für das persönliche Liederbuch (ab 2.2.4)

function read(storage) {
  try {
    const list = JSON.parse(storage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((b) => b && typeof b.id === 'string' && (b.fileId || b.abo?.url || b.own)) : [];
  } catch {
    return [];
  }
}

/** Das persönliche Liederbuch, mit eigenem Namen, falls umbenannt. */
function personal(storage) {
  const name = storage.getItem(PERSONAL_NAME);
  return name ? { ...PERSONAL, name } : { ...PERSONAL }; // Kopie: die Vorlage bleibt unveränderlich
}

/** Name des persönlichen Liederbuchs (Standard „Mein Liederbuch“, umbenennbar). */
export const personalBookName = (storage = localStorage) => personal(storage).name;

/** Alle Liederbücher, das persönliche zuerst. */
export function listBooks(storage = localStorage) {
  return [personal(storage), ...read(storage)];
}

/** Liederbuch mit dieser ID oder null. */
export function getBook(id, storage = localStorage) {
  return listBooks(storage).find((b) => b.id === id) || null;
}

/** Das Liederbuch, das gerade geöffnet ist (sonst das persönliche). */
export function activeBook(storage = localStorage) {
  return getBook(storage.getItem(ACTIVE), storage) || personal(storage);
}

/** Liederbuch für den nächsten Start merken (nur bekannte IDs). */
export function setActiveBook(id, storage = localStorage) {
  if (getBook(id, storage)) storage.setItem(ACTIVE, id);
}

/**
 * Gemeinsames Liederbuch eintragen (oder Namen/Rechte aktualisieren).
 * @param {{fileId: string, name?: string, readOnly?: boolean}} entry  readOnly: nur Leserechte
 */
export function addSharedBook({ fileId, name, readOnly = false, ownAuth }, storage = localStorage) {
  const list = read(storage);
  const id = `shared-${fileId}`;
  const book = { id, name: name || 'Gemeinsames Liederbuch', dbName: `liederbuch-${fileId}`, shared: true, fileId };
  if (readOnly) book.readOnly = true;
  // eigene Anmeldung behalten, wenn das Buch schon eine hatte (Rechte ändern sich, Konto nicht)
  if (ownAuth ?? list.find((b) => b.id === id)?.ownAuth) book.ownAuth = true;
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

/**
 * Eigenes Liederbuch anlegen (lokal; Speicherort und Konto wählt man danach im Cloud-Dialog).
 * @param {{name: string}} entry
 * @returns {object} das neue Buch
 */
export function addBook({ name }, storage = localStorage) {
  const list = read(storage);
  const clean = String(name || '').trim() || 'Liederbuch';
  const rand = [...crypto.getRandomValues(new Uint8Array(5))].map((b) => b.toString(36).padStart(2, '0')).join('');
  const id = `book-${rand}`;
  const book = { id, name: clean, dbName: `liederbuch-${id}`, own: true, file: fileNameForBook(clean) };
  list.push(book);
  storage.setItem(KEY, JSON.stringify(list));
  return book;
}

/**
 * Liederbuch umbenennen (nur der Name in der App; Dateien in der Cloud behalten ihren Namen).
 * Abos lassen sich nicht umbenennen (der Name kommt vom Herausgeber).
 * @returns {boolean} umbenannt
 */
export function renameBook(id, name, storage = localStorage) {
  const clean = String(name || '').trim();
  if (id === PERSONAL.id) {
    if (!clean) return false;
    if (clean === PERSONAL.name) storage.removeItem(PERSONAL_NAME);
    else storage.setItem(PERSONAL_NAME, clean);
    return true;
  }
  const list = read(storage);
  const b = list.find((x) => x.id === id);
  if (!b || !clean || b.abo) return false;
  b.name = clean;
  storage.setItem(KEY, JSON.stringify(list));
  return true;
}

/**
 * Schlüssel für eine Einstellung eines Liederbuchs (Speicherort, Zugangsdaten, Anmeldung).
 * Das persönliche Liederbuch nutzt die alten, globalen Schlüssel (keine Umstellung nötig), vor 2.2
 * geteilte Bücher die globale Google-Anmeldung; alles andere ist je Buch getrennt: „webdav.url:book-abc“.
 * (So überschreibt z. B. ein geteiltes Buch nie den Speicherort des persönlichen.)
 */
export function bookKey(book, base) {
  const global = !book || book.id === PERSONAL.id
    || (book.shared && !book.ownAuth && (base === 'gdrive.token' || base === 'gdrive.account'));
  return global ? base : `${base}:${book.id}`;
}

/** Einstellungen, die bookKey pro Liederbuch trennt. */
export const BOOK_KEYS = Object.freeze([
  'sync.kind', 'sync.provider', 'webdav.url', 'webdav.user', 'webdav.pass',
  'gdrive.token', 'gdrive.account', 'gdrive.fileId', 'dropbox.token', 'book.name',
]);

/** Aus der Liste entfernen (samt eigener Einstellungen); die lokale Datenbank löscht der Aufrufer. */
export function removeBook(id, storage = localStorage) {
  const book = read(storage).find((b) => b.id === id);
  storage.setItem(KEY, JSON.stringify(read(storage).filter((b) => b.id !== id)));
  if (storage.getItem(ACTIVE) === id) storage.removeItem(ACTIVE);
  if (book) for (const k of BOOK_KEYS) if (bookKey(book, k) !== k) storage.removeItem(bookKey(book, k));
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
export const fileNameForBook = (name) => `Liederbuch – ${String(name).trim().replace(/[\\/:*?"<>|]+/g, '-')}.json`;
