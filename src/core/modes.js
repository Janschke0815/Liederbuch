// Einfache Ansicht oder Expertenmodus, Mundharmonika-Werkzeuge an oder aus: Startwerte beim ersten Start
// einer Version, die das kennt. Reine Logik, kein DOM (Anwenden: src/modes.js).

import { isHarpTab } from './harp.js';

/** Enthält der ChordPro-Text Mundharmonika-Tabs wie [4], [-4] oder [-3']? */
export function usesHarp(chordpro) {
  for (const m of String(chordpro).matchAll(/\[([^\]\n]+)\]/g)) {
    if (isHarpTab(m[1])) return true;
  }
  return false;
}

/**
 * Startwerte, solange noch nichts gewählt ist. Wer die App schon benutzt (eigene Lieder, Setlisten,
 * weitere Liederbücher, Cloud), behält alle Funktionen – nach einem Update verschwindet nichts.
 * Wer neu anfängt, sieht die einfache Ansicht. Mundharmonika ist an, sobald ein eigenes Lied Harp-Tabs
 * hat oder eigene Harps eingetragen sind.
 * @param {{songs?: string[], sample?: string, setlists?: number, books?: number, synced?: boolean, harps?: number}} facts
 *   songs: ChordPro-Texte aller Lieder; sample: das mitgelieferte Beispiellied (zählt nicht als eigenes)
 * @returns {{expert: boolean, harp: boolean}}
 */
export function initialModes({ songs = [], sample = '', setlists = 0, books = 1, synced = false, harps = 0 } = {}) {
  const own = songs.filter((text) => text !== sample);
  return {
    expert: own.length > 0 || setlists > 0 || books > 1 || synced,
    harp: harps > 0 || own.some(usesHarp),
  };
}
