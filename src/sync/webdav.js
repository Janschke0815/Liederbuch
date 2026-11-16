// Cloud-Anbieter WebDAV (z. B. Nextcloud, ownCloud, Synology, eigener Server).
// Das Liederbuch ist eine JSON-Datei auf dem Server; Änderungen werden über das ETag erkannt:
//   lesen:     GET  mit If-None-Match  -> 304 = unverändert
//   schreiben: PUT  mit If-Match (bzw. If-None-Match: * beim ersten Mal) -> 412 = Konflikt
//
// Der Server muss Anfragen von der Adresse der App erlauben (CORS) und den Kopf "ETag"
// freigeben (Access-Control-Expose-Headers). Ohne ETag funktioniert der Abgleich trotzdem,
// nur ohne Konflikterkennung beim Schreiben (das Zusammenführen gleicht das beim nächsten
// Abgleich wieder aus).

import { AuthError, ConflictError } from './sync-engine.js';
import { toFileJson } from '../core/file-format.js';

export const WEBDAV_FILE = 'Liederbuch.json';

/** Ordner- oder Datei-Adresse -> Adresse der JSON-Datei. */
export function webdavFileUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/\.json$/i.test(u)) return u;
  return u.replace(/\/*$/, '/') + WEBDAV_FILE;
}

/** Ist die Adresse sicher genug für ein Passwort? (https, oder http nur auf diesem Rechner) */
export function webdavUrlProblem(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return 'Bitte eine vollständige Adresse eingeben, z. B. https://cloud.example.de/remote.php/dav/files/NAME/Liederbuch/';
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return null;
  return 'Die Adresse muss mit https:// beginnen, sonst würde das Passwort unverschlüsselt übertragen.';
}

export class WebDavProvider {
  id = 'webdav';
  name = 'WebDAV';

  /** @param {{url: string, user?: string, password?: string, fetch?: typeof fetch}} opts */
  constructor({ url, user = '', password = '', fetch: f = globalThis.fetch?.bind(globalThis) } = {}) {
    this.fileUrl = webdavFileUrl(url);
    this.folderUrl = this.fileUrl.replace(/[^/]*$/, '');
    this.user = user;
    this.password = password;
    this.fetch = f;
    this.signedIn = Boolean(this.fileUrl);
    this.exists = false;
  }

  get host() {
    try {
      return new URL(this.fileUrl).host;
    } catch {
      return '';
    }
  }

  #headers(extra = {}) {
    const h = { ...extra };
    if (this.user || this.password) {
      const bytes = new TextEncoder().encode(`${this.user}:${this.password}`);
      h.Authorization = 'Basic ' + btoa(String.fromCharCode(...bytes));
    }
    return h;
  }

  async #request(method, url, { headers = {}, body } = {}) {
    let res;
    try {
      res = await this.fetch(url, { method, headers: this.#headers(headers), body, cache: 'no-store', credentials: 'omit' });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Offline');
      throw new Error(
        `Server ${this.host} nicht erreichbar – Adresse prüfen. Erreichbar, aber blockiert? ` +
          'Dann erlaubt der Server keine Zugriffe von dieser Seite (CORS, siehe README).',
      );
    }
    if (res.status === 401) throw new AuthError('Benutzername oder Passwort falsch');
    if (res.status === 403) throw new AuthError('Keine Berechtigung für diesen Ordner');
    return res;
  }

  /** Prüft die Verbindung (Ordner bzw. Datei erreichbar, Anmeldung gültig). */
  async signIn() {
    if (!this.fileUrl) throw new Error('Bitte die WebDAV-Adresse eintragen');
    const problem = webdavUrlProblem(this.fileUrl);
    if (problem) throw new Error(problem);
    await this.read(null);
    this.signedIn = true;
  }

  signOut() {
    this.signedIn = false;
  }

  async read(knownVersion) {
    const headers = knownVersion ? { 'If-None-Match': knownVersion } : {};
    const res = await this.#request('GET', this.fileUrl, { headers });
    if (res.status === 304) return { unchanged: true };
    if (res.status === 404) {
      this.exists = false;
      return null;
    }
    if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Lesen`);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Die Datei auf dem Server ist kein gültiges Liederbuch (kein JSON)');
    }
    this.exists = true;
    const version = res.headers.get('ETag');
    // ohne ETag: kein "unverändert" möglich -> jedes Mal vollständig lesen
    return { data, version: version || null };
  }

  async write(data, expectedVersion) {
    const body = toFileJson(data);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (expectedVersion) headers['If-Match'] = expectedVersion;
    else if (!this.exists) headers['If-None-Match'] = '*'; // nur anlegen, nicht überschreiben
    // Datei da, aber Server ohne ETag: ohne Bedingung schreiben
    let res = await this.#request('PUT', this.fileUrl, { headers, body });
    if (res.status === 409 && this.folderUrl) {
      // Ordner fehlt noch: anlegen und noch einmal
      const mk = await this.#request('MKCOL', this.folderUrl);
      if (!mk.ok && mk.status !== 405) throw new Error(`Ordner konnte nicht angelegt werden (${mk.status})`);
      res = await this.#request('PUT', this.fileUrl, { headers, body });
    }
    if (res.status === 412) throw new ConflictError();
    if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern`);
    this.exists = true;
    return res.headers.get('ETag') || null;
  }
}
