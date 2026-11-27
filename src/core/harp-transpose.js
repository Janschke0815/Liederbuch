// Harp-Hilfe: Mundharmonika-Tabs auf einer Harp in einer anderen Tonart spielen.
// Reine Funktionen, kein DOM.
//
// {harp: C} im Lied sagt, für welche Harp die Tabs geschrieben sind – so, wie das Lied mit dem Capo
// aus dem Text klingt (ohne Transponieren). Wird das Lied transponiert, braucht man für dieselben Tabs
// eine Harp in der verschobenen Tonart. Fehlt die Angabe, wird sie aus Tonart und Tabs geschätzt.
//
// Zwei Wege, wenn man diese Harp nicht hat:
//   A  gleiche Tabs, das ganze Lied wandert mit (Akkorde werden transponiert)
//   B  gleiche Tonart, die Tabs werden für die eigene Harp umgeschrieben (evtl. mit Bendings)

import { harpNotes } from './harp.js';
import { HARP_KEYS, harpHoleFor, harpTabMidi } from './harp-melody.js';
import { parseChord } from './chords.js';

export { HARP_KEYS };

const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
const COST = { bend: 3, over: 5, missing: 100 };
const mod12 = (n) => ((n % 12) + 12) % 12;

/**
 * Harp-Tonart aus Text: „C“, „Bb“, „A#“, „f#“, „H“ (deutsch für B).
 * @returns {number}  Tonklasse 0–11, -1 wenn unbekannt
 */
export function parseHarpKey(name) {
  const m = /^\s*([A-Ha-h])\s*([#♯b♭]?)\s*$/.exec(String(name ?? ''));
  if (!m) return -1;
  const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? -1 : 0;
  return mod12(NOTE_PC[m[1].toUpperCase()] + acc);
}

/** Name einer Harp-Tonart („C“, „Bb“, „F#“ …), wie auf den Harps gedruckt. */
export function harpKeyName(key) {
  return HARP_KEYS[mod12(key)];
}

/**
 * Alle einzelnen Töne der Mundharmonika-Tabs im Lied, in Reihenfolge.
 * @param {object} song  Ergebnis von parseChordPro
 * @returns {string[]}
 */
export function songHarpTabs(song) {
  const out = [];
  for (const b of song.blocks)
    for (const l of b.lines)
      if (l.type === 'lyrics') for (const s of l.segments) if (s.harp) out.push(...(harpNotes(s.chord) || []));
  return out;
}

/** Nur 10-Kanal-Harp (diatonisch): Kanäle über 10 lassen sich nicht umrechnen. */
const diatonic = (tabs) => tabs.every((t) => Number(/\d+/.exec(t)[0]) <= 10);

/** Klingender Grundton und Tongeschlecht aus {key:} bzw. erstem Akkord, plus Capo. */
function soundingTonic(song) {
  let base = song.meta.key;
  if (!base) {
    for (const b of song.blocks)
      for (const l of b.lines)
        if (l.type === 'lyrics')
          for (const s of l.segments)
            if (!base && s.chord && !s.harp && !s.annotation && parseChord(s.chord)) {
              const c = parseChord(s.chord);
              base = c.root + (/^m(?!aj)/.test(c.quality) ? 'm' : '');
            }
  }
  const c = base && parseChord(base);
  if (!c) return null;
  const tonic = parseHarpKey(c.root);
  if (tonic < 0) return null;
  return { tonic: mod12(tonic + (Number(song.meta.capo) || 0)), minor: /^m(?!aj)/.test(c.quality) };
}

/**
 * Für welche Harp sind die Tabs geschrieben? Erst {harp:}, sonst geschätzt: Die Töne der Tabs sollen
 * zur Tonart des Liedes passen und der letzte Ton möglichst der Grundton sein. Bei Gleichstand gewinnt
 * die übliche Lage: 2. Lage (Harp eine Quarte über dem Lied, z. B. G-Lied auf C-Harp), dann 1. Lage;
 * bei Moll die 3. Lage (Harp einen Ganzton tiefer). Ohne Tonart: C-Harp.
 * @param {object} song  Ergebnis von parseChordPro
 * @returns {{key: number, guessed: boolean} | null}  null: keine Tabs im Lied
 */
export function writtenHarp(song) {
  const tabs = songHarpTabs(song);
  if (!tabs.length) return null;
  const given = parseHarpKey(song.meta.harp);
  if (given >= 0) return { key: given, guessed: false };
  const home = soundingTonic(song);
  if (!home) return { key: 0, guessed: true };
  const scale = (home.minor ? [0, 2, 3, 5, 7, 8, 9, 10] : [0, 2, 4, 5, 7, 9, 10, 11]).map((i) => mod12(home.tonic + i));
  const prior = home.minor
    ? { [mod12(home.tonic - 2)]: 0.9, [mod12(home.tonic + 3)]: 0.7, [mod12(home.tonic + 5)]: 0.6 }
    : { [mod12(home.tonic + 5)]: 1, [home.tonic]: 0.8 };
  let best = null;
  for (let k = 0; k < 12; k++) {
    const pcs = tabs.map((t) => harpTabMidi(t, k)).filter((m) => m !== null).map(mod12);
    if (!pcs.length) continue;
    const fit = pcs.filter((p) => scale.includes(p)).length / pcs.length;
    const score = fit * 10 + (pcs.at(-1) === home.tonic ? 2 : 0) + (prior[k] || 0);
    if (!best || score > best.score) best = { key: k, score };
  }
  return { key: best ? best.key : 0, guessed: true };
}

/**
 * Harp, auf der die Tabs gerade passen: geschriebene Harp + Transposition.
 * @param {object} song  Ergebnis von parseChordPro
 * @param {number} [transpose]
 * @returns {{key: number, written: number, guessed: boolean} | null}
 */
export function songHarp(song, transpose = 0) {
  const w = writtenHarp(song);
  return w && { key: mod12(w.key + transpose), written: w.key, guessed: w.guessed };
}

/** Halbtöne von einer Harp zur anderen, möglichst kurzer Weg (-6 … +5). */
export function harpShift(from, to) {
  return mod12(to - from + 6) - 6;
}

/**
 * Tabs für eine andere Harp umschreiben – gleicher Klang. Liegt die Melodie zu hoch oder tief,
 * wandert das ganze Lied um Oktaven (nie einzelne Töne).
 * @param {string[]} tabs  einzelne Töne (siehe songHarpTabs)
 * @param {number} from  Harp, für die die Tabs gerade passen
 * @param {number} to  eigene Harp
 * @returns {{map: Map<string, string|null>, bends: number, overs: number, missing: number, octave: number, count: number, ok: boolean}}
 *   map: alter Ton -> neuer Ton (null: gibt es auf der Harp nicht); ok: false bei chromatischen Tabs
 */
export function rewriteHarpTabs(tabs, from, to) {
  const unique = [...new Set(tabs)];
  const empty = { map: new Map(), bends: 0, overs: 0, missing: 0, octave: 0, count: tabs.length };
  if (!diatonic(tabs)) return { ...empty, ok: false };
  let best = null;
  for (const octave of [0, 12, -12, 24, -24]) {
    const map = new Map();
    const kind = new Map();
    for (const t of unique) {
      const midi = harpTabMidi(t, from);
      const hole = midi === null ? null : harpHoleFor(midi + octave, to);
      map.set(t, hole && hole.tab);
      kind.set(t, hole ? hole.kind : 'missing');
    }
    const n = (k) => tabs.filter((t) => kind.get(t) === k).length;
    const r = { map, bends: n('bend'), overs: n('over'), missing: n('missing'), octave, count: tabs.length, ok: true };
    r.score = r.missing * COST.missing + r.bends * COST.bend + r.overs * COST.over;
    if (!best || r.score < best.score) best = r;
  }
  delete best.score;
  return best;
}

/**
 * Was die Harp-Hilfe zur Wahl stellt, wenn man auf Harp `to` spielen will.
 * @param {object} song  Ergebnis von parseChordPro
 * @param {number} transpose  aktuelle Transposition des Liedes
 * @param {number} to  eigene Harp
 * @returns {{from: number, shift: number, rewrite: ReturnType<typeof rewriteHarpTabs>} | null}
 *   shift: Weg A – so viele Halbtöne wandert das Lied; rewrite: Weg B
 */
export function harpChoice(song, transpose, to) {
  const h = songHarp(song, transpose);
  if (!h) return null;
  return { from: h.key, shift: harpShift(h.key, to), rewrite: rewriteHarpTabs(songHarpTabs(song), h.key, to) };
}

/**
 * Für die Anzeige: Tabs umgeschrieben für die gewählte eigene Harp (Weg B) – oder unverändert.
 * @param {object} song  Ergebnis von parseChordPro
 * @param {number} transpose
 * @param {string} [playAs]  gewählte Harp („A“), leer = Tabs wie geschrieben
 * @returns {{harp: string, map: Map<string, string|null>|null} | null}  harp: Name der Harp, auf der man so spielt
 */
export function harpView(song, transpose, playAs = '') {
  const h = songHarp(song, transpose);
  if (!h) return null;
  const to = parseHarpKey(playAs);
  if (to < 0 || to === h.key) return { harp: harpKeyName(h.key), map: null };
  const r = rewriteHarpTabs(songHarpTabs(song), h.key, to);
  return r.ok ? { harp: harpKeyName(to), map: r.map } : { harp: harpKeyName(h.key), map: null };
}

const VERBATIM_START = /^\s*\{\s*(?:start_of_(?:tab|abc|grid)|so[tag])\b/i;
const VERBATIM_END = /^\s*\{\s*(?:end_of_(?:tab|abc|grid)|eo[tag])\b/i;

/**
 * Umgeschriebene Tabs in den ChordPro-Text schreiben (Klammern mit Harp-Tönen; Tab-, Raster- und
 * Notenabschnitte bleiben unberührt). Töne ohne Entsprechung werden zu [*?].
 * @param {string} text
 * @param {Map<string, string|null>} map  aus rewriteHarpTabs
 * @returns {string}
 */
export function rewriteHarpText(text, map) {
  let verbatim = false;
  return String(text).split('\n').map((line) => {
    if (VERBATIM_START.test(line)) verbatim = true;
    else if (VERBATIM_END.test(line)) verbatim = false;
    if (verbatim) return line;
    return line.replace(/\[([^\]]+)\]/g, (all, inner) => {
      const notes = harpNotes(inner);
      if (!notes) return all;
      const out = notes.map((n) => (map.has(n) ? map.get(n) : n)).filter(Boolean);
      if (!out.length) return '[*?]';
      return out.length > 1 ? `[(${out.join(' ')})]` : `[${out[0]}]`;
    });
  }).join('\n');
}
