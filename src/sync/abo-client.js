// Abo-Datei vom Server laden – mit Anmeldung, falls der Ordner geschützt ist, und nur, wenn sie sich
// seit dem letzten Mal geändert hat (ETag). Kein Bildschirm; die Oberfläche steht in ui/abo.js.

import { parseAbo } from '../formats/abo.js';
import { AuthError } from './sync-engine.js';
import { WebdavClient } from './webdav-client.js';

/** Fehler: Der Ordner verlangt eine Anmeldung (oder sie stimmt nicht). */
export class LoginNeeded extends Error {}

/**
 * Abo-Datei laden.
 * @param {string} url
 * @param {{user?: string, password?: string, etag?: string}} [opts]  etag: zuletzt geladener Stand
 * @returns {Promise<{unchanged: true} | {data: object, etag: string|null}>}
 * @throws {LoginNeeded} wenn eine (andere) Anmeldung nötig ist
 */
export async function fetchAbo(url, { user = '', password = '', etag = '' } = {}) {
  let host = '';
  try {
    host = new URL(url).host;
  } catch {
    throw new Error('Die Adresse des Abos ist ungültig');
  }
  const client = new WebdavClient({ user, password, fetch: (...a) => globalThis.fetch(...a), host });
  let res;
  try {
    res = await client.request('GET', url, { headers: etag ? { 'If-None-Match': etag } : {} });
  } catch (err) {
    if (err instanceof AuthError) throw new LoginNeeded(user ? 'Benutzername oder Passwort stimmt nicht' : 'Dieser Ordner verlangt eine Anmeldung');
    throw err;
  }
  if (res.status === 304) return { unchanged: true };
  if (res.status === 404) throw new Error('Unter dieser Adresse liegt (noch) kein Abo – wurde es schon veröffentlicht?');
  if (!res.ok) throw new Error(`Das Abo konnte nicht geladen werden (Antwort ${res.status})`);
  return { data: parseAbo(await res.text()), etag: res.headers.get('ETag') };
}
