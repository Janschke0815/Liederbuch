// Capo-Hilfe: In welchem Bund liegt das Lied mit möglichst einfachen Griffen?

import { transposeChord } from './chords.js';
import { isEasyChord } from './chord-shapes.js';

/**
 * Capo-Lagen vorschlagen, in denen das Lied gleich klingt, aber mit möglichst einfachen Griffen.
 * @param {string[]} sounding  klingende Akkorde (ohne Capo gespielt)
 * @param {{maxCapo?: number}} [opts]
 * @returns {{capo: number, chords: string[], easy: number, total: number}[]}  bester Vorschlag zuerst
 */
export function capoOptions(sounding, { maxCapo = 7 } = {}) {
  const unique = [...new Set(sounding)];
  const out = [];
  for (let capo = 0; capo <= maxCapo; capo++) {
    const chords = unique.map((c) => transposeChord(c, -capo, preferFlats(c, capo)));
    const easy = chords.filter(isEasyChord).length;
    out.push({ capo, chords, easy, total: unique.length });
  }
  // mehr einfache Griffe zuerst, bei Gleichstand niedrigerer Bund
  return out.sort((a, b) => b.easy - a.easy || a.capo - b.capo);
}

// Griffe wie Bb/Eb lesen sich für Gitarristen besser als A#/D#
function preferFlats(chord, capo) {
  const shifted = transposeChord(chord, -capo, false);
  return /^(A#|D#|G#)/.test(shifted);
}
