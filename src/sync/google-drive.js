// Cloud-Anbieter Google Drive: jedes Liederbuch ist eine JSON-Datei in Drive.
//   persönlich:  "Liederbuch.json" im eigenen Drive (wird gesucht bzw. angelegt)
//   gemeinsam:   "Liederbuch – <Name>.json", per Drive mit anderen geteilt
//
// Anmeldung über Google Identity Services (nur im Browser, kein eigener Server nötig).
// Berechtigung "drive.file": die App sieht ausschließlich Dateien, die sie selbst angelegt
// hat oder die man ihr über die Google-Dateiauswahl (Picker) gibt – nicht den Rest des Drives.

import { AuthError, ConflictError } from './sync-engine.js';
import { toFileJson } from '../core/file-format.js';

const GIS_URL = 'https://accounts.google.com/gsi/client';
const GAPI_URL = 'https://apis.google.com/js/api.js';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const PERSONAL_FILE = 'Liederbuch.json';
const MARK_KEY = 'liederbuch';
const MARK_PERSONAL = 'sync';
const MARK_SHARED = 'shared';

const scripts = new Map();
function loadScript(src) {
  if (!scripts.has(src)) {
    scripts.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scripts.delete(src);
        reject(new Error('Google-Dienst konnte nicht geladen werden (offline?)'));
      };
      document.head.append(s);
    }));
  }
  return scripts.get(src);
}

export class NoAccessError extends Error {
  constructor() {
    super('Kein Zugriff mehr auf dieses gemeinsame Liederbuch (gelöscht oder Freigabe entfernt)');
    this.name = 'NoAccessError';
  }
}

export class GoogleDriveProvider {
  id = 'gdrive';
  name = 'Google Drive';

  /**
   * @param {{clientId: string, apiKey?: string, appId?: string,
   *          book?: {shared: boolean, fileId: string|null}, storage?: Storage}} opts
   */
  constructor({ clientId, apiKey = '', appId = '', book = { shared: false, fileId: null }, storage = localStorage } = {}) {
    this.clientId = clientId;
    this.apiKey = apiKey;
    this.appId = appId;
    this.shared = Boolean(book.shared);
    this.storage = storage;
    this.fileId = this.shared ? book.fileId : storage.getItem('gdrive.fileId') || null;
  }

  // ---------- Anmeldung ----------

  token() {
    try {
      const t = JSON.parse(this.storage.getItem('gdrive.token') || 'null');
      if (t && t.expiresAt - 60_000 > Date.now()) return t.accessToken;
    } catch {
      /* ungültig */
    }
    return null;
  }

  get signedIn() {
    return Boolean(this.token());
  }

  /**
   * Holt einen Zugangsschlüssel. Muss aus einem Klick heraus aufgerufen werden, weil Google
   * dafür ein kleines Fenster öffnet. silent: ohne Rückfrage, wenn schon einmal erlaubt.
   */
  async signIn({ silent = false } = {}) {
    if (!this.clientId) throw new Error('Keine Google-Client-ID eingetragen');
    await loadScript(GIS_URL);
    const resp = await new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: SCOPE,
        callback: (r) => (r.error ? reject(new AuthError(r.error_description || r.error)) : resolve(r)),
        error_callback: (e) => reject(new AuthError(e.type === 'popup_closed' ? 'Anmeldung abgebrochen' : e.message || e.type)),
      });
      client.requestAccessToken({ prompt: silent ? 'none' : '' });
    });
    if (!google.accounts.oauth2.hasGrantedAllScopes(resp, SCOPE)) {
      throw new AuthError('Zugriff auf Google Drive wurde nicht erlaubt');
    }
    this.storage.setItem('gdrive.token', JSON.stringify({
      accessToken: resp.access_token,
      expiresAt: Date.now() + Number(resp.expires_in || 3600) * 1000,
    }));
  }

  /** Abmelden; die Dateien in Drive bleiben erhalten. */
  signOut() {
    const token = this.token();
    if (token && globalThis.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
    this.storage.removeItem('gdrive.token');
    this.storage.removeItem('gdrive.fileId');
    if (!this.shared) this.fileId = null;
  }

  // ---------- Drive-Zugriffe ----------

  async #api(url, opts = {}) {
    const token = this.token();
    if (!token) throw new AuthError('Google-Anmeldung abgelaufen');
    const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } });
    if (res.status === 401) {
      this.storage.removeItem('gdrive.token');
      throw new AuthError('Google-Anmeldung abgelaufen');
    }
    return res;
  }

  async #json(url, opts) {
    const res = await this.#api(url, opts);
    if (!res.ok) {
      let msg = '';
      try {
        msg = (await res.json()).error?.message || '';
      } catch {
        /* kein JSON */
      }
      throw new Error(`Google Drive meldet Fehler ${res.status}${msg ? `: ${msg}` : ''}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async #findFile() {
    if (this.fileId || this.shared) return this.fileId;
    const q = `name='${PERSONAL_FILE}' and 'me' in owners and trashed=false and appProperties has { key='${MARK_KEY}' and value='${MARK_PERSONAL}' }`;
    const r = await this.#json(`${API}?spaces=drive&orderBy=createdTime&fields=files(id)&q=${encodeURIComponent(q)}`);
    this.fileId = r.files?.[0]?.id || null;
    if (this.fileId) this.storage.setItem('gdrive.fileId', this.fileId);
    return this.fileId;
  }

  /** Version der Datei oder null, wenn sie fehlt/im Papierkorb ist. */
  async #version() {
    const res = await this.#api(`${API}/${this.fileId}?fields=version,trashed`);
    if (res.status === 404 || res.status === 403) return null;
    if (!res.ok) throw new Error(`Google Drive meldet Fehler ${res.status}`);
    const meta = await res.json();
    return meta.trashed ? null : meta.version;
  }

  #forget() {
    if (this.shared) throw new NoAccessError();
    this.fileId = null;
    this.storage.removeItem('gdrive.fileId');
  }

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

  async write(data, expectedVersion) {
    if (!(await this.#findFile())) {
      if (this.shared) throw new NoAccessError();
      if (expectedVersion) throw new ConflictError();
      const r = await this.#create(PERSONAL_FILE, MARK_PERSONAL, data);
      this.fileId = r.id;
      this.storage.setItem('gdrive.fileId', r.id);
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

  // ---------- Gemeinsame Liederbücher ----------

  /** Neue gemeinsame Datei anlegen. @returns {Promise<{id, name}>} */
  async createShared(fileName, data) {
    const r = await this.#create(fileName, MARK_SHARED, data);
    return { id: r.id, name: r.name };
  }

  /** Name, eigene Rechte und Besitzer der aktuellen Datei. */
  async info() {
    if (!(await this.#findFile())) return null;
    return this.#json(`${API}/${this.fileId}?fields=name,ownedByMe,owners(displayName,emailAddress),capabilities(canShare,canEdit)`);
  }

  async members() {
    if (!(await this.#findFile())) return [];
    const r = await this.#json(`${API}/${this.fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`);
    return (r.permissions || []).filter((p) => p.type === 'user');
  }

  /** Person einladen (darf bearbeiten); Google verschickt die Einladungs-Mail. */
  async invite(email, message) {
    if (!(await this.#findFile())) throw new Error('Das Liederbuch wurde noch nicht in Drive gespeichert');
    const params = new URLSearchParams({ sendNotificationEmail: 'true', emailMessage: message, fields: 'id' });
    return this.#json(`${API}/${this.fileId}/permissions?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email }),
    });
  }

  async removeMember(permissionId) {
    await this.#json(`${API}/${this.fileId}/permissions/${permissionId}`, { method: 'DELETE' });
  }

  /**
   * Google-Dateiauswahl für Liederbücher, die mit mir geteilt wurden.
   * Erst durch die Auswahl darf die App (Berechtigung drive.file) die Datei öffnen.
   * @returns {Promise<{id, name} | null>}
   */
  async pickShared() {
    if (!this.apiKey || !this.appId) {
      throw new Error('Für „Gemeinsames Liederbuch öffnen“ fehlen API-Schlüssel und Projektnummer (Einrichtung)');
    }
    const token = this.token();
    if (!token) throw new AuthError('Bitte zuerst mit Google verbinden');
    await loadScript(GAPI_URL);
    await new Promise((resolve, reject) => gapi.load('picker', { callback: resolve, onerror: reject }));
    return new Promise((resolve) => {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes('application/json')
        .setOwnedByMe(false)
        .setMode(google.picker.DocsViewMode.LIST);
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(this.apiKey)
        .setAppId(this.appId)
        .setLocale('de')
        .setTitle('Gemeinsames Liederbuch wählen')
        .setCallback((d) => {
          if (d.action === google.picker.Action.PICKED) {
            const f = d.docs[0];
            resolve({ id: f.id, name: f.name });
          } else if (d.action === google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();
      picker.setVisible(true);
    });
  }
}
