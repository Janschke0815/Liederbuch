// WebDAV über HTTP: Anmeldung, Ordnerliste (PROPFIND), Dateien lesen, schreiben, löschen.
// Weiß nichts von Liedern – das macht webdav.js. Fehler werden in verständliche Meldungen übersetzt.

import { AuthError, ConflictError } from './sync-engine.js';
import { normalizeText } from '../core/text.js';
import { parsePropfind, PROPFIND_BODY } from '../formats/song-files.js';

const TEXT = 'text/plain; charset=utf-8';
const fileName = (url) => decodeURIComponent(url.split('/').pop());

export class WebdavClient {
  /**
   * @param {{user?: string, password?: string, fetch: typeof fetch, host?: string}} opts
   *   host: nur für Fehlermeldungen („Server … nicht erreichbar“)
   */
  constructor({ user = '', password = '', fetch, host = '' }) {
    this.user = user;
    this.password = password;
    this.fetch = fetch;
    this.host = host;
    this.texts = new Map(); // Adresse -> {etag, text}: Zwischenspeicher, solange sich das ETag nicht ändert
  }

  #headers(extra = {}) {
    const h = { ...extra };
    if (this.user || this.password) {
      const bytes = new TextEncoder().encode(`${this.user}:${this.password}`);
      h.Authorization = 'Basic ' + btoa(String.fromCharCode(...bytes));
    }
    return h;
  }

  /** Eine Anfrage; 401/403 werden zu AuthError, Netzfehler zu einer erklärenden Meldung. */
  async request(method, url, { headers = {}, body } = {}) {
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

  /** Ordnerliste (Name -> {etag, modified}). Fehlt der Ordner: leere Liste mit folderMissing. */
  async list(dirUrl) {
    const res = await this.request('PROPFIND', dirUrl, {
      headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
      body: PROPFIND_BODY,
    });
    if (res.status === 404) return Object.assign(new Map(), { folderMissing: true });
    if (res.status !== 207) {
      throw new Error(`Der Server liefert keine Ordnerliste (PROPFIND, Antwort ${res.status}) – für den Abgleich nötig`);
    }
    return parsePropfind(await res.text(), dirUrl);
  }

  /** Textdatei lesen (Zeilenenden vereinheitlicht). null = gibt es nicht. */
  async text(url, etag) {
    const cached = this.texts.get(url);
    if (cached && etag && cached.etag === etag) return cached.text;
    const res = await this.request('GET', url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Lesen von „${fileName(url)}“`);
    const text = normalizeText(await res.text());
    this.texts.set(url, { etag: etag || res.headers.get('ETag'), text });
    return text;
  }

  /** Was gerade geschrieben wurde, gleich in den Zwischenspeicher (spart das Neuladen). */
  remember(url, etag, text) {
    this.texts.set(url, { etag, text });
  }

  /** Ordner anlegen (vorhandene sind kein Fehler). */
  async ensureFolders(...urls) {
    for (const u of urls) {
      const mk = await this.request('MKCOL', u);
      if (!mk.ok && ![405, 301].includes(mk.status)) throw new Error(`Ordner konnte nicht angelegt werden (${mk.status})`);
    }
  }

  /** PUT; fehlt der Ordner (409), werden folders angelegt und es wird noch einmal versucht. */
  async #putRaw(url, body, headers, folders) {
    const send = () => this.request('PUT', url, { headers: { 'Content-Type': TEXT, ...headers }, body });
    let res = await send();
    if (res.status === 409 && folders.length) {
      await this.ensureFolders(...folders);
      res = await send();
    }
    return res;
  }

  /**
   * Datei schreiben. headers z. B. {'If-Match': etag} oder {'If-None-Match': '*'}.
   * 412 (inzwischen geändert) -> ConflictError. Liefert das neue ETag.
   */
  async put(url, body, headers = {}, folders = []) {
    const res = await this.#putRaw(url, body, headers, folders);
    if (res.status === 412) throw new ConflictError();
    if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern von „${fileName(url)}“`);
    return res.headers.get('ETag');
  }

  /**
   * Neue Datei unter freiem Namen anlegen: „Name.cho“, „Name (2).cho“ … Liegt unter einem Namen
   * schon genau dieser Inhalt, gilt die Datei als geschrieben.
   * @param urlOf  Dateiname -> Adresse
   * @param taken  schon vergebene Namen (klein geschrieben); wird ergänzt
   */
  async putNew(urlOf, base, ext, body, taken, folders = []) {
    for (let i = 0; i < 30; i++) {
      const name = i === 0 ? base + ext : `${base} (${i + 1})${ext}`;
      if (taken.has(name.toLowerCase())) continue;
      const res = await this.#putRaw(urlOf(name), body, { 'If-None-Match': '*' }, folders);
      if (res.ok) return { name, etag: res.headers.get('ETag') };
      if (res.status !== 412) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern von „${name}“`);
      const existing = await this.text(urlOf(name), null);
      if (existing != null && existing === normalizeText(body)) return { name, etag: this.texts.get(urlOf(name))?.etag || null };
      taken.add(name.toLowerCase());
    }
    throw new Error(`Kein freier Dateiname für „${base}“`);
  }

  /** Datei löschen (nur, wenn sie noch das erwartete ETag hat). Fehlt sie schon: auch gut. */
  async delete(url, etag) {
    const d = await this.request('DELETE', url, { headers: etag ? { 'If-Match': etag } : {} });
    if (d.status === 412) throw new ConflictError();
    if (!d.ok && d.status !== 404) throw new Error(`WebDAV-Fehler ${d.status} beim Löschen`);
    this.texts.delete(url);
  }
}
