// Abgleich der lokalen Datenbank mit einer gemeinsamen Datei in der Cloud.
//
// Prinzip: Jedes Gerät hat eine vollständige lokale Kopie (offline nutzbar). Beim Abgleich
// wird pro Lied die neuere Fassung genommen (updatedAt), Löschungen sind Grabsteine.
// Dadurch ist das Zusammenführen in jeder Reihenfolge und beliebig oft wiederholbar:
// Überschreibt ein Gerät versehentlich eine fremde Änderung in der Cloud, lädt das andere
// Gerät sie beim nächsten Abgleich einfach wieder hoch.
//
// Ein Anbieter (Provider) braucht nur:
//   read(knownVersion) -> null (noch keine Datei) | {unchanged: true} | {data, version, rewrite?}
//   write(data, expectedVersion) -> neue version; wirft ConflictError, wenn sich die Datei
//                                   inzwischen geändert hat

import { isNewer, slimRecord } from '../storage/repository.js';

export const SYNC_FORMAT = 'liederbuch-sync';
// 2: zusätzlich Setlisten ("setlists"); Version-1-Dateien werden weiter gelesen
export const SYNC_VERSION = 2;

export class ConflictError extends Error {
  constructor() {
    super('Die Datei in der Cloud wurde gerade von einem anderen Gerät geändert');
    this.name = 'ConflictError';
  }
}

export class AuthError extends Error {
  constructor(msg = 'Anmeldung nötig') {
    super(msg);
    this.name = 'AuthError';
  }
}



/**
 * Führt lokale und entfernte Datensätze zusammen.
 * @returns {{merged: object[], toLocal: object[], remoteChanged: boolean}}
 */
export function mergeRecords(local, remote, slim = slimRecord) {
  const same = (a, b) => JSON.stringify(slim(a)) === JSON.stringify(slim(b));
  const L = new Map(local.map((r) => [r.id, r]));
  const R = new Map(remote.filter((r) => r && typeof r.id === 'string').map((r) => [r.id, r]));
  const merged = [];
  const toLocal = [];
  let remoteChanged = false;
  for (const id of new Set([...L.keys(), ...R.keys()])) {
    const l = L.get(id);
    const r = R.get(id);
    const win = isNewer(r, l, slim) ? r : l;
    merged.push(slim(win));
    if (win === r && !(l && same(l, r))) toLocal.push(r);
    if (!r || !same(win, r)) remoteChanged = true;
  }
  return { merged, toLocal, remoteChanged };
}

/**
 * Status: 'off' | 'idle' | 'syncing' | 'offline' | 'auth' | 'error'
 * Ereignisse: "status" (bei jeder Änderung von state/lastSync/error)
 */
export class SyncEngine extends EventTarget {
  /**
   * @param repo      Lieder (SongRepository)
   * @param provider  Cloud-Anbieter
   * @param opts.extra weitere Sammlungen, z. B. [{ key: 'setlists', repo, slim }]
   */
  constructor(repo, provider, { pollMs = 15000, debounceMs = 1500, beforeSync, extra = [] } = {}) {
    super();
    this.repo = repo;
    this.collections = [{ key: 'songs', repo, slim: slimRecord }, ...extra];
    this.provider = provider;
    this.pollMs = pollMs;
    this.debounceMs = debounceMs;
    this.beforeSync = beforeSync;
    this.state = 'off';
    this.error = null;
    this.lastSync = null;
    this.knownVersion = null;
    this.dirty = true; // beim Start einmal vollständig abgleichen
    this.running = null;
    this.again = false;
    this.timer = null;
    this.poller = null;
    this.cleanup = [];
    // Eigene Änderungen immer vormerken, auch solange der Abgleich ruht
    for (const c of this.collections) {
      c.repo.addEventListener('change', () => {
        this.dirty = true;
        this.schedule();
      });
    }
  }

  #set(state, error = null) {
    this.state = state;
    this.error = error;
    this.dispatchEvent(new Event('status'));
  }

  /** Startet automatischen Abgleich (nach Änderungen, regelmäßig, beim Zurückkehren). */
  start() {
    if (this.state !== 'off') return;
    this.#set('idle');
    const on = (target, type, fn) => {
      target.addEventListener(type, fn);
      this.cleanup.push(() => target.removeEventListener(type, fn));
    };
    if (typeof window !== 'undefined') {
      on(window, 'online', () => this.sync());
      on(document, 'visibilitychange', () => !document.hidden && this.sync());
      this.poller = setInterval(() => {
        if (!document.hidden && navigator.onLine !== false) this.sync();
      }, this.pollMs);
    }
    this.sync();
  }

  stop() {
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
    clearInterval(this.poller);
    clearTimeout(this.timer);
    this.knownVersion = null;
    this.dirty = true;
    this.#set('off');
  }

  schedule() {
    if (this.state === 'off') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), this.debounceMs);
  }

  /** Ein Abgleich; laufen schon einer, folgt direkt danach ein weiterer. */
  sync() {
    if (this.state === 'off') return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.again = false;
        await this.#syncOnce();
      } while (this.again && this.state !== 'off');
      this.running = null;
    })();
    return this.running;
  }

  async #syncOnce() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.#set('offline');
      return;
    }
    this.#set('syncing', null);
    try {
      await this.beforeSync?.();
      for (let attempt = 0; ; attempt++) {
        try {
          await this.#exchange();
          break;
        } catch (err) {
          if (!(err instanceof ConflictError) || attempt >= 3) throw err;
          this.knownVersion = null; // neu lesen und erneut zusammenführen
        }
      }
      this.lastSync = new Date();
      this.#set('idle');
    } catch (err) {
      if (this.state === 'off') return;
      if (err instanceof AuthError) this.#set('auth', err);
      else if (typeof navigator !== 'undefined' && navigator.onLine === false) this.#set('offline');
      else {
        console.warn('Sync-Fehler:', err);
        this.#set('error', err);
      }
    }
  }

  async #exchange() {
    const hadLocalChanges = this.dirty;
    this.dirty = false;
    // Anbieter, die eigene Datensätze zum Wiedererkennen brauchen (z. B. Dateien ohne Verzeichnis)
    if (this.provider.prepare) {
      const local = {};
      for (const c of this.collections) local[c.key] = (await c.repo.allRecords()).map(c.slim);
      this.provider.prepare(local);
    }
    const remote = await this.provider.read(hadLocalChanges ? null : this.knownVersion);
    if (remote?.unchanged) return; // nichts Neues, nichts Eigenes
    if (remote?.data && remote.data.format !== SYNC_FORMAT) {
      throw new Error('Die Cloud-Datei hat ein unbekanntes Format');
    }
    if (remote?.data?.version > SYNC_VERSION) {
      throw new Error('Die Cloud-Datei stammt aus einer neueren Version der App – bitte App neu laden');
    }
    const data = { format: SYNC_FORMAT, version: SYNC_VERSION, updatedAt: new Date().toISOString() };
    let remoteChanged = false;
    for (const c of this.collections) {
      const theirs = Array.isArray(remote?.data?.[c.key]) ? remote.data[c.key] : [];
      const mine = await c.repo.allRecords();
      const r = mergeRecords(mine, theirs, c.slim);
      if (r.toLocal.length) await c.repo.applyRemote(r.toLocal);
      data[c.key] = r.merged;
      if (r.remoteChanged) remoteChanged = true;
    }
    // rewrite: der Anbieter möchte neu schreiben (z. B. altes Dateiformat umstellen oder
    // Änderungen übernehmen, die direkt auf dem Server gemacht wurden)
    if (remoteChanged || !remote || remote.rewrite || remote.data?.version !== SYNC_VERSION) {
      try {
        this.knownVersion = await this.provider.write(data, remote?.version ?? null);
      } catch (err) {
        this.dirty = true;
        throw err;
      }
    } else {
      this.knownVersion = remote.version;
    }
  }
}
