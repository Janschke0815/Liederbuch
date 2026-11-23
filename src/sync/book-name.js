// Name eines Liederbuchs mit abgleichen. Er steht als einzelner Datensatz in der Cloud-Datei
// (Schlüssel "book": [{ id: 'name', name, updatedAt }]) und wird wie ein Lied zusammengeführt:
// Die neueste Umbenennung gewinnt.
//
// Wurde der Name nie bewusst gewählt (persönliches Buch mit Standardnamen „Mein Liederbuch“), gibt es
// keinen Datensatz – dann übernimmt das Gerät den Namen aus der Cloud. Ein Name, der schon vor dieser
// Version gewählt wurde, zählt mit der ältestmöglichen Zeit: Er gewinnt gegen den Standardnamen,
// verliert aber gegen jede spätere Umbenennung.

import { bookKey, PERSONAL, personalBookName, renameBook, fileNameForBook } from '../books.js';
import { PERSONAL_FILE } from './google-drive.js';

const KEY = 'book.name';
const EPOCH = '1970-01-01T00:00:00.000Z';

/** Datensatz für die Cloud-Datei. */
export const slimName = (r) => ({ id: 'name', name: String(r?.name || '').trim(), updatedAt: r?.updatedAt || EPOCH });

/**
 * Eigener Namens-Datensatz eines Liederbuchs auf diesem Gerät (oder null beim Standardnamen).
 * @param {{id: string, name: string}} book
 */
export function nameRecord(book, storage = localStorage) {
  try {
    const r = JSON.parse(storage.getItem(bookKey(book, KEY)) || 'null');
    if (r?.name) return slimName(r);
  } catch {
    /* kaputter Eintrag: wie keiner */
  }
  const chosen = book.id === PERSONAL.id ? personalBookName(storage) !== PERSONAL.name && personalBookName(storage) : book.name;
  return chosen ? slimName({ name: chosen }) : null;
}

/**
 * Dateiname in Google Drive zum Namen: persönliches Buch mit Standardnamen „Liederbuch.json“,
 * sonst „Liederbuch – Name.json“.
 */
export function driveFileName(book, name) {
  return book.id === PERSONAL.id && name === PERSONAL.name ? PERSONAL_FILE : fileNameForBook(name);
}

/**
 * Sammlung „book“ für den Abgleich (wie SongRepository: allRecords, applyRemote, Ereignis „change“).
 * Ereignis „remote-name“ (detail: neuer Name), wenn ein anderes Gerät umbenannt hat.
 */
export class BookNameStore extends EventTarget {
  /** @param {{id: string, name: string}} book  das geöffnete Liederbuch (sein name wird mitgeführt) */
  constructor(book, storage = localStorage) {
    super();
    this.book = book;
    this.storage = storage;
  }

  /** @returns {Promise<object[]>} */
  async allRecords() {
    const r = nameRecord(this.book, this.storage);
    return r ? [r] : [];
  }

  /** Name von einem anderen Gerät übernehmen. */
  async applyRemote(records) {
    const r = records.find((x) => x?.id === 'name' && String(x.name || '').trim());
    if (!r) return;
    const rec = slimName(r);
    this.storage.setItem(bookKey(this.book, KEY), JSON.stringify(rec));
    if (rec.name === this.book.name) return;
    renameBook(this.book.id, rec.name, this.storage);
    this.book.name = rec.name;
    this.dispatchEvent(new CustomEvent('remote-name', { detail: rec.name }));
  }

  /**
   * Auf diesem Gerät umbenannt: Datensatz mit jetziger Zeit, Abgleich anstoßen.
   * @param {string} name
   */
  renamed(name, now = new Date().toISOString()) {
    this.storage.setItem(bookKey(this.book, KEY), JSON.stringify(slimName({ name, updatedAt: now })));
    this.dispatchEvent(new Event('change'));
  }
}

/** Umbenennen eines Buchs, das gerade nicht geöffnet ist: nur den Datensatz merken (geht beim nächsten Öffnen mit). */
export function rememberRename(book, name, storage = localStorage, now = new Date().toISOString()) {
  storage.setItem(bookKey(book, KEY), JSON.stringify(slimName({ name, updatedAt: now })));
}
