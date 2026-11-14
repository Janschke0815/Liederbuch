// "Was kann ich spielen?": Lieder, die nur aus bekannten Griffen bestehen (optional mit Capo).

import { parseChord, noteIndex } from './chords.js';
import { chordType } from './chord-shapes.js';

/** Vergleichsschlüssel: Grundton (0–11) + Akkordtyp; Slash-Bass zählt nicht. */
export function chordKey(name, shift = 0) {
  const c = parseChord(String(name || '').trim());
  if (!c) return null;
  const r = noteIndex(c.root);
  if (r === undefined) return null;
  return `${(((r + shift) % 12) + 12) % 12}:${chordType(c.quality) ?? c.quality}`;
}

/** "G, C D Em am" -> Set von Schlüsseln (Kleinschreibung beim Grundton wird toleriert). */
export function parseKnown(text) {
  const keys = new Set();
  for (const raw of String(text || '').split(/[\s,;]+/)) {
    if (!raw) continue;
    const name = raw[0].toUpperCase() + raw.slice(1);
    const k = chordKey(name);
    if (k) keys.add(k);
  }
  return keys;
}

/**
 * Bund, in dem alle Akkorde mit bekannten Griffen gehen (0 = ohne Capo), sonst null.
 * @param {string[]} chords  Akkorde so, wie sie gespielt werden (inkl. Transposition)
 */
export function playableCapo(chords, known, { withCapo = false, maxCapo = 7 } = {}) {
  if (!known.size || !chords.length) return null;
  for (let capo = 0; capo <= (withCapo ? maxCapo : 0); capo++) {
    if (chords.every((c) => known.has(chordKey(c, -capo)))) return capo;
  }
  return null;
}
