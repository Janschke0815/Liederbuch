// Setlisten: geordnete Auswahl von Liedern, z. B. für einen Auftritt.
//
// Datensatz:
// {
//   id, name,
//   items: [{ songId, transpose, note }]   – transpose: null = Transposition des Liedes,
//                                             sonst eigene Halbtöne nur für diese Setliste
//   createdAt, updatedAt, deletedAt          – wie bei Liedern (weiches Löschen für den Sync)
// }

import { isNewer } from './repository.js';

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

function defaultId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'set-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const normTranspose = (t) => (Number.isInteger(t) ? ((t % 12) + 12 + 6) % 12 - 6 : null);

function cleanItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((i) => i && typeof i.songId === 'string' && i.songId)
    .map((i) => ({ songId: i.songId, transpose: normTranspose(i.transpose), note: String(i.note || '').slice(0, 500) }));
}

/** Alle gespeicherten bzw. synchronisierten Felder einer Setliste. */
export function slimSetlist(r) {
  return {
    id: r.id,
    name: String(r.name || '').trim(),
    items: cleanItems(r.items),
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,
    deletedAt: r.deletedAt ?? null,
  };
}

/** Ereignisse wie SongRepository: "change" (eigene Änderung), "remote-change" (detail: ids). */
export class SetlistRepository extends EventTarget {
  constructor(store, { now = () => new Date().toISOString(), newId = defaultId } = {}) {
    super();
    this.store = store;
    this.now = now;
    this.newId = newId;
    this.slim = slimSetlist;
  }

  #changed() {
    this.dispatchEvent(new Event('change'));
  }

  // Schreibvorgänge nacheinander (siehe SongRepository)
  #queue = Promise.resolve();
  #serial(fn) {
    const run = this.#queue.then(fn, fn);
    this.#queue = run.catch(() => {});
    return run;
  }

  #stamp(old) {
    const t = this.now();
    if (!old?.updatedAt || t > old.updatedAt) return t;
    return new Date(Date.parse(old.updatedAt) + 1).toISOString();
  }

  /** Alle Setlisten alphabetisch. */
  async list() {
    const all = (await this.store.getAll()).filter((s) => !s.deletedAt);
    return all.sort((a, b) => collator.compare(a.name || '', b.name || ''));
  }

  async get(id) {
    const s = await this.store.get(id);
    return s && !s.deletedAt ? s : undefined;
  }

  create(name, items = []) {
    return this.#serial(async () => {
      const t = this.now();
      const rec = slimSetlist({ id: this.newId(), name: name || 'Neue Setliste', items, createdAt: t, updatedAt: t });
      await this.store.put(rec);
      this.#changed();
      return rec;
    });
  }

  /** changes: { name?, items? } */
  update(id, changes) {
    return this.#serial(async () => {
      const old = await this.get(id);
      if (!old) throw new Error(`Setliste ${id} nicht gefunden`);
      const rec = slimSetlist({ ...old, ...changes, id, updatedAt: this.#stamp(old) });
      await this.store.put(rec);
      this.#changed();
      return rec;
    });
  }

  remove(id) {
    return this.#serial(async () => {
      const old = await this.store.get(id);
      if (!old || old.deletedAt) return;
      const t = this.#stamp(old);
      await this.store.put({ ...old, deletedAt: t, updatedAt: t });
      this.#changed();
    });
  }

  restore(id) {
    return this.#serial(async () => {
      const old = await this.store.get(id);
      if (!old || !old.deletedAt) return old;
      const rec = { ...old, deletedAt: null, updatedAt: this.#stamp(old) };
      await this.store.put(rec);
      this.#changed();
      return rec;
    });
  }

  async allRecords() {
    return this.store.getAll();
  }

  applyRemote(records) {
    return this.#serial(async () => {
      const toPut = [];
      for (const r of records) {
        const local = await this.store.get(r.id);
        if (isNewer(r, local, slimSetlist)) toPut.push(slimSetlist(r));
      }
      if (toPut.length) {
        await this.store.putMany(toPut);
        this.dispatchEvent(new CustomEvent('remote-change', { detail: toPut.map((r) => r.id) }));
      }
      return toPut.map((r) => r.id);
    });
  }
}
