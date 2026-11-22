// Speicherschicht Google Drive: jedes Liederbuch ist eine JSON-Datei in Drive (Format liederbuch-sync).
//   eigen:       "Liederbuch.json" (persönliches Liederbuch) bzw. "Liederbuch – <Name>.json" (weitere
//                eigene Bücher) im eigenen Drive – wird gesucht bzw. angelegt; teilen geht trotzdem
//   gemeinsam:   Datei eines anderen (oder vor 2.2 angelegt), fest über ihre ID verbunden
//
// Hier stehen nur die Drive-Zugriffe. Die Anmeldung kommt von außen (auth, siehe google-auth.js) –
// so lässt sich die Speicherung austauschen und mit einer Attrappe testen.
//
// Rechte: Wer eine Datei nur lesen darf (Drive-Freigabe „Betrachter“), dem verweigert Google das
// Schreiben – unabhängig davon, was die App anzeigt. role() fragt die eigenen Rechte ab, die App
// schaltet das Liederbuch dann auf „nur lesen“.
//
// Berechtigung "drive.file": Die App sieht ausschließlich Dateien, die sie selbst angelegt hat oder
// die man ihr über die Google-Dateiauswahl (Picker) gibt – nicht den Rest des Drives.

import { AuthError, ConflictError, ReadOnlyError } from './sync-engine.js';
import { loadScript } from './google-auth.js';
import { toFileJson } from '../formats/file-format.js';

const GAPI_URL = 'https://apis.google.com/js/api.js';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
export const PERSONAL_FILE = 'Liederbuch.json';
const MARK_KEY = 'liederbuch';
const MARK_PERSONAL = 'sync';
const MARK_SHARED = 'shared';

/** Fehler: Auf ein gemeinsames Liederbuch gibt es keinen Zugriff mehr (gelöscht oder Freigabe entfernt). */
export class NoAccessError extends Error {
  constructor() {
    super('Kein Zugriff mehr auf dieses gemeinsame Liederbuch (gelöscht oder Freigabe entfernt)');
    this.name = 'NoAccessError';
  }
}

/** Grund eines Drive-Fehlers (z. B. insufficientFilePermissions) und Meldung. */
async function driveError(res) {
  try {
    const e = (await res.clone().json()).error || {};
    return { reason: e.errors?.[0]?.reason || e.status || '', message: e.message || '' };
  } catch {
    return { reason: '', message: '' };
  }
}

/** Speicherschicht Google Drive: eine JSON-Datei pro Liederbuch, Teilen über Drive-Freigaben. */
export class GoogleDriveProvider {
  id = 'gdrive';
  name = 'Google Drive';

  /**
   * @param {{auth: import('./google-auth.js').GoogleAuth, apiKey?: string, appId?: string,
   *          book?: {shared?: boolean, fileId?: string|null, readOnly?: boolean},
   *          storage?: Storage, fetch?: typeof fetch, fileName?: string, fileIdKey?: string}} opts
   *   apiKey/appId: nur für die Google-Dateiauswahl (Einladung öffnen); nicht geheim
   *   fileName/fileIdKey: eigene Datei dieses Liederbuchs und wo ihre ID gemerkt wird
   */
  constructor({
    auth, apiKey = '', appId = '', book = { shared: false, fileId: null },
    storage = globalThis.localStorage, fetch: f = globalThis.fetch?.bind(globalThis),
    fileName = PERSONAL_FILE, fileIdKey = 'gdrive.fileId',
  } = {}) {
    this.fileName = fileName;
    this.fileIdKey = fileIdKey;
    this.auth = auth;
    this.apiKey = apiKey;
    this.appId = appId;
    this.shared = Boolean(book.shared);
    this.readOnly = Boolean(book.readOnly);
    this.storage = storage;
    this.fetch = f;
    this.fileId = this.shared ? book.fileId : storage.getItem(fileIdKey) || null;
  }

  // ---------- Anmeldung (weitergereicht) ----------

  /** Gibt es ein gültiges Zugangstoken? */
  get signedIn() {
    return this.auth.signedIn;
  }

  /** Anmelden (kleines Google-Fenster, siehe GoogleAuth.signIn). */
  signIn(opts) {
    return this.auth.signIn(opts);
  }

  /** Abmelden; die Dateien in Drive bleiben erhalten. */
  signOut() {
    this.auth.signOut();
    this.storage.removeItem(this.fileIdKey);
    if (!this.shared) this.fileId = null;
  }

  // ---------- Drive-Zugriffe ----------

  async #api(url, opts = {}) {
    const token = this.auth.token();
    if (!token) throw new AuthError('Die Google-Anmeldung ist abgelaufen – bitte neu anmelden');
    let res;
    try {
      res = await this.fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } });
    } catch {
      throw new Error('Google Drive nicht erreichbar (offline?)');
    }
    if (res.status === 401) {
      this.auth.expire();
      throw new AuthError('Die Google-Anmeldung ist abgelaufen oder wurde widerrufen – bitte neu anmelden');
    }
    return res;
  }

  async #fail(res) {
    const { reason, message } = await driveError(res);
    if (res.status === 403 && /insufficientFilePermissions|forbidden/i.test(reason)) throw new ReadOnlyError();
    if (/storageQuotaExceeded/.test(reason)) throw new Error('Dein Google-Speicher ist voll');
    if (res.status === 429 || /rateLimitExceeded|userRateLimitExceeded/.test(reason)) {
      throw new Error('Google Drive: zu viele Anfragen, gleich noch einmal');
    }
    throw new Error(`Google Drive meldet Fehler ${res.status}${message ? `: ${message}` : ''}`);
  }

  async #json(url, opts) {
    const res = await this.#api(url, opts);
    if (!res.ok) await this.#fail(res);
    return res.status === 204 ? null : res.json();
  }

  async #findFile() {
    if (this.fileId || this.shared) return this.fileId;
    const name = this.fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = `name='${name}' and 'me' in owners and trashed=false and appProperties has { key='${MARK_KEY}' and value='${MARK_PERSONAL}' }`;
    const r = await this.#json(`${API}?spaces=drive&orderBy=createdTime&fields=files(id)&q=${encodeURIComponent(q)}`);
    this.fileId = r.files?.[0]?.id || null;
    if (this.fileId) this.storage.setItem(this.fileIdKey, this.fileId);
    return this.fileId;
  }

  /** Version der Datei oder null, wenn sie fehlt/im Papierkorb ist/kein Zugriff besteht. */
  async #version() {
    const res = await this.#api(`${API}/${this.fileId}?fields=version,trashed`);
    if (res.status === 404 || res.status === 403) return null;
    if (!res.ok) await this.#fail(res);
    const meta = await res.json();
    return meta.trashed ? null : meta.version;
  }

  #forget() {
    if (this.shared) throw new NoAccessError();
    this.fileId = null;
    this.storage.removeItem(this.fileIdKey);
  }

  /**
   * Liederbuch aus Drive lesen.
   * @param {string} [knownVersion]  zuletzt gelesene Version – ist sie gleich, wird nichts geladen
   * @returns {Promise<null | {unchanged: true} | {data: object, version: string}>}
   */
  async read(knownVersion) {
    if (!(await this.#findFile())) return null;
    const version = await this.#version();
    if (version === null) {
      this.#forget();
      return this.read(null);
    }
    if (knownVersion && version === knownVersion) return { unchanged: true };
    const data = await this.#json(`${API}/${this.fileId}?alt=media`);
    return { data, version };
  }

  async #create(name, mark, data) {
    const meta = { name, mimeType: 'application/json', appProperties: { [MARK_KEY]: mark } };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([toFileJson(data)], { type: 'application/json' }));
    return this.#json(`${UPLOAD}?uploadType=multipart&fields=id,version,name`, { method: 'POST', body: form });
  }

  /**
   * Liederbuch nach Drive schreiben – nur, wenn die Datei noch die erwartete Version hat
   * (sonst ConflictError: neu lesen und zusammenführen; ein veralteter Stand überschreibt nie
   * einen neueren). Mit Leserechten: ReadOnlyError.
   * @returns {Promise<string>} neue Version
   */
  async write(data, expectedVersion) {
    if (this.readOnly) throw new ReadOnlyError();
    if (!(await this.#findFile())) {
      if (this.shared) throw new NoAccessError();
      if (expectedVersion) throw new ConflictError();
      const r = await this.#create(this.fileName, MARK_PERSONAL, data);
      this.fileId = r.id;
      this.storage.setItem(this.fileIdKey, r.id);
      return r.version;
    }
    const current = await this.#version();
    if (current === null) {
      this.#forget();
      throw new ConflictError();
    }
    if (current !== expectedVersion) throw new ConflictError();
    const r = await this.#json(`${UPLOAD}/${this.fileId}?uploadType=media&fields=version`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: toFileJson(data),
    });
    return r.version;
  }

  // ---------- Rechte und Teilen ----------

  /** Neue gemeinsame Datei anlegen. @returns {Promise<{id, name}>} */
  async createShared(fileName, data) {
    const r = await this.#create(fileName, MARK_SHARED, data);
    return { id: r.id, name: r.name };
  }

  /** Name, eigene Rechte und Besitzer der aktuellen Datei (null, wenn es noch keine gibt). */
  async info() {
    if (!(await this.#findFile())) return null;
    return this.#json(`${API}/${this.fileId}?fields=id,name,ownedByMe,owners(displayName,emailAddress),capabilities(canShare,canEdit)`);
  }

  /**
   * Eigene Rolle für die aktuelle Datei: 'owner' | 'writer' | 'reader' | null (keine Datei).
   * Google setzt sie beim Schreiben selbst durch; die App richtet danach nur die Anzeige.
   */
  async role() {
    const i = await this.info();
    if (!i) return null;
    if (i.ownedByMe) return 'owner';
    return i.capabilities?.canEdit ? 'writer' : 'reader';
  }

  /**
   * Wer Zugriff auf das Liederbuch hat.
   * @returns {Promise<{id: string, emailAddress: string, displayName: string, role: string}[]>}
   */
  async members() {
    if (!(await this.#findFile())) return [];
    const r = await this.#json(`${API}/${this.fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`);
    return (r.permissions || []).filter((p) => p.type === 'user');
  }

  /**
   * Person per E-Mail einladen; Google verschickt die Einladung (mit message und dem Link zur Datei).
   * @param {string} email
   * @param {string} message
   * @param {'reader'|'writer'} [role='reader']  reader: nur lesen (Abonnent), writer: darf bearbeiten
   */
  async invite(email, message, role = 'reader') {
    if (!(await this.#findFile())) throw new Error('Das Liederbuch wurde noch nicht in Drive gespeichert');
    const params = new URLSearchParams({ sendNotificationEmail: 'true', emailMessage: message, fields: 'id' });
    return this.#json(`${API}/${this.fileId}/permissions?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', role: role === 'writer' ? 'writer' : 'reader', emailAddress: email }),
    });
  }

  /** Rechte einer Person ändern ('reader' oder 'writer'). */
  async setMemberRole(permissionId, role) {
    await this.#json(`${API}/${this.fileId}/permissions/${permissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role === 'writer' ? 'writer' : 'reader' }),
    });
  }

  /** Zugriff einer Person entfernen. */
  async removeMember(permissionId) {
    await this.#json(`${API}/${this.fileId}/permissions/${permissionId}`, { method: 'DELETE' });
  }

  /**
   * Google-Dateiauswahl für Liederbücher, die mit mir geteilt wurden.
   * Erst durch die Auswahl darf die App (Berechtigung drive.file) die Datei öffnen.
   * @param {{fileId?: string}} [opts]  fileId: genau diese Datei vorauswählen (aus dem Einladungslink)
   * @returns {Promise<{id, name} | null>}
   */
  async pickShared({ fileId = '' } = {}) {
    if (!this.apiKey || !this.appId) {
      throw new Error('Für „Einladung öffnen“ fehlen API-Schlüssel und Projektnummer (Einrichtung)');
    }
    const token = this.auth.token();
    if (!token) throw new AuthError('Bitte zuerst bei Google anmelden');
    await loadScript(GAPI_URL);
    await new Promise((resolve, reject) => gapi.load('picker', { callback: resolve, onerror: reject }));
    return new Promise((resolve) => {
      let picker = null;
      let closeBtn = null;
      const finish = (result) => {
        closeBtn?.remove();
        removeEventListener('keydown', onKey, true);
        try {
          picker?.setVisible(false);
          picker?.dispose();
        } catch {
          /* schon zu */
        }
        resolve(result);
      };
      const onKey = (e) => e.key === 'Escape' && finish(null);
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('application/json')
        .setMode(google.picker.DocsViewMode.LIST);
      if (fileId) view.setFileIds(fileId);
      else view.setOwnedByMe(false);
      picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(this.apiKey)
        .setAppId(this.appId)
        .setLocale('de')
        .setTitle(fileId ? 'Liederbuch bestätigen' : 'Gemeinsames Liederbuch wählen')
        .setCallback((d) => {
          if (d.action === google.picker.Action.PICKED) {
            const f = d.docs[0];
            finish({ id: f.id, name: f.name });
          } else if (d.action === google.picker.Action.CANCEL) {
            finish(null);
          }
        })
        .build();
      picker.setVisible(true);
      // Zeigt die Google-Auswahl einen Fehler (z. B. „API-Entwicklerschlüssel ist ungültig“), hat sie
      // keinen eigenen Knopf zum Schließen – daher ein eigener, der immer darüber liegt (auch Esc).
      closeBtn = Object.assign(document.createElement('button'), {
        type: 'button', className: 'picker-close', textContent: '✕ Schließen', title: 'Google-Dateiauswahl schließen (Esc)',
      });
      closeBtn.onclick = () => finish(null);
      document.body.append(closeBtn);
      addEventListener('keydown', onKey, true);
    });
  }
}
