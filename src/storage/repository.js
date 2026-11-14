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
    tags: [...new Set((meta.tag || []).map((t) => t.trim()).filter(Boolean))],
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
// note: private Notiz zum Lied (nicht im Druck)
export const SYNC_FIELDS = ['id', 'chordpro', 'transpose', 'accidentals', 'note', 'createdAt', 'updatedAt', 'deletedAt'];

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
    note: typeof r.note === 'string' ? r.note : '',
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
    // ältere Datensätze haben noch keine Tags -> aus dem Text ableiten
    return (await this.store.getAll())
      .filter((s) => !s.deletedAt)
      .map((s) => (Array.isArray(s.tags) ? s : { ...s, tags: deriveSummary(s.chordpro).tags }));
  }

  /** Alle verwendeten Tags mit Anzahl, alphabetisch. */
  async tags() {
    const count = new Map();
    for (const s of await this.#live()) for (const t of s.tags) count.set(t, (count.get(t) || 0) + 1);
    return [...count].map(([tag, n]) => ({ tag, count: n })).sort((a, b) => collator.compare(a.tag, b.tag));
  }

  /** Gelöschte Lieder (Papierkorb), zuletzt gelöschte zuerst. */
  async trash() {
    return (await this.store.getAll())
      .filter((s) => s.deletedAt && s.chordpro)
      .sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));
  }

  /**
   * Endgültig leeren: Inhalt entfernen. Der Grabstein bleibt (ohne Text), damit andere
   * Geräte beim Abgleich die Löschung weiter kennen.
   */
  purge(id) {
    return this.#serial(async () => {
      const old = await this.store.get(id);
      if (!old?.deletedAt) return;
      await this.store.put({ ...old, chordpro: '', note: '', title: '', artist: '', tags: [], updatedAt: this.#stamp(old) });
      this.#changed();
    });
  }

  static sort(songs) {
    return songs.sort(
      (a, b) =>
        collator.compare(a.sortTitle || a.title || '￿', b.sortTitle || b.title || '￿') ||
        collator.compare(a.artist || '', b.artist || ''),
    );
  }

  /** Alle Lieder alphabetisch; optional gefiltert (Titel/Interpret, sonst Liedtext). */
  async list({ query = '', tag = '' } = {}) {
    let songs = await this.#live();
    if (tag) songs = songs.filter((s) => s.tags.includes(tag));
    const q = normalize(query.trim());
    if (!q) return SongRepository.sort(songs);
    const words = q.split(/\s+/);
    const matches = (text) => words.every((w) => text.includes(w));
    const head = [];
    const body = [];
    for (const s of songs) {
      if (matches(normalize(`${s.title} ${s.artist} ${s.tags.join(' ')}`))) head.push(s);
      else if (matches(normalize(lyricsText(s.chordpro)))) body.push(s);
    }
    return [...SongRepository.sort(head), ...SongRepository.sort(body)];
  }

  async get(id) {
    const s = await this.store.get(id);
    return s && !s.deletedAt ? s : undefined;
  }

  create(chordpro = '', extra = {}) {
    return this.#serial(async () => {
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
    });
  }

  #changed() {
    this.dispatchEvent(new Event('change'));
  }

  // Schreibvorgänge nacheinander ausführen: sonst lesen zwei gleichzeitige Änderungen
  // (z. B. Text und Notiz) denselben alten Stand und die zweite überschreibt die erste.
  #queue = Promise.resolve();
  #serial(fn) {
    const run = this.#queue.then(fn, fn);
    this.#queue = run.catch(() => {});
    return run;
  }

  /** Zeitstempel, der sicher nach dem bisherigen liegt (auch bei falsch gehender Uhr). */
  #stamp(old) {
    const t = this.now();
    if (!old?.updatedAt || t > old.updatedAt) return t;
    return new Date(Date.parse(old.updatedAt) + 1).toISOString();
  }

  /** Ändert chordpro, transpose und/oder accidentals. */
  update(id, changes) {
    return this.#serial(async () => {
      const old = await this.get(id);
      if (!old) throw new Error(`Lied ${id} nicht gefunden`);
      const rec = { ...old, updatedAt: this.#stamp(old) };
      if ('chordpro' in changes) Object.assign(rec, { chordpro: changes.chordpro }, deriveSummary(changes.chordpro));
      if ('transpose' in changes) rec.transpose = ((Math.trunc(changes.transpose) % 12) + 12 + 6) % 12 - 6; // -6 … +5
      if ('accidentals' in changes) rec.accidentals = changes.accidentals;
      if ('note' in changes) rec.note = String(changes.note ?? '').slice(0, 2000);
      await this.store.put(rec);
      this.#changed();
      return rec;
    });
  }

  /** Löscht weich: Datensatz bleibt als Grabstein für einen späteren Sync erhalten. */
  remove(id) {
    return this.#serial(async () => {
      const old = await this.store.get(id);
      if (!old || old.deletedAt) return;
      const t = this.#stamp(old);
      await this.store.put({ ...old, deletedAt: t, updatedAt: t });
      this.#changed();
    });
  }

  /** Holt ein (weich) gelöschtes Lied zurück – für "Rückgängig". */
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

  /** Alle Datensätze einschließlich gelöschter (Grabsteine) – für den Sync. */
  async allRecords() {
    return this.store.getAll();
  }

  /**
   * Übernimmt Fassungen von anderen Geräten, aber nur, wenn sie neuer sind als die lokale
   * (falls hier inzwischen weiter bearbeitet wurde, bleibt die lokale Fassung).
   * @returns {Promise<string[]>} geänderte IDs
   */
  applyRemote(records) {
    return this.#serial(async () => {
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
    });
  }

  async exportData() {
    const songs = SongRepository.sort(await this.#live()).map(
      ({ id, chordpro, transpose, accidentals, note, createdAt, updatedAt }) =>
        ({ id, chordpro, transpose, accidentals, note: note || '', createdAt, updatedAt }),
    );
    return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: this.now(), songs };
  }

  /**
   * Führt eine Sicherung zusammen: neue Lieder kommen dazu, vorhandene werden nur
   * überschrieben, wenn die Sicherung neuer ist.
   */
  importData(data) {
    return this.#serial(async () => {
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
          note: typeof s.note === 'string' ? s.note.slice(0, 2000) : '',
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
    });
  }
}
