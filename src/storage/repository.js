// Lieder verwalten: anlegen, ändern, löschen, suchen, Export/Import.
// Kennt nur die Store-Schnittstelle (siehe stores.js), nicht IndexedDB selbst.
//
// Datensatz:
// {
//   id, chordpro,
//   title, artist, sortTitle,          – aus dem ChordPro-Text abgeleitet (für Liste/Suche)
//   transpose, accidentals,            – gespeicherte Ansicht pro Lied
//   createdAt, updatedAt, deletedAt    – ISO-Zeitstempel; deletedAt = gelöscht (für späteren Sync)
// }

import { parseChordPro } from '../core/chordpro.js';

export const EXPORT_FORMAT = 'liederbuch';
export const EXPORT_VERSION = 1;

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

export function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
}

export function deriveSummary(chordpro) {
  const { meta } = parseChordPro(chordpro || '');
  const title = (meta.title || '').trim();
  return {
    title,
    artist: (meta.artist || []).join(', '),
    sortTitle: (meta.sorttitle || title).trim(),
  };
}

function defaultId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Nur Zeichen aus dem Liedtext, ohne Akkorde und Direktiven – für die Volltextsuche. */
function lyricsText(chordpro) {
  return chordpro.replace(/^\s*\{.*\}\s*$/gm, ' ').replace(/\[[^\]]*\]/g, '');
}

/** Felder, die gespeichert und synchronisiert werden (der Rest wird abgeleitet). */
export const SYNC_FIELDS = ['id', 'chordpro', 'transpose', 'accidentals', 'createdAt', 'updatedAt', 'deletedAt'];

export function slimRecord(r) {
  const out = {};
  for (const k of SYNC_FIELDS) out[k] = r[k] ?? (k === 'deletedAt' ? null : r[k]);
  return out;
}

/** Vollständiger Datensatz aus einem schlanken (z. B. aus der Cloud). */
export function fullRecord(r) {
  return {
    ...slimRecord(r),
    ...deriveSummary(r.chordpro),
    transpose: Number.isInteger(r.transpose) ? r.transpose : 0,
    accidentals: ['auto', 'sharp', 'flat'].includes(r.accidentals) ? r.accidentals : 'auto',
  };
}

/**
 * Welche Fassung gewinnt? Die mit dem späteren updatedAt; bei Gleichstand entscheidet der
 * Inhalt, damit alle Geräte zum selben Ergebnis kommen.
 */
export function isNewer(a, b, slim = slimRecord) {
  if (!a) return false;
  if (!b) return true;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt;
  return JSON.stringify(slim(a)) > JSON.stringify(slim(b));
}

/**
 * Ereignisse: "change" bei eigenen Änderungen, "remote-change" (detail: ids) wenn
 * Änderungen von anderen Geräten übernommen wurden.
 */
export class SongRepository extends EventTarget {
  constructor(store, { now = () => new Date().toISOString(), newId = defaultId } = {}) {
    super();
    this.store = store;
    this.now = now;
    this.newId = newId;
  }

  async #live() {
    return (await this.store.getAll()).filter((s) => !s.deletedAt);
  }

  static sort(songs) {
    return songs.sort(
      (a, b) =>
        collator.compare(a.sortTitle || a.title || '￿', b.sortTitle || b.title || '￿') ||
        collator.compare(a.artist || '', b.artist || ''),
    );
  }

  /** Alle Lieder alphabetisch; optional gefiltert (Titel/Interpret, sonst Liedtext). */
  async list({ query = '' } = {}) {
    const songs = await this.#live();
    const q = normalize(query.trim());
    if (!q) return SongRepository.sort(songs);
    const words = q.split(/\s+/);
    const matches = (text) => words.every((w) => text.includes(w));
    const head = [];
    const body = [];
    for (const s of songs) {
      if (matches(normalize(`${s.title} ${s.artist}`))) head.push(s);
      else if (matches(normalize(lyricsText(s.chordpro)))) body.push(s);
    }
    return [...SongRepository.sort(head), ...SongRepository.sort(body)];
  }

  async get(id) {
    const s = await this.store.get(id);
    return s && !s.deletedAt ? s : undefined;
  }

  async create(chordpro = '', extra = {}) {
    const t = this.now();
    const rec = {
      id: this.newId(),
      chordpro,
      ...deriveSummary(chordpro),
      transpose: 0,
      accidentals: 'auto',
      ...extra,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
    await this.store.put(rec);
    this.#changed();
    return rec;
  }

  #changed() {
    this.dispatchEvent(new Event('change'));
  }

  /** Zeitstempel, der sicher nach dem bisherigen liegt (auch bei falsch gehender Uhr). */
  #stamp(old) {
    const t = this.now();
    if (!old?.updatedAt || t > old.updatedAt) return t;
    return new Date(Date.parse(old.updatedAt) + 1).toISOString();
  }

  /** Ändert chordpro, transpose und/oder accidentals. */
  async update(id, changes) {
    const old = await this.get(id);
    if (!old) throw new Error(`Lied ${id} nicht gefunden`);
    const rec = { ...old, updatedAt: this.#stamp(old) };
    if ('chordpro' in changes) Object.assign(rec, { chordpro: changes.chordpro }, deriveSummary(changes.chordpro));
    if ('transpose' in changes) rec.transpose = ((Math.trunc(changes.transpose) % 12) + 12 + 6) % 12 - 6; // -6 … +5
    if ('accidentals' in changes) rec.accidentals = changes.accidentals;
    await this.store.put(rec);
    this.#changed();
    return rec;
  }

  /** Löscht weich: Datensatz bleibt als Grabstein für einen späteren Sync erhalten. */
  async remove(id) {
    const old = await this.store.get(id);
    if (!old || old.deletedAt) return;
    const t = this.#stamp(old);
    await this.store.put({ ...old, deletedAt: t, updatedAt: t });
    this.#changed();
  }

  /** Holt ein (weich) gelöschtes Lied zurück – für "Rückgängig". */
  async restore(id) {
    const old = await this.store.get(id);
    if (!old || !old.deletedAt) return old;
    const rec = { ...old, deletedAt: null, updatedAt: this.#stamp(old) };
    await this.store.put(rec);
    this.#changed();
    return rec;
  }

  /** Alle Datensätze einschließlich gelöschter (Grabsteine) – für den Sync. */
  async allRecords() {
    return this.store.getAll();
  }

  /**
   * Übernimmt Fassungen von anderen Geräten, aber nur, wenn sie neuer sind als die lokale
   * (falls hier inzwischen weiter bearbeitet wurde, bleibt die lokale Fassung).
   * @returns {Promise<string[]>} geänderte IDs
   */
  async applyRemote(records) {
    const toPut = [];
    for (const r of records) {
      const local = await this.store.get(r.id);
      if (isNewer(r, local)) toPut.push(fullRecord(r));
    }
    if (toPut.length) {
      await this.store.putMany(toPut);
      this.dispatchEvent(new CustomEvent('remote-change', { detail: toPut.map((r) => r.id) }));
    }
    return toPut.map((r) => r.id);
  }

  async exportData() {
    const songs = SongRepository.sort(await this.#live()).map(
      ({ id, chordpro, transpose, accidentals, createdAt, updatedAt }) =>
        ({ id, chordpro, transpose, accidentals, createdAt, updatedAt }),
    );
    return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: this.now(), songs };
  }

  /**
   * Führt eine Sicherung zusammen: neue Lieder kommen dazu, vorhandene werden nur
   * überschrieben, wenn die Sicherung neuer ist.
   */
  async importData(data) {
    if (!data || data.format !== EXPORT_FORMAT || !Array.isArray(data.songs)) {
      throw new Error('Keine gültige Liederbuch-Sicherung');
    }
    if (data.version > EXPORT_VERSION) {
      throw new Error('Die Sicherung stammt aus einer neueren Version der App');
    }
    const result = { added: 0, updated: 0, skipped: 0 };
    const toPut = [];
    const t = this.now();
    for (const s of data.songs) {
      if (typeof s?.chordpro !== 'string') {
        result.skipped++;
        continue;
      }
      const incoming = {
        id: typeof s.id === 'string' && s.id ? s.id : this.newId(),
        chordpro: s.chordpro,
        ...deriveSummary(s.chordpro),
        transpose: Number.isInteger(s.transpose) ? s.transpose : 0,
        accidentals: ['auto', 'sharp', 'flat'].includes(s.accidentals) ? s.accidentals : 'auto',
        createdAt: s.createdAt || t,
        updatedAt: s.updatedAt || t,
        deletedAt: null,
      };
      const existing = await this.store.get(incoming.id);
      if (!existing) {
        result.added++;
        toPut.push(incoming);
      } else if (existing.deletedAt || incoming.updatedAt > existing.updatedAt) {
        if (existing.deletedAt) result.added++;
        else result.updated++;
        toPut.push(incoming);
      } else {
        result.skipped++;
      }
    }
    await this.store.putMany(toPut);
    if (toPut.length) this.#changed();
    return result;
  }
}
