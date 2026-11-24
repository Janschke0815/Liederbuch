// Wo ein Liederbuch abgeglichen wird: die gespeicherten Einstellungen je Buch (Schlüssel über bookKey,
// siehe books.js). Gemeinsam genutzt vom Cloud-Dialog (sync-ui.js) und den Liederbüchern (books-ui.js).

import { bookKey } from '../books.js';

/**
 * Speicherort eines Liederbuchs. Geteilte Liederbücher laufen immer über Google Drive, alle anderen
 * wahlweise über Dropbox oder WebDAV.
 * @param {object} b  Liederbuch (aus listBooks())
 * @returns {'gdrive'|'dropbox'|'webdav'}
 */
export function syncKindOf(b, storage = localStorage) {
  const k = storage.getItem(bookKey(b, 'sync.kind'));
  return b.shared || !['webdav', 'dropbox'].includes(k) ? 'gdrive' : k;
}

/**
 * Gespeicherte WebDAV-Zugangsdaten eines Liederbuchs.
 * @returns {{url: string, user: string, password: string}}
 */
export function webdavOf(b, storage = localStorage) {
  return {
    url: storage.getItem(bookKey(b, 'webdav.url')) || '',
    user: storage.getItem(bookKey(b, 'webdav.user')) || '',
    password: storage.getItem(bookKey(b, 'webdav.pass')) || '',
  };
}

/** Womit das Buch zuletzt verbunden wurde ('gdrive', 'dropbox', 'webdav') oder null. */
export const connectedVia = (b, storage = localStorage) => storage.getItem(bookKey(b, 'sync.provider'));
