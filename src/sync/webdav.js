// Cloud-Anbieter WebDAV (z. B. Nextcloud, ownCloud, QNAP, Synology, eigener Server).
//
// Aufbau auf dem Server (ab Format 3 – eine Datei pro Lied):
//   <Ordner>/Liederbuch.json         Verzeichnis: Lieder (ohne Text) mit Dateiname und Prüfsumme,
//                                    Transposition, Notiz, Zeitstempel, Löschungen, Setlisten
//   <Ordner>/Lieder/<Titel>.cho      der Liedtext jedes Liedes (ChordPro, CR LF)
//
// Liedtexte lassen sich auch direkt auf dem Server bearbeiten, anlegen oder löschen; das erkennt
// der nächste Abgleich (Ordnerliste per PROPFIND, Prüfsumme je Lied). Ein Verzeichnis im alten
// Format (alles in einer Datei) wird gelesen und beim nächsten Schreiben umgestellt; ältere
// App-Versionen melden beim neuen Format „bitte App neu laden“ statt etwas zu überschreiben.
//
// Gleichzeitige Änderungen: Verzeichnis und Liedtexte werden mit If-Match / If-None-Match
// geschrieben; 412 = Konflikt -> die Sync-Engine liest neu und führt zusammen.
//
// Für die Sync-Engine sieht das aus wie bisher: read() liefert alle Lieder mit Text, write()
// bekommt alle Lieder mit Text. Die Aufteilung in Dateien passiert nur hier.

import { AuthError, ConflictError, SYNC_FORMAT } from './sync-engine.js';
import { toFileJson, toWindowsText } from '../core/file-format.js';
import { slimRecord } from '../storage/repository.js';
import {
  SONG_DIR, SONG_FILE, songBaseName, nameFits, uniqueName, normalizeText, hashText, idForFile,
  withTitle, parsePropfind, listingSignature, PROPFIND_BODY,
} from './song-files.js';

export const WEBDAV_FILE = 'Liederbuch.json';
const LAYOUT = 'files';
const INDEX_VERSION = 3;
const ENGINE_VERSION = 2; // Format, das die Sync-Engine erwartet
const SETTLE_MS = 60_000; // von Hand angelegte Dateien erst übernehmen, wenn sie so alt sind

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

const makeVersion = (etag, listing) => JSON.stringify([etag ?? null, listingSignature(listing)]);
const splitVersion = (v) => {
  try {
    const [etag, sig] = JSON.parse(v);
    return { etag, sig };
  } catch {
    return { etag: null, sig: null };
  }
};
const lower = (s) => String(s).toLowerCase();
/** Verzeichniseintrag eines Liedes -> Datensatz ohne Datei-Angaben. */
const stripFile = ({ file, hash, etag, ...rest }) => rest;

export class WebDavProvider {
  id = 'webdav';
  name = 'WebDAV';

  /** @param {{url: string, user?: string, password?: string, fetch?: typeof fetch, now?: () => string}} opts */
  constructor({ url, user = '', password = '', fetch: f = globalThis.fetch?.bind(globalThis), now = () => new Date().toISOString(), clock = () => Date.now() } = {}) {
    this.fileUrl = webdavFileUrl(url);
    this.folderUrl = this.fileUrl.replace(/[^/]*$/, '');
    this.songDirUrl = this.folderUrl + SONG_DIR;
    this.user = user;
    this.password = password;
    this.fetch = f;
    this.now = now;
    this.clock = clock;
    this.signedIn = Boolean(this.fileUrl);
    this.exists = false;
    this.index = null; // zuletzt gelesenes/geschriebenes Verzeichnis (Format 3)
    this.listing = null; // zuletzt gelesene Ordnerliste: Name -> {etag, modified}
    this.texts = new Map(); // Liedtexte: Dateiname -> {etag, text}
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

  #songUrl(name) {
    return this.songDirUrl + encodeURIComponent(name);
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

  // ---------- Lesen ----------

  /**
   * Ordnerliste der Liedtexte; null, wenn der Server kein PROPFIND kann. Fehlt der Ordner,
   * ist die Liste leer und trägt folderMissing (anders als ein leerer Ordner).
   */
  async #list() {
    const res = await this.#request('PROPFIND', this.songDirUrl, {
      headers: { Depth: '1', 'Content-Type': 'application/xml; charset=utf-8' },
      body: PROPFIND_BODY,
    });
    if (res.status === 404) return Object.assign(new Map(), { folderMissing: true });
    if (res.status !== 207) return null;
    return parsePropfind(await res.text(), this.songDirUrl);
  }

  /** Liedtext einer Datei (zwischengespeichert, solange sich das ETag nicht ändert). */
  async #text(name, etag) {
    const cached = this.texts.get(name);
    if (cached && etag && cached.etag === etag) return cached.text;
    const res = await this.#request('GET', this.#songUrl(name));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Lesen von „${name}“`);
    const text = normalizeText(await res.text());
    this.texts.set(name, { etag: etag || res.headers.get('ETag'), text });
    return text;
  }

  async read(knownVersion, attempt = 0) {
    // „Unverändert“ nur fragen, wenn das Verzeichnis hier zwischengespeichert ist – sonst würde
    // ein 304 als leeres Liederbuch gelten
    const known = this.index ? splitVersion(knownVersion) : { etag: null, sig: null };
    // Erst das Verzeichnis, dann die Ordnerliste: Was das Verzeichnis nennt, wurde vorher geschrieben.
    const res = await this.#request('GET', this.fileUrl, { headers: known.etag ? { 'If-None-Match': known.etag } : {} });
    if (res.status !== 304 && res.status !== 404 && !res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Lesen`);
    const listing = await this.#list();
    if (res.status === 304 && known.sig === listingSignature(listing) && this.index) return { unchanged: true };

    let index;
    let etag = null;
    if (res.status === 404) {
      this.exists = false;
      if (!listing?.size) {
        this.index = null;
        this.listing = listing;
        return null;
      }
      index = { format: SYNC_FORMAT, version: INDEX_VERSION, layout: LAYOUT, songs: [] }; // nur Dateien da
    } else if (res.status === 304) {
      index = this.index;
      etag = known.etag;
    } else {
      this.exists = true;
      etag = res.headers.get('ETag');
      try {
        index = JSON.parse(await res.text());
      } catch {
        throw new Error('Die Datei auf dem Server ist kein gültiges Liederbuch (kein JSON)');
      }
    }

    // Altes Format (alles in einer Datei) oder fremde Version: so an die Engine geben,
    // die prüft Format und Version; altes Format wird beim nächsten Schreiben umgestellt.
    if (index?.layout !== LAYOUT) {
      this.index = null;
      this.listing = listing;
      return { data: index, version: makeVersion(etag, listing), rewrite: index?.format === SYNC_FORMAT };
    }
    if (index.version > INDEX_VERSION) {
      throw new Error('Das Liederbuch auf dem Server stammt aus einer neueren Version der App – bitte App neu laden');
    }

    const { songs, changed, missing } = await this.#assemble(index, listing);
    // Datei fehlt: vielleicht hat ein anderes Gerät gerade umbenannt – Verzeichnis neu lesen
    if (missing && attempt < 2) {
      const again = await this.#request('HEAD', this.fileUrl);
      if (again.headers.get('ETag') && again.headers.get('ETag') !== etag) return this.read(null, attempt + 1);
    }
    this.index = index;
    this.listing = listing;
    const { layout, orphans, ...rest } = index;
    return {
      data: { ...rest, version: ENGINE_VERSION, songs },
      version: makeVersion(etag, listing),
      rewrite: changed, // Änderungen direkt auf dem Server -> ins Verzeichnis übernehmen
    };
  }

  /** Verzeichnis + Liedtexte -> vollständige Lieder; erkennt Änderungen direkt auf dem Server. */
  async #assemble(index, listing) {
    const songs = [];
    let changed = false;
    let missing = false;
    const referenced = new Set((index.orphans || []).map(lower));
    const liveHashes = new Set();
    const entries = index.songs || [];
    for (const e of entries) if (e.file) referenced.add(lower(e.file));
    if (listing?.folderMissing && entries.some((e) => e.file && !e.deletedAt)) {
      throw new Error(`Der Ordner „${SONG_DIR.replace('/', '')}“ fehlt auf dem Server – Liederbuch wird nicht verändert`);
    }

    // Liedtexte parallel holen (höchstens 6 gleichzeitig)
    const live = entries.filter((e) => e.file && !e.deletedAt);
    const texts = new Map();
    for (let i = 0; i < live.length; i += 6) {
      await Promise.all(live.slice(i, i + 6).map(async (e) => {
        const f = listing?.get(e.file);
        if (listing && !f) return; // fehlt
        texts.set(e.id, await this.#text(e.file, f?.etag));
      }));
    }

    for (const e of entries) {
      if (e.deletedAt || !e.file) {
        songs.push(stripFile(e));
        continue;
      }
      const text = texts.get(e.id);
      if (text == null) {
        // Datei wurde auf dem Server gelöscht -> Lied in den Papierkorb
        missing = true;
        changed = true;
        const t = this.now();
        const last = this.texts.get(e.file)?.text; // zuletzt gelesener Text, falls bekannt
        songs.push({ ...stripFile(e), ...(last != null ? { chordpro: last } : {}), updatedAt: t, deletedAt: t });
        continue;
      }
      const hash = await hashText(text);
      liveHashes.add(hash);
      if (hash !== e.hash) {
        // Liedtext wurde direkt auf dem Server geändert
        changed = true;
        songs.push({ ...stripFile(e), chordpro: text, updatedAt: this.now() });
      } else {
        songs.push({ ...stripFile(e), chordpro: text });
      }
    }

    // Von Hand neu angelegte Dateien als neue Lieder übernehmen
    if (listing) {
      for (const [name, f] of listing) {
        if (!SONG_FILE.test(name) || referenced.has(lower(name))) continue;
        if (f.modified && this.clock() - f.modified < SETTLE_MS) continue; // evtl. gerade von einem Gerät geschrieben
        const text = await this.#text(name, f.etag);
        if (text == null || liveHashes.has(await hashText(text))) continue; // Doppel eines vorhandenen Liedes
        const t = this.now();
        songs.push(slimRecord({
          id: await idForFile(name), chordpro: withTitle(text, name), transpose: 0, accidentals: 'auto',
          createdAt: t, updatedAt: t, deletedAt: null,
        }));
        changed = true;
      }
    }
    return { songs, changed, missing };
  }

  // ---------- Schreiben ----------

  async #ensureFolders() {
    for (const url of [this.folderUrl, this.songDirUrl]) {
      const mk = await this.#request('MKCOL', url);
      if (!mk.ok && ![405, 301].includes(mk.status)) throw new Error(`Ordner konnte nicht angelegt werden (${mk.status})`);
    }
  }

  async #put(url, body, headers) {
    let res = await this.#request('PUT', url, { headers, body });
    if (res.status === 409) {
      await this.#ensureFolders(); // Ordner fehlt noch
      res = await this.#request('PUT', url, { headers, body });
    }
    return res;
  }

  /** Neue Liedtext-Datei anlegen; ist der Name belegt, mit gleichem Inhalt übernehmen, sonst nächster Name. */
  async #putNew(base, body, hash, taken) {
    for (let i = 0; i < 30; i++) {
      const name = uniqueName(base, taken);
      const res = await this.#put(this.#songUrl(name), body, { 'Content-Type': 'text/plain; charset=utf-8', 'If-None-Match': '*' });
      if (res.ok) return { name, etag: res.headers.get('ETag') };
      if (res.status !== 412) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern von „${name}“`);
      const existing = await this.#text(name, null); // belegt: vielleicht von einem früheren Versuch
      if (existing != null && (await hashText(existing)) === hash) {
        return { name, etag: this.texts.get(name)?.etag || null };
      }
      taken.add(lower(name));
    }
    throw new Error(`Kein freier Dateiname für „${base}“`);
  }

  async write(data, expectedVersion) {
    const expected = splitVersion(expectedVersion);
    const prev = new Map((this.index?.songs || []).map((e) => [e.id, e]));
    const listing = this.listing;
    const songs = [...(data.songs || [])].sort((a, b) => (a.id < b.id ? -1 : 1));
    const live = songs.filter((r) => !r.deletedAt);

    // Dateinamen: vorhandene Namen behalten, solange sie zum Titel passen
    const taken = new Set([...(listing?.keys() || [])].map(lower));
    const names = new Map();
    for (const r of live) {
      const p = prev.get(r.id);
      if (p?.file && nameFits(p.file, songBaseName(r.chordpro))) names.set(r.id, p.file);
    }
    for (const r of live) {
      const p = prev.get(r.id);
      if (!names.has(r.id) && p?.file) taken.delete(lower(p.file)); // alter Name wird frei (umbenannt)
    }
    for (const n of names.values()) taken.add(lower(n));

    const entries = [];
    const remove = new Set((this.index?.orphans || []).filter((n) => !listing || listing.has(n)));
    for (const r of songs) {
      const p = prev.get(r.id);
      if (r.deletedAt) {
        // Gelöscht: Text im Verzeichnis behalten (Papierkorb), Datei entfernen
        if (p?.file) remove.add(p.file);
        entries.push(slimRecord(r));
        continue;
      }
      const text = normalizeText(r.chordpro);
      const hash = await hashText(text);
      const body = toWindowsText(text);
      let file = names.get(r.id);
      let etag = p?.etag ?? null;
      if (file) {
        const onServer = listing ? listing.get(file) : { etag };
        if (p.hash !== hash || !onServer) {
          const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
          if (onServer?.etag) headers['If-Match'] = onServer.etag;
          else if (!onServer) headers['If-None-Match'] = '*';
          const res = await this.#put(this.#songUrl(file), body, headers);
          if (res.status === 412) throw new ConflictError();
          if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern von „${file}“`);
          etag = res.headers.get('ETag');
        } else {
          etag = onServer.etag ?? etag;
        }
      } else {
        const created = await this.#putNew(songBaseName(r.chordpro), body, hash, taken);
        file = created.name;
        etag = created.etag;
        taken.add(lower(file));
        if (p?.file && p.file !== file) remove.add(p.file); // umbenannt: alte Datei weg
      }
      this.texts.set(file, { etag, text });
      const { chordpro, ...meta } = slimRecord(r);
      entries.push({ ...meta, file, hash, etag });
    }

    const { songs: _s, version: _v, ...rest } = data;
    const index = { ...rest, format: SYNC_FORMAT, version: INDEX_VERSION, layout: LAYOUT, songs: entries };
    const keep = new Set(entries.filter((e) => e.file && !e.deletedAt).map((e) => lower(e.file)));
    const orphans = [...remove].filter((n) => !keep.has(lower(n)));
    if (orphans.length) index.orphans = orphans;

    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (expected.etag) headers['If-Match'] = expected.etag;
    else if (!this.exists) headers['If-None-Match'] = '*';
    const res = await this.#put(this.fileUrl, toFileJson(index), headers);
    if (res.status === 412) throw new ConflictError();
    if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern`);
    this.exists = true;
    const newEtag = res.headers.get('ETag');

    // Alte Dateien (umbenannt/gelöscht) erst entfernen, wenn das Verzeichnis sie nicht mehr nennt
    const left = [];
    for (const name of orphans) {
      const d = await this.#request('DELETE', this.#songUrl(name));
      if (d.ok || d.status === 404) this.texts.delete(name);
      else left.push(name);
    }
    index.orphans = left.length ? left : undefined;
    this.index = index;
    // Ordnerliste nachführen, damit der nächste Abgleich nicht unnötig neu lädt
    const nextListing = listing ? new Map(listing) : null;
    if (nextListing) {
      for (const n of orphans) if (!left.includes(n)) nextListing.delete(n);
      for (const e of entries) if (e.file && !e.deletedAt) nextListing.set(e.file, { etag: e.etag, modified: this.clock() });
    }
    this.listing = nextListing;
    return makeVersion(newEtag, nextListing);
  }
}
