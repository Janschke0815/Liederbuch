// Mehrere Lieder in ein anderes Liederbuch kopieren: was dort schon steht (gleicher Titel und – falls
// beide einen haben – Interpret), wird übersprungen. Reine Logik, getestet in tests/song-copy.test.js.

import { findDuplicates } from './song-list.js';

/**
 * Welche Lieder kopiert werden und welche es im Ziel schon gibt.
 * @param {{title: string, artist: string}[]} songs     ausgewählte Lieder (Reihenfolge bleibt)
 * @param {{title: string, artist: string}[]} existing  Lieder im Ziel-Liederbuch
 * @returns {{copy: object[], skip: object[]}}
 */
export function planCopy(songs, existing) {
  const seen = [...existing];
  const copy = [];
  const skip = [];
  for (const s of songs) {
    if (findDuplicates(seen, s).length) {
      skip.push(s);
      continue;
    }
    copy.push(s);
    seen.push(s); // doppelt ausgewählt: nur einmal kopieren
  }
  return { copy, skip };
}

/** „3 Lieder“, „1 Lied“ */
export const songCount = (n) => `${n} ${n === 1 ? 'Lied' : 'Lieder'}`;
