// Akkord-Erkennung und Transposition. Reine Funktionen, kein DOM.

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_INDEX = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
  H: 11, // deutsche Schreibweise
};

// Grundton, Akkordtyp (m, 7, maj7, sus4, add9, m7b5, 6/9 …), optional Bass, optional Stern(e) am Ende:
// „Am*“ markiert bei Ultimate Guitar & Co. eine Griff-Variante – der Akkord ist trotzdem Am.
export const CHORD_RE =
  /^([A-H][#b]?)((?:maj|min|mi|m|M|dim|aug|sus|add|no|omit|alt|[+°øΔ-]|o(?=\d)|\d+|[#b](?=\d)|\/(?=\d)|\(|\)|,)*)(?:\/([A-H][#b]?))?(\*+)?$/;

/**
 * Akkord zerlegen: „F#m7/C#“ -> {root: 'F#', quality: 'm7', bass: 'C#', mark: ''}.
 * mark: Stern(e) am Ende („Am*“ = Variante von Am); zählt nicht zum Akkordtyp, bleibt beim Transponieren.
 * @returns {{root: string, quality: string, bass: string|null, mark: string} | null}  null, wenn es kein Akkord ist
 */
export function parseChord(name) {
  const m = CHORD_RE.exec(name);
  if (!m) return null;
  return { root: m[1], quality: m[2], bass: m[3] || null, mark: m[4] || '' };
}

/** Ist der Text ein Akkordname (C, Am7, D/F#, Bbsus4 …)? */
export function isChord(name) {
  return CHORD_RE.test(name);
}

const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', // Fis-Dur statt Ges-Dur: unter Gitarristen üblicher
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

/**
 * Einen Ton um Halbtöne verschieben.
 * @param {string} note      z. B. 'F#' oder 'Bb'
 * @param {number} steps     Halbtöne (auch negativ)
 * @param {boolean} useFlats mit b statt # schreiben
 * @returns {string}
 */
export function transposeNote(note, steps, useFlats) {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const n = (((idx + steps) % 12) + 12) % 12;
  return (useFlats ? FLAT : SHARP)[n];
}

/**
 * Entscheidet, ob ♭ oder # verwendet wird.
 * mode: 'sharp' | 'flat' | 'auto'. Bei 'auto' zählt die (transponierte) Tonart.
 */
export function shouldUseFlats(mode, key, steps) {
  if (mode === 'flat') return true;
  if (mode === 'sharp') return false;
  if (!key) return false;
  const k = parseChord(key);
  if (!k) return false;
  const isMinor = /^m(?!aj)/.test(k.quality);
  const target = transposeNote(k.root, steps, false);
  const asFlat = transposeNote(k.root, steps, true);
  return FLAT_KEYS.has(asFlat + (isMinor ? 'm' : '')) || FLAT_KEYS.has(target + (isMinor ? 'm' : ''));
}

/** Transponiert einen Akkordnamen. Unbekannte Namen bleiben unverändert. */
export function transposeChord(name, steps, useFlats) {
  const c = parseChord(name);
  if (!c) return name;
  if (steps === 0 && useFlats === undefined) return name;
  const root = transposeNote(c.root, steps, useFlats);
  const bass = c.bass ? '/' + transposeNote(c.bass, steps, useFlats) : '';
  return root + c.quality + bass + c.mark;
}

/** Halbton-Index 0–11 (C = 0) oder undefined. */
export function noteIndex(note) {
  return NOTE_INDEX[note];
}
