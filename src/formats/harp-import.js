// Mundharmonika-Zeilen aus fremden Quellen lesen (z. B. harptabs.com, Ultimate Guitar) und in die
// Schreibweise der App bringen (siehe core/harp.js). Reine Funktionen, kein DOM.
//
// Erkannt wird, was dort üblich ist:
//   -6-6        zwei Töne ohne Leerzeichen dazwischen   -> [-6] [-6] (jeder an seiner Stelle)
//   7,8  4+5    zwei Löcher zugleich                     -> [7 8]
//   -3"         ganzer Ton gebogen                       -> [-3'']
//   -3’ -3´     Bending mit typografischem Apostroph     -> [-3']
//   | 4 -4 |    Taktstriche werden übergangen

import { isHarpNote } from '../core/harp.js';

// ein Ton: Vorzeichen, Kanal 1–16, optional Bending/Overblow
const NOTE_SRC = String.raw`[+-]?(?:1[0-6]|[1-9])(?:'{1,3}|"|’{1,3}|´{1,3}|b{1,3}|o|°)?`;
// mehrere Töne zugleich: 7,8 oder 4+5 (das zweite + gehört nicht zum Ton)
const GROUP = new RegExp(String.raw`^${NOTE_SRC}(?:[,+]${NOTE_SRC})+$`);
const NOTES_IN_CHUNK = new RegExp(NOTE_SRC, 'g');

/** Bending-Zeichen vereinheitlichen: " -> '', ’ und ´ -> '. */
export function normalizeHarpNote(note) {
  return String(note).replace(/"/g, "''").replace(/[’´]/g, "'");
}

/**
 * Teilt einen Block ohne Leerzeichen in Töne – „-6-6“ -> ["-6", "-6"], „7,8“ -> ["7 8"].
 * @returns {{offset: number, text: string}[] | null}  null, wenn der Block keine Harp-Töne sind
 */
function splitChunk(chunk) {
  if (GROUP.test(chunk)) {
    const notes = chunk.split(/,|\+(?=[+-]?\d)/).filter(Boolean).map(normalizeHarpNote);
    return notes.every(isHarpNote) ? [{ offset: 0, text: notes.join(' ') }] : null;
  }
  const out = [];
  let pos = 0;
  for (const m of chunk.matchAll(NOTES_IN_CHUNK)) {
    if (m.index !== pos) return null; // Lücke mit anderen Zeichen
    out.push({ offset: m.index, text: normalizeHarpNote(m[0]) });
    pos = m.index + m[0].length;
  }
  if (pos !== chunk.length || !out.length) return null;
  return out.every((t) => isHarpNote(t.text)) ? out : null;
}

/**
 * Harp-Töne einer Zeile mit ihrer Spalte (für das Einfügen über dem Text).
 * Damit eine Zeile wie „1 2 3“ (Zählzeit) nicht versehentlich als Tab gilt: mindestens ein Ziehton,
 * Bending oder Doppelton, oder mindestens drei Töne.
 * @param {string} line
 * @returns {{col: number, text: string}[] | null}  null, wenn es keine Harp-Zeile ist
 */
export function harpTokens(line) {
  const tokens = [];
  for (const m of String(line).matchAll(/\S+/g)) {
    if (/^\|{1,2}$/.test(m[0])) continue;
    const parts = splitChunk(m[0]);
    if (!parts) return null;
    for (const p of parts) tokens.push({ col: m.index + p.offset, text: p.text });
  }
  if (!tokens.length) return null;
  const typical = tokens.some((t) => /^-|['b°o]$|\s/i.test(t.text));
  return typical || tokens.length >= 3 ? tokens : null;
}

/** Ist die Zeile eine Zeile Mundharmonika-Töne (auch in fremder Schreibweise)? */
export const isHarpRow = (line) => harpTokens(line) !== null;
