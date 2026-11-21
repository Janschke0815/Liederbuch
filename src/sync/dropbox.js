// Cloud-Anbieter Dropbox: das persönliche Liederbuch ist eine JSON-Datei im App-Ordner
// (Dropbox → Apps → <Name der Dropbox-App> → Liederbuch.json). Die App sieht nur diesen Ordner.
//
// Anmeldung ohne eigenen Server: OAuth mit PKCE. Die Seite leitet zu Dropbox weiter und kommt mit
// ?code=… zurück (startLogin / finishLogin). Dropbox gibt ein Langzeit-Token (refresh_token) –
// danach muss man sich nicht mehr anmelden; das kurzlebige Zugangstoken wird still erneuert.
//
// Versionen: Dropbox vergibt jeder Dateifassung eine „rev“. Geschrieben wird nur, wenn die Datei
// noch die erwartete rev hat (mode update + strict_conflict) – sonst ConflictError, die Sync-Engine
// liest neu und führt zusammen.

import { AuthError, ConflictError } from './sync-engine.js';
import { toFileJson } from '../formats/file-format.js';

const AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const API = 'https://api.dropboxapi.com/2';
const CONTENT = 'https://content.dropboxapi.com/2';
export const DROPBOX_FILE = '/Liederbuch.json';
const TOKEN_KEY = 'dropbox.token';
const PKCE_KEY = 'dropbox.pkce';

/** JSON für Dropbox-API-Arg: Header dürfen nur ASCII enthalten, alles andere als \uXXXX. */
export function headerJson(value) {
  return JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Zufälliger Prüfschlüssel (code_verifier) für PKCE, 64 Zeichen. */
export function randomVerifier() {
  return base64url(crypto.getRandomValues(new Uint8Array(48)));
}

/** code_challenge = base64url(SHA-256(verifier)) */
export async function pkceChallenge(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(hash));
}

/** Rücksprung-Adresse: diese Seite ohne Abfrage und Anker (muss so bei Dropbox eingetragen sein). */
export const dropboxRedirectUri = (loc = location) => loc.origin + loc.pathname;

/** Cloud-Anbieter Dropbox: eine JSON-Datei im App-Ordner, Anmeldung per PKCE. */
export class DropboxProvider {
  id = 'dropbox';
  name = 'Dropbox';

  /**
   * @param {{appKey: string, fetch?: typeof fetch, storage?: Storage, redirectUri?: string}} opts
   */
  constructor({
    appKey, fetch: f = globalThis.fetch?.bind(globalThis), storage = globalThis.localStorage, redirectUri,
  } = {}) {
    this.appKey = appKey;
    this.fetch = f;
    this.storage = storage;
    this.redirectUri = redirectUri || (typeof location !== 'undefined' ? dropboxRedirectUri() : '');
  }

  // ---------- Anmeldung ----------

  #tokens() {
    try {
      return JSON.parse(this.storage.getItem(TOKEN_KEY) || 'null');
    } catch {
      return null;
    }
  }

  #saveTokens(resp, old = {}) {
    this.storage.setItem(TOKEN_KEY, JSON.stringify({
      accessToken: resp.access_token,
      expiresAt: Date.now() + Number(resp.expires_in || 14400) * 1000,
      refreshToken: resp.refresh_token || old.refreshToken || '',
    }));
  }

  /** Ist die App mit Dropbox verbunden (Langzeit-Token vorhanden)? */
  get signedIn() {
    const t = this.#tokens();
    return Boolean(t?.refreshToken || (t?.accessToken && t.expiresAt > Date.now()));
  }

  /**
   * Anmeldung beginnen: Prüfschlüssel merken und zu Dropbox weiterleiten.
   * @param {object} [extra] wird bis zur Rückkehr aufbewahrt (z. B. welches Liederbuch)
   * @returns {Promise<string>} Adresse der Dropbox-Anmeldeseite
   */
  async loginUrl(extra = {}) {
    if (!this.appKey) throw new Error('Kein Dropbox-App-Schlüssel eingetragen');
    const verifier = randomVerifier();
    const state = randomVerifier().slice(0, 16);
    sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state, redirectUri: this.redirectUri, ...extra }));
    const params = new URLSearchParams({
      client_id: this.appKey,
      response_type: 'code',
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: 'S256',
      redirect_uri: this.redirectUri,
      token_access_type: 'offline',
      state,
    });
    return `${AUTH_URL}?${params}`;
  }

  /**
   * Rückkehr von Dropbox auswerten (?code=…&state=… oder ?error=…).
   * @param {URLSearchParams} query
   * @returns {Promise<null | object>} null, wenn die Adresse keine Dropbox-Rückkehr ist; sonst
   *   die bei loginUrl() aufbewahrten Angaben. Wirft AuthError bei Abbruch oder Fehler.
   */
  async finishLogin(query) {
    const saved = JSON.parse(sessionStorage.getItem(PKCE_KEY) || 'null');
    if (!saved || query.get('state') !== saved.state) return null;
    sessionStorage.removeItem(PKCE_KEY);
    if (query.get('error')) {
      throw new AuthError(query.get('error') === 'access_denied' ? 'Anmeldung bei Dropbox abgebrochen' : query.get('error_description') || query.get('error'));
    }
    const resp = await this.#token({
      grant_type: 'authorization_code',
      code: query.get('code') || '',
      code_verifier: saved.verifier,
      redirect_uri: saved.redirectUri,
    });
    this.#saveTokens(resp);
    return saved;
  }

  async #token(fields) {
    let res;
    try {
      res = await this.fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: this.appKey, ...fields }),
      });
    } catch {
      throw new Error('Dropbox nicht erreichbar (offline?)');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 400 || res.status === 401) throw new AuthError(`Dropbox-Anmeldung ungültig${body.error_description ? `: ${body.error_description}` : ''}`);
      throw new Error(`Dropbox meldet Fehler ${res.status}`);
    }
    return body;
  }

  /** Gültiges Zugangstoken; erneuert es bei Bedarf mit dem Langzeit-Token. */
  async #accessToken(force = false) {
    const t = this.#tokens();
    if (!t) throw new AuthError('Bitte mit Dropbox verbinden');
    if (!force && t.accessToken && t.expiresAt - 60_000 > Date.now()) return t.accessToken;
    if (!t.refreshToken) throw new AuthError('Dropbox-Anmeldung abgelaufen');
    try {
      const resp = await this.#token({ grant_type: 'refresh_token', refresh_token: t.refreshToken });
      this.#saveTokens(resp, t);
      return resp.access_token;
    } catch (err) {
      if (err instanceof AuthError) this.storage.removeItem(TOKEN_KEY);
      throw err;
    }
  }

  /** Abmelden (Zugang bei Dropbox widerrufen); die Datei in Dropbox bleibt erhalten. */
  signOut() {
    const t = this.#tokens();
    this.storage.removeItem(TOKEN_KEY);
    if (t?.accessToken) {
      this.fetch(`${API}/auth/token/revoke`, { method: 'POST', headers: { Authorization: `Bearer ${t.accessToken}` } }).catch(() => {});
    }
  }

  // ---------- Dateizugriffe ----------

  /** Anfrage mit Token; bei abgelaufenem Token einmal erneuern und wiederholen. */
  async #call(url, opts = {}, retry = true) {
    const token = await this.#accessToken();
    let res;
    try {
      res = await this.fetch(url, { method: 'POST', ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } });
    } catch {
      throw new Error('Dropbox nicht erreichbar (offline?)');
    }
    if (res.status === 401) {
      if (retry) {
        await this.#accessToken(true);
        return this.#call(url, opts, false);
      }
      this.storage.removeItem(TOKEN_KEY);
      throw new AuthError('Dropbox-Anmeldung abgelaufen');
    }
    return res;
  }

  /** Fehlertext von Dropbox (409 = fachlicher Fehler, z. B. path/not_found). */
  static async #summary(res) {
    try {
      return (await res.clone().json()).error_summary || '';
    } catch {
      return '';
    }
  }

  async #fail(res) {
    const summary = await DropboxProvider.#summary(res);
    if (res.status === 429) throw new Error('Dropbox: zu viele Anfragen, gleich noch einmal');
    if (res.status === 507 || /insufficient_space/.test(summary)) throw new Error('Dropbox ist voll');
    throw new Error(`Dropbox meldet Fehler ${res.status}${summary ? `: ${summary}` : ''}`);
  }

  /** rev der Datei oder null, wenn es sie (noch) nicht gibt. */
  async #rev() {
    const res = await this.#call(`${API}/files/get_metadata`, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: DROPBOX_FILE }),
    });
    if (res.status === 409 && /not_found/.test(await DropboxProvider.#summary(res))) return null;
    if (!res.ok) await this.#fail(res);
    return (await res.json()).rev;
  }

  /**
   * Liederbuch aus Dropbox lesen.
   * @param {string} [knownVersion]  zuletzt gelesene rev – ist sie gleich, wird nichts geladen
   * @returns {Promise<null | {unchanged: true} | {data: object, version: string}>}
   */
  async read(knownVersion) {
    const rev = await this.#rev();
    if (rev === null) return null;
    if (knownVersion && rev === knownVersion) return { unchanged: true };
    const res = await this.#call(`${CONTENT}/files/download`, { headers: { 'Dropbox-API-Arg': headerJson({ path: DROPBOX_FILE }) } });
    if (res.status === 409) return null; // inzwischen gelöscht
    if (!res.ok) await this.#fail(res);
    let version = rev;
    try {
      version = JSON.parse(res.headers.get('Dropbox-API-Result') || '{}').rev || rev;
    } catch {
      /* rev aus den Metadaten */
    }
    let data;
    try {
      data = JSON.parse(await res.text());
    } catch {
      throw new Error('Liederbuch.json in Dropbox ist beschädigt');
    }
    return { data, version };
  }

  /**
   * Liederbuch nach Dropbox schreiben (nur, wenn die Datei noch die erwartete rev hat).
   * @returns {Promise<string>} neue rev
   */
  async write(data, expectedVersion) {
    const mode = expectedVersion ? { '.tag': 'update', update: expectedVersion } : { '.tag': 'add' };
    const res = await this.#call(`${CONTENT}/files/upload`, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': headerJson({ path: DROPBOX_FILE, mode, autorename: false, mute: true, strict_conflict: true }),
      },
      body: toFileJson(data),
    });
    if (res.status === 409) {
      const summary = await DropboxProvider.#summary(res);
      if (/conflict|not_found/.test(summary)) throw new ConflictError();
      await this.#fail(res);
    }
    if (!res.ok) await this.#fail(res);
    return (await res.json()).rev;
  }
}
