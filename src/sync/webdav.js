// Cloud-Anbieter WebDAV (z. B. Nextcloud, ownCloud, QNAP, Synology, eigener Server).
//
// Aufbau auf dem Server – reine ChordPro-Dateien, keine Datenbank-Datei (siehe chordpro-files.js):
//   <Ordner>/Lieder/<Titel - Interpret>.cho   ein Lied pro Datei, Transposition/Notiz als Direktiven
//   <Ordner>/Setlisten/<Name>.txt            eine Setliste pro Datei
//   <Ordner>/Liederbuch.json                 nur ein Hinweis (enthält keine Daten): hält ältere
//                                            App-Versionen davon ab, etwas zu überschreiben
//
// Ohne Verzeichnisdatei merkt sich jedes Gerät, welche Dateien es beim letzten Abgleich gesehen
// hat (Dateiname -> Lied, ETag, Prüfsumme, Stand). Daran erkennt es:
//   Datei neu          -> neues Lied (oder umbenannt: gleicher Text ohne Titel wie eine fehlende)
//   Datei geändert     -> Lied geändert (ETag anders)
//   Datei verschwunden -> Lied gelöscht (in den Papierkorb) – es sei denn, es wurde hier inzwischen
//                         geändert; dann wird es wieder hochgeladen
// Alles lässt sich daher auch direkt auf dem Server bearbeiten, anlegen und löschen.
//
// Für die Sync-Engine sieht das aus wie bisher: read() liefert alle Lieder und Setlisten als
// Datensätze, write() bekommt alle zusammengeführten Datensätze. Geschrieben wird je Datei mit
// If-Match / If-None-Match; 412 = Konflikt -> die Engine liest neu und führt zusammen.
//
// Ältere Ablageformate (alles in Liederbuch.json bzw. Verzeichnis + Dateien) werden gelesen und
// beim ersten Schreiben umgestellt.
//
// Die HTTP-Seite (Anmeldung, PROPFIND, PUT, DELETE, Fehlermeldungen) steht in webdav-client.js.

import { SYNC_FORMAT } from './sync-engine.js';
import { WebdavClient } from './webdav-client.js';
import { toFileJson } from '../formats/file-format.js';
import { slimRecord } from '../storage/repository.js';
import { slimSetlist } from '../storage/setlists.js';
import {
  SONG_DIR, SONG_FILE, songBaseName, nameFits, normalizeText, hashText, idForFile,
  withTitle, listingSignature, cleanFileName,
} from '../formats/song-files.js';
import {
  SETLIST_DIR, SETLIST_EXT, songToFile, fileToSong, songBody, setlistToFile, fileToSetlist, setlistFileName,
} from '../formats/chordpro-files.js';

export const WEBDAV_FILE = 'Liederbuch.json';
const GUARD_VERSION = 4; // Hinweisdatei: "Ablage als ChordPro-Dateien"
const ENGINE_VERSION = 2;

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

const lower = (s) => String(s).toLowerCase();
const iso = (ms) => new Date(ms).toISOString();
/** Zeitpunkt, der sicher nach `t` liegt (für „auf dem Server geändert/gelöscht“). */
const after = (t, candidate) => {
  const min = t ? Date.parse(t) + 1 : 0;
  const c = candidate ? Date.parse(candidate) : 0;
  return iso(Math.max(min, c || 0, 0) || Date.now());
};

const emptyState = () => ({ songs: {}, setlists: {} });

export class WebDavProvider {
  id = 'webdav';
  name = 'WebDAV';

  /**
   * @param {{url: string, user?: string, password?: string, fetch?: typeof fetch,
   *          now?: () => string, storage?: Storage}} opts
   */
  constructor({
    url, user = '', password = '', fetch: f = globalThis.fetch?.bind(globalThis),
    now = () => new Date().toISOString(), storage = globalThis.localStorage,
  } = {}) {
    this.fileUrl = webdavFileUrl(url);
    this.folderUrl = this.fileUrl.replace(/[^/]*$/, '');
    this.songDirUrl = this.folderUrl + SONG_DIR;
    this.setDirUrl = this.folderUrl + SETLIST_DIR;
    this.now = now;
    this.storage = storage;
    this.stateKey = `webdav.state:${this.folderUrl}`;
    this.signedIn = Boolean(this.fileUrl);
    this.http = new WebdavClient({ user, password, fetch: f, host: this.host });
    this.local = null; // eigene Datensätze (von der Engine vor dem Lesen gereicht)
    this.lists = null; // zuletzt gelesene Ordnerlisten {songs, setlists}
    this.guard = null; // Inhalt von Liederbuch.json beim letzten Lesen (Hinweis oder altes Format)
  }

  get host() {
    try {
      return new URL(this.fileUrl).host;
    } catch {
      return '';
    }
  }

  // ---------- Gedächtnis dieses Geräts ----------

  #loadState() {
    try {
      const s = JSON.parse(this.storage?.getItem(this.stateKey) || 'null');
      if (s && typeof s === 'object') return { songs: s.songs || {}, setlists: s.setlists || {} };
    } catch {
      /* neu anfangen */
    }
    return emptyState();
  }

  #saveState(state) {
    try {
      this.storage?.setItem(this.stateKey, JSON.stringify(state));
    } catch {
      /* Speicher voll: beim nächsten Mal wird neu abgeglichen */
    }
  }

  /** Die Sync-Engine reicht vor dem Lesen die eigenen Datensätze (zum Wiedererkennen). */
  prepare(local) {
    this.local = local;
  }

  // ---------- Netzwerk (siehe webdav-client.js) ----------

  #list(dirUrl) {
    return this.http.list(dirUrl);
  }

  #text(url, etag) {
    return this.http.text(url, etag);
  }

  #songUrl(name) {
    return this.songDirUrl + encodeURIComponent(name);
  }

  #setUrl(name) {
    return this.setDirUrl + encodeURIComponent(name);
  }

  /** Prüft die Verbindung (Ordner erreichbar, Anmeldung gültig). */
  async signIn() {
    if (!this.fileUrl) throw new Error('Bitte die WebDAV-Adresse eintragen');
    const problem = webdavUrlProblem(this.fileUrl);
    if (problem) throw new Error(problem);
    await this.#list(this.songDirUrl);
    this.signedIn = true;
  }

  signOut() {
    this.signedIn = false;
  }

  // ---------- Lesen ----------

  async read(knownVersion) {
    const [songs, sets] = await Promise.all([this.#list(this.songDirUrl), this.#list(this.setDirUrl)]);
    const version = listingSignature(songs) + '||' + listingSignature(sets);
    if (knownVersion && knownVersion === version && this.lists) return { unchanged: true };

    // Liederbuch.json: Hinweisdatei (neu) oder älteres Ablageformat
    const res = await this.http.request('GET', this.fileUrl);
    let guard = null;
    if (res.ok) {
      try {
        guard = JSON.parse(await res.text());
      } catch {
        guard = null;
      }
    }
    if (guard?.format === SYNC_FORMAT && guard.version > GUARD_VERSION) {
      throw new Error('Das Liederbuch auf dem Server stammt aus einer neueren Version der App – bitte App neu laden');
    }
    this.guard = guard;
    this.lists = { songs, sets };

    const state = this.#loadState();
    let data;
    let rewrite = false;
    if (guard?.format === SYNC_FORMAT && guard.version <= 2) {
      // ältestes Format: alle Lieder samt Text in Liederbuch.json
      data = { songs: guard.songs || [], setlists: guard.setlists || [] };
      rewrite = true;
    } else if (guard?.format === SYNC_FORMAT && guard.version === 3) {
      // Verzeichnis + Liedtext-Dateien (Liederbuch 1.13): Zuordnung Datei -> Lied übernehmen
      data = await this.#readIndexV3(guard, songs, state);
      rewrite = true;
    } else {
      data = await this.#readFiles(songs, sets, state);
      if (!guard && (songs.size || sets.size)) rewrite = true; // Hinweisdatei fehlt noch
    }
    this.#saveState(state);
    if (!guard && !songs.size && !sets.size && !data.songs.length) return null; // noch leer
    return {
      data: { format: SYNC_FORMAT, version: ENGINE_VERSION, ...data },
      version,
      rewrite,
    };
  }

  /** Format von Liederbuch 1.13: Verzeichnis mit Dateinamen + reine Liedtexte. */
  async #readIndexV3(index, songs, state) {
    const out = [];
    for (const e of index.songs || []) {
      if (e.deletedAt || !e.file) {
        const { file, hash, etag, ...rest } = e;
        out.push(rest);
        continue;
      }
      const f = songs.get(e.file);
      const text = f ? await this.#text(this.#songUrl(e.file), f.etag) : null;
      const { file, hash, etag, ...rest } = e;
      if (text == null) continue; // Datei fehlt: Eintrag fallen lassen, das Gerät behält seine Fassung
      out.push(slimRecord({ ...rest, chordpro: text }));
      state.songs[e.file] = { id: e.id, etag: f.etag, hash: '', updatedAt: e.updatedAt, createdAt: e.createdAt };
    }
    return { songs: out, setlists: index.setlists || [] };
  }

  /** Normales Format: nur Dateien. */
  async #readFiles(songs, sets, state) {
    const local = this.local?.songs || [];
    const localById = new Map(local.map((r) => [r.id, r]));
    const usedIds = new Set();
    const records = [];
    const nameToId = new Map();

    // bekannte Dateien, die fehlen (gelöscht oder umbenannt)
    const missing = Object.entries(state.songs).filter(([name]) => !songs.has(name));
    const missingByBody = new Map();
    for (const [name, st] of missing) if (st.body) missingByBody.set(st.body, name);

    const names = [...songs.keys()].filter((n) => SONG_FILE.test(n)).sort();
    for (const name of names) {
      const f = songs.get(name);
      const text = await this.#text(this.#songUrl(name), f.etag);
      if (text == null) continue;
      const parsed = fileToSong(withTitle(text, name));
      // Prüfsumme der Form, in der die App die Datei schreiben würde: So wird eine von Hand
      // gepflegte Datei (anders angeordnet, ohne {title:}) erst neu geschrieben, wenn sich das
      // Lied in der App wirklich ändert.
      const hash = await hashText(normalizeText(songToFile({ ...parsed })));
      const body = await hashText(songBody(parsed.chordpro));
      let st = state.songs[name];
      let id = st?.id;
      if (!id && missingByBody.has(body)) {
        // umbenannt (Titel geändert, Text gleich): Lied behalten
        const old = missingByBody.get(body);
        missingByBody.delete(body);
        st = { ...state.songs[old] };
        id = st.id;
        delete state.songs[old];
      }
      if (!id) {
        // unbekannt: vielleicht ein eigenes Lied, dessen Gedächtnis verloren ging (gleicher Inhalt/Name)
        const same = local.find((r) => !r.deletedAt && !usedIds.has(r.id) &&
          (normalizeText(songToFile(r)) === text || songBaseName(r.chordpro) + '.cho' === name));
        id = same?.id || idForFile(name);
      }
      if (usedIds.has(id)) id = idForFile(name); // zwei Dateien, ein Lied: die zweite wird eigenes Lied
      usedIds.add(id);
      nameToId.set(lower(name), id);
      const changed = !st || st.etag !== f.etag;
      const fileTime = f.modified ? iso(f.modified) : this.now();
      const updatedAt = changed ? after(st?.updatedAt, fileTime) : st.updatedAt;
      const createdAt = st?.createdAt || localById.get(id)?.createdAt || fileTime;
      records.push(slimRecord({ id, ...parsed, createdAt, updatedAt, deletedAt: null }));
      state.songs[name] = { id, etag: f.etag, hash, body, updatedAt, createdAt };
    }

    // gelöscht: Datei fehlt und wurde nicht umbenannt -> Löschung (der eigene Text bleibt im Papierkorb).
    // Fehlt der ganze Ordner, ist eher etwas schiefgegangen: dann lieber abbrechen.
    if (songs.folderMissing && missing.length) {
      throw new Error(`Der Ordner „${SONG_DIR.replace('/', '')}“ fehlt auf dem Server – Liederbuch wird nicht verändert`);
    }
    for (const [name, st] of missing) {
      if (!state.songs[name]) continue; // als umbenannt erkannt
      const t = after(st.updatedAt);
      records.push(slimRecord({ id: st.id, chordpro: undefined, createdAt: st.createdAt, updatedAt: t, deletedAt: t }));
      delete state.songs[name];
    }

    // Setlisten
    const setRecords = [];
    const localSets = this.local?.setlists || [];
    const idOf = (file) => nameToId.get(lower(file)) || idForFile(file);
    for (const name of [...sets.keys()].filter((n) => n.toLowerCase().endsWith(SETLIST_EXT)).sort()) {
      const f = sets.get(name);
      const text = await this.#text(this.#setUrl(name), f.etag);
      if (text == null) continue;
      const parsed = fileToSetlist(text, name, idOf);
      const st = state.setlists[name];
      const id = st?.id || localSets.find((s) => !s.deletedAt && setlistFileName(s.name) === name)?.id || idForFile(name, 'setliste-');
      const changed = !st || st.etag !== f.etag;
      const fileTime = f.modified ? iso(f.modified) : this.now();
      const updatedAt = changed ? after(st?.updatedAt, fileTime) : st.updatedAt;
      const createdAt = st?.createdAt || fileTime;
      setRecords.push(slimSetlist({ id, ...parsed, createdAt, updatedAt, deletedAt: null }));
      state.setlists[name] = { id, etag: f.etag, hash: await hashText(text), updatedAt, createdAt };
    }
    for (const [name, st] of Object.entries(state.setlists)) {
      if (sets.has(name)) continue;
      const t = after(st.updatedAt);
      setRecords.push(slimSetlist({ id: st.id, name: name.replace(/\.txt$/i, ''), items: [], createdAt: st.createdAt, updatedAt: t, deletedAt: t }));
      delete state.setlists[name];
    }
    return { songs: records, setlists: setRecords };
  }

  // ---------- Schreiben ----------

  /** Ordner, die vor dem Schreiben in dirUrl ggf. angelegt werden müssen. */
  #folders(dirUrl) {
    return [this.folderUrl, dirUrl];
  }

  async write(data) {
    const state = this.#loadState();
    const lists = this.lists || { songs: new Map(), sets: new Map() };
    const songs = [...(data.songs || [])].sort((a, b) => (a.id < b.id ? -1 : 1));
    const fileOfId = new Map(Object.entries(state.songs).map(([name, st]) => [st.id, name]));
    const taken = new Set([...lists.songs.keys()].map(lower));

    for (const r of songs) {
      const current = fileOfId.get(r.id);
      const st = current ? state.songs[current] : null;
      if (r.deletedAt) {
        if (current) {
          await this.http.delete(this.#songUrl(current), lists.songs.get(current)?.etag || st.etag);
          delete state.songs[current];
          fileOfId.delete(r.id);
        }
        continue;
      }
      const body = songToFile(r);
      const text = normalizeText(body);
      const hash = await hashText(text);
      const base = songBaseName(r.chordpro);
      let name = current;
      let etag = st?.etag;
      if (current && nameFits(current, base)) {
        if (st.hash !== hash || !lists.songs.has(current)) {
          const onServer = lists.songs.get(current);
          etag = await this.http.put(this.#songUrl(current), body, onServer ? { 'If-Match': onServer.etag || st.etag } : { 'If-None-Match': '*' }, this.#folders(this.songDirUrl));
        }
      } else {
        const created = await this.http.putNew((n) => this.#songUrl(n), base, '.cho', body, taken, this.#folders(this.songDirUrl));
        name = created.name;
        etag = created.etag;
        if (current) {
          await this.http.delete(this.#songUrl(current), lists.songs.get(current)?.etag || st.etag);
          delete state.songs[current];
          taken.delete(lower(current));
        }
      }
      taken.add(lower(name));
      fileOfId.set(r.id, name);
      this.http.remember(this.#songUrl(name), etag, text);
      state.songs[name] = {
        id: r.id, etag, hash, body: await hashText(songBody(r.chordpro)), updatedAt: r.updatedAt, createdAt: r.createdAt,
      };
    }

    // Setlisten
    const setFileOfId = new Map(Object.entries(state.setlists).map(([name, st]) => [st.id, name]));
    const setTaken = new Set([...lists.sets.keys()].map(lower));
    for (const s of [...(data.setlists || [])].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const current = setFileOfId.get(s.id);
      const st = current ? state.setlists[current] : null;
      if (s.deletedAt) {
        if (current) {
          await this.http.delete(this.#setUrl(current), lists.sets.get(current)?.etag || st.etag);
          delete state.setlists[current];
        }
        continue;
      }
      const body = setlistToFile(s, (id) => fileOfId.get(id) || null);
      const text = normalizeText(body);
      const hash = await hashText(text);
      const wanted = setlistFileName(s.name);
      let name = current;
      let etag = st?.etag;
      if (current && lower(current) === lower(wanted)) {
        if (st.hash !== hash || !lists.sets.has(current)) {
          const onServer = lists.sets.get(current);
          etag = await this.http.put(this.#setUrl(current), body, onServer ? { 'If-Match': onServer.etag || st.etag } : { 'If-None-Match': '*' }, this.#folders(this.setDirUrl));
        }
      } else {
        const created = await this.http.putNew((n) => this.#setUrl(n), cleanFileName(s.name || 'Setliste'), SETLIST_EXT, body, setTaken, this.#folders(this.setDirUrl));
        name = created.name;
        etag = created.etag;
        if (current) {
          await this.http.delete(this.#setUrl(current), lists.sets.get(current)?.etag || st.etag);
          delete state.setlists[current];
        }
      }
      setTaken.add(lower(name));
      this.http.remember(this.#setUrl(name), etag, text);
      state.setlists[name] = { id: s.id, etag, hash, updatedAt: s.updatedAt, createdAt: s.createdAt };
    }

    // Hinweisdatei statt Daten-JSON (ersetzt auch ein älteres Format)
    if (!(this.guard?.format === SYNC_FORMAT && this.guard.version === GUARD_VERSION)) {
      const guard = {
        format: SYNC_FORMAT,
        version: GUARD_VERSION,
        hinweis: 'Die Lieder liegen als ChordPro-Dateien im Ordner „Lieder“, Setlisten als Textdateien im Ordner ' +
          '„Setlisten“. Diese Datei enthält keine Daten – sie hält nur ältere Versionen der Liederbuch-App davon ab, ' +
          'etwas zu überschreiben.',
      };
      const res = await this.http.request('PUT', this.fileUrl, { headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: toFileJson(guard) });
      if (!res.ok) throw new Error(`WebDAV-Fehler ${res.status} beim Speichern von „${WEBDAV_FILE}“`);
      this.guard = guard;
    }

    this.#saveState(state);
    // Ordnerlisten nachführen, damit der nächste Abgleich nichts unnötig neu lädt
    const songList = new Map(Object.entries(state.songs).map(([n, st]) => [n, { etag: st.etag, modified: 0 }]));
    for (const [n, f] of lists.songs) if (!songList.has(n) && !SONG_FILE.test(n)) songList.set(n, f);
    const setList = new Map(Object.entries(state.setlists).map(([n, st]) => [n, { etag: st.etag, modified: 0 }]));
    this.lists = { songs: songList, sets: setList };
    return listingSignature(songList) + '||' + listingSignature(setList);
  }
}
