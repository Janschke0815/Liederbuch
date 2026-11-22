// Anmeldung bei Google (OAuth 2) – ganz im Browser, ohne eigenen Server.
//
// Die App bekommt ein Zugangstoken für Google Drive (Berechtigung "drive.file": nur Dateien, die die
// App selbst angelegt hat oder die man ihr in der Google-Dateiauswahl gibt). Das Token gilt etwa eine
// Stunde und liegt nur auf diesem Gerät. Ein Langzeit-Token (Refresh-Token) gibt Google reinen
// Browser-Apps nicht – dafür bräuchte es einen Server mit Client-Secret. Ist das Token abgelaufen,
// genügt ein Tippen auf „Anmelden“: Wer schon zugestimmt hat, wird nicht noch einmal gefragt.
//
// Zwei Wege:
//   signIn()               kleines Google-Fenster (Google Identity Services), Normalfall
//   loginUrl()/finishLogin() Weiterleitung zu Google und zurück (#access_token=… in der Adresse) –
//                          für die installierte App auf iPhone/iPad, wo Fenster nicht zuverlässig gehen
//
// Jedes Liederbuch kann ein eigenes Google-Konto haben: tokenKey/accountKey trennen die Anmeldungen
// (siehe bookKey in books.js). Das Konto (E-Mail) wird gemerkt, damit die erneute Anmeldung ohne
// Rückfrage beim richtigen Konto landet (login_hint).
//
// Kein Bildschirm, keine Drive-Zugriffe; die Speicherschicht (google-drive.js) holt sich hier nur
// das Token.

import { AuthError } from './sync-engine.js';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_URL = 'https://accounts.google.com/gsi/client';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const ABOUT_URL = 'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)';
const TOKEN_KEY = 'gdrive.token';
const ACCOUNT_KEY = 'gdrive.account';
const PENDING_KEY = 'gdrive.login';

const scripts = new Map();
/** Skript von Google einmal laden (Anmeldung, Dateiauswahl). */
export function loadScript(src) {
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

/** Rücksprung-Adresse nach der Anmeldung: diese Seite ohne Abfrage und Anker (bei Google eintragen). */
export const googleRedirectUri = (loc = location) => loc.origin + loc.pathname;

/** Weiterleitung statt Fenster? Ja in der installierten App auf iPhone/iPad. */
export const prefersRedirect = (nav = globalThis.navigator) => nav?.standalone === true;

/** Verständliche Meldung zu einem Fehlercode von Google. */
export function authMessage(code, description = '') {
  switch (code) {
    case 'popup_closed':
    case 'access_denied':
      return code === 'access_denied' ? 'Zugriff auf Google Drive wurde nicht erlaubt' : 'Anmeldung abgebrochen';
    case 'popup_failed_to_open':
      return 'Das Google-Anmeldefenster wurde blockiert – Pop-ups für diese Seite erlauben';
    case 'interaction_required':
    case 'login_required':
    case 'consent_required':
      return 'Bitte bei Google anmelden';
    case 'invalid_client':
    case 'unauthorized_client':
      return 'Die App ist bei Google nicht (richtig) eingerichtet – Client-ID prüfen';
    case 'redirect_uri_mismatch':
      return 'Diese Adresse ist bei Google nicht als Weiterleitung eingetragen (Einrichtung)';
    default:
      return description || code || 'Google-Anmeldung fehlgeschlagen';
  }
}

const randomState = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Anmeldung bei Google: Zugangstoken holen, merken, erneuern, widerrufen. */
export class GoogleAuth {
  /**
   * @param {{clientId: string, storage?: Storage, session?: Storage, fetch?: typeof fetch,
   *          gis?: () => Promise<object>, redirectUri?: string, tokenKey?: string, accountKey?: string}} opts
   *   gis: liefert das google-Objekt der Google Identity Services (für Tests austauschbar)
   *   tokenKey/accountKey: wo Token und Konto liegen (je Liederbuch eigene, siehe bookKey)
   */
  constructor({
    clientId, storage = globalThis.localStorage, session = globalThis.sessionStorage,
    fetch: f = globalThis.fetch?.bind(globalThis), gis, redirectUri,
    tokenKey = TOKEN_KEY, accountKey = ACCOUNT_KEY,
  } = {}) {
    this.clientId = clientId;
    this.tokenKey = tokenKey;
    this.accountKey = accountKey;
    this.storage = storage;
    this.session = session;
    this.fetch = f;
    this.gis = gis || (async () => {
      await loadScript(GIS_URL);
      return globalThis.google;
    });
    this.redirectUri = redirectUri || (typeof location !== 'undefined' ? googleRedirectUri() : '');
  }

  /** Gespeichertes Zugangstoken, solange es noch mindestens eine Minute gilt, sonst null. */
  token() {
    try {
      const t = JSON.parse(this.storage.getItem(this.tokenKey) || 'null');
      if (t?.accessToken && t.expiresAt - 60_000 > Date.now()) return t.accessToken;
    } catch {
      /* ungültig */
    }
    return null;
  }

  /** Gibt es ein gültiges Zugangstoken? */
  get signedIn() {
    return Boolean(this.token());
  }

  /** War dieses Gerät schon einmal angemeldet (dann fragt Google meist nicht erneut)? */
  get known() {
    return Boolean(this.storage.getItem(this.tokenKey));
  }

  /** Google-Konto (E-Mail), mit dem dieses Liederbuch zuletzt angemeldet war, sonst ''. */
  get account() {
    return this.storage.getItem(this.accountKey) || '';
  }

  /** Konto zum Token nachfragen und merken (für login_hint); Fehler sind egal. */
  async #rememberAccount(accessToken, accountKey = this.accountKey) {
    try {
      const res = await this.fetch(ABOUT_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
      const email = res.ok ? (await res.json())?.user?.emailAddress : '';
      if (email) this.storage.setItem(accountKey, email);
    } catch {
      /* ohne Konto geht es auch, Google fragt dann eben nach */
    }
  }

  #save(accessToken, expiresIn, key = this.tokenKey) {
    this.storage.setItem(key, JSON.stringify({
      accessToken,
      expiresAt: Date.now() + Number(expiresIn || 3600) * 1000,
    }));
  }

  /** Token ist abgelaufen oder widerrufen (Google antwortet 401): vergessen, neu anmelden. */
  expire() {
    try {
      const t = JSON.parse(this.storage.getItem(this.tokenKey) || 'null');
      if (t) this.storage.setItem(this.tokenKey, JSON.stringify({ ...t, expiresAt: 0 }));
    } catch {
      this.storage.removeItem(this.tokenKey);
    }
  }

  #checkClient() {
    if (!this.clientId) throw new AuthError('Die App hat keine Google-Client-ID (Einrichtung, siehe docs/google-einrichtung.md)');
  }

  /**
   * Anmelden mit kleinem Google-Fenster. Muss direkt aus einem Klick heraus aufgerufen werden.
   * silent: ohne Rückfrage, wenn schon einmal zugestimmt (das Fenster schließt sich gleich wieder).
   * choose: Google zeigt die Kontoauswahl (erste Anmeldung eines Liederbuchs, Einladung öffnen).
   */
  async signIn({ silent = false, choose = false } = {}) {
    this.#checkClient();
    const google = await this.gis();
    const resp = await new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: DRIVE_SCOPE,
        include_granted_scopes: true,
        ...(this.account && !choose ? { login_hint: this.account } : {}),
        callback: (r) => (r.error ? reject(new AuthError(authMessage(r.error, r.error_description))) : resolve(r)),
        error_callback: (e) => reject(new AuthError(authMessage(e.type, e.message))),
      });
      client.requestAccessToken({ prompt: silent ? 'none' : choose ? 'select_account' : '' });
    });
    if (!google.accounts.oauth2.hasGrantedAllScopes(resp, DRIVE_SCOPE)) {
      throw new AuthError(authMessage('access_denied'));
    }
    this.#save(resp.access_token, resp.expires_in);
    await this.#rememberAccount(resp.access_token);
  }

  /**
   * Anmelden per Weiterleitung: Adresse der Google-Anmeldeseite. Die Seite kommt mit
   * #access_token=… zurück (siehe finishLogin).
   * @param {{silent?: boolean, choose?: boolean, extra?: object}} [opts] extra wird bis zur Rückkehr aufbewahrt
   */
  loginUrl({ silent = false, choose = false, extra = {} } = {}) {
    this.#checkClient();
    const state = randomState();
    this.session.setItem(PENDING_KEY, JSON.stringify({
      state, silent, tokenKey: this.tokenKey, accountKey: this.accountKey, ...extra,
    }));
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'token',
      scope: DRIVE_SCOPE,
      include_granted_scopes: 'true',
      state,
    });
    if (silent) params.set('prompt', 'none');
    else if (choose) params.set('prompt', 'select_account');
    if (this.account && !choose) params.set('login_hint', this.account);
    return `${AUTH_URL}?${params}`;
  }

  /**
   * Rückkehr von Google auswerten (Anker der Adresse: #access_token=…&state=… oder #error=…).
   * Das Token landet unter dem Schlüssel, für den die Anmeldung gestartet wurde (saved.tokenKey) –
   * auch wenn inzwischen ein anderes Liederbuch geöffnet ist.
   * @param {string} hash  location.hash
   * @returns {null | object}  null, wenn der Anker keine Rückkehr von unserer Anmeldung ist;
   *   sonst die bei loginUrl() aufbewahrten Angaben (mit silent). Wirft AuthError bei Fehlern;
   *   err.retry = true heißt: still ging es nicht, mit Rückfrage noch einmal versuchen.
   */
  finishLogin(hash) {
    const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    if (!q.has('state') || !(q.has('access_token') || q.has('error'))) return null;
    let saved = null;
    try {
      saved = JSON.parse(this.session.getItem(PENDING_KEY) || 'null');
    } catch {
      /* nichts gemerkt */
    }
    if (!saved || saved.state !== q.get('state')) return null;
    this.session.removeItem(PENDING_KEY);
    const error = q.get('error');
    if (error) {
      const err = new AuthError(authMessage(error, q.get('error_description')));
      err.retry = saved.silent && ['interaction_required', 'login_required', 'consent_required'].includes(error);
      err.saved = saved;
      throw err;
    }
    const scopes = (q.get('scope') || DRIVE_SCOPE).split(/\s+/);
    if (!scopes.includes(DRIVE_SCOPE)) throw new AuthError(authMessage('access_denied'));
    const key = saved.tokenKey || this.tokenKey;
    this.#save(q.get('access_token'), q.get('expires_in'), key);
    this.#rememberAccount(q.get('access_token'), saved.accountKey || this.accountKey); // im Hintergrund
    return saved;
  }

  /** Abmelden: Zugang bei Google widerrufen und das Token vergessen. */
  signOut() {
    let token = null;
    try {
      token = JSON.parse(this.storage.getItem(this.tokenKey) || 'null')?.accessToken;
    } catch {
      /* egal */
    }
    this.storage.removeItem(this.tokenKey);
    if (token && this.fetch) {
      this.fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).catch(() => {});
    }
  }
}
