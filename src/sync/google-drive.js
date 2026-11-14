// Cloud-Anbieter Google Drive: eine Datei "Liederbuch.json" in deinem Drive.
//
// Anmeldung über Google Identity Services (nur im Browser, kein eigener Server nötig).
// Berechtigung "drive.file": die App sieht ausschließlich Dateien, die sie selbst angelegt
// hat – nicht den Rest deines Drives.

import { AuthError, ConflictError } from './sync-engine.js';

const GIS_URL = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FILE_NAME = 'Liederbuch.json';
const MARK = { key: 'liederbuch', value: 'sync' };

let gisPromise = null;
function loadGis() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  gisPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisPromise = null;
      reject(new Error('Google-Anmeldung konnte nicht geladen werden (offline?)'));
    };
    document.head.append(s);
  });
  return gisPromise;
}

export class GoogleDriveProvider {
  id = 'gdrive';
  name = 'Google Drive';

  constructor({ clientId, storage = localStorage } = {}) {
    this.clientId = clientId;
    this.storage = storage;
    this.fileId = storage.getItem('gdrive.fileId') || null;
  }

  // ---------- Anmeldung ----------

  #token() {
    try {
      const t = JSON.parse(this.storage.getItem('gdrive.token') || 'null');
      if (t && t.expiresAt - 60_000 > Date.now()) return t.accessToken;
    } catch {
      /* ungültig */
    }
    return null;
  }

  get signedIn() {
    return Boolean(this.#token());
  }

  /**
   * Holt einen Zugangsschlüssel. Muss aus einem Klick heraus aufgerufen werden, weil Google
   * dafür ein kleines Fenster öffnet. silent: ohne Rückfrage, wenn schon einmal erlaubt.
   */
  async signIn({ silent = false } = {}) {
    if (!this.clientId) throw new Error('Keine Google-Client-ID eingetragen');
    await loadGis();
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

  /** Abmelden; die Datei in Drive bleibt erhalten. */
  signOut() {
    const token = this.#token();
    if (token && globalThis.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
    this.storage.removeItem('gdrive.token');
    this.storage.removeItem('gdrive.fileId');
    this.fileId = null;
  }

  // ---------- Drive-Zugriffe ----------

  async #api(url, opts = {}) {
    const token = this.#token();
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
    if (!res.ok) throw new Error(`Google Drive meldet Fehler ${res.status}`);
    return res.json();
  }

  async #findFile() {
    if (this.fileId) return this.fileId;
    const q = `name='${FILE_NAME}' and trashed=false and appProperties has { key='${MARK.key}' and value='${MARK.value}' }`;
    const r = await this.#json(`${API}?spaces=drive&orderBy=createdTime&fields=files(id)&q=${encodeURIComponent(q)}`);
    this.fileId = r.files?.[0]?.id || null;
    if (this.fileId) this.storage.setItem('gdrive.fileId', this.fileId);
    return this.fileId;
  }

  /** Version der Datei oder null, wenn sie fehlt/im Papierkorb ist. */
  async #version() {
    const res = await this.#api(`${API}/${this.fileId}?fields=version,trashed`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Google Drive meldet Fehler ${res.status}`);
    const meta = await res.json();
    return meta.trashed ? null : meta.version;
  }

  #forget() {
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

  async write(data, expectedVersion) {
    const body = JSON.stringify(data);
    if (!(await this.#findFile())) {
      if (expectedVersion) throw new ConflictError();
      const meta = { name: FILE_NAME, mimeType: 'application/json', appProperties: { [MARK.key]: MARK.value } };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));
      const r = await this.#json(`${UPLOAD}?uploadType=multipart&fields=id,version`, { method: 'POST', body: form });
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
      body,
    });
    return r.version;
  }
}
