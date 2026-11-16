// Druck-Optionen als Schnellwahl: Jede Option im Dialog „Optionen …“ lässt sich mit 📌 in die
// Leiste über der Druckvorschau heften. Hier steht, welche Optionen es gibt, wie sie in der
// Leiste aussehen und welche angeheftet sind. Reine Funktionen (Speicher wird übergeben).

import { stepSize } from './print-fonts.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * store: wo der Wert liegt –
 *   'settings' gemeinsame Einstellungen (gelten auch unter Einstellungen → Druck)
 *   'print'    Druck-Optionen (Titel, Deckblatt …)
 *   'fonts'    Schrift nur für den Druck
 */
export const QUICK_OPTIONS = [
  { key: 'paper', label: 'Papier', kind: 'select', store: 'settings', choices: [['A4', 'A4'], ['A5', 'A5'], ['Letter', 'Letter']] },
  { key: 'columns', label: 'Spalten', kind: 'select', store: 'settings', number: true, choices: [['1', '1 Spalte'], ['2', '2 Spalten']] },
  { key: 'margin', label: 'Rand', kind: 'stepper', store: 'settings', unit: 'mm', step: (v, d) => clamp(Math.round(v) + d, 5, 40) },
  { key: 'pageNumbers', label: 'Seitenzahlen', kind: 'toggle', store: 'settings' },
  { key: 'cover', label: 'Deckblatt', kind: 'toggle', store: 'print' },
  { key: 'toc', label: 'Inhaltsverzeichnis', kind: 'toggle', store: 'print' },
  { key: 'useSavedTranspose', label: 'Transposition', title: 'Gespeicherte Transposition der Lieder verwenden', kind: 'toggle', store: 'print' },
  { key: 'lyricFont', label: 'Textschrift', kind: 'font', store: 'fonts' },
  { key: 'lyricSize', label: 'Text', title: 'Schriftgröße Text', kind: 'stepper', store: 'fonts', unit: 'pt', step: (v, d) => stepSize('lyricSize', v, d) },
  { key: 'chordFont', label: 'Akkordschrift', kind: 'font', store: 'fonts' },
  { key: 'chordSize', label: 'Akkorde', title: 'Schriftgröße Akkorde', kind: 'stepper', store: 'fonts', unit: 'pt', step: (v, d) => stepSize('chordSize', v, d) },
];

export const DEFAULT_PINS = ['pageNumbers', 'lyricSize', 'chordSize'];
const KEY = 'printPins';
const KNOWN = new Set(QUICK_OPTIONS.map((o) => o.key));

/** Angeheftete Optionen in der Reihenfolge der Liste oben. */
export function loadPins(storage = globalThis.localStorage) {
  let pins = DEFAULT_PINS;
  try {
    const v = JSON.parse(storage?.getItem(KEY) || 'null');
    if (Array.isArray(v)) pins = v;
  } catch {
    /* Standard */
  }
  const set = new Set(pins.filter((k) => KNOWN.has(k)));
  return QUICK_OPTIONS.map((o) => o.key).filter((k) => set.has(k));
}

/** Option an- bzw. abheften; liefert die neue Liste. */
export function togglePin(key, storage = globalThis.localStorage) {
  const pins = new Set(loadPins(storage));
  if (pins.has(key)) pins.delete(key);
  else if (KNOWN.has(key)) pins.add(key);
  const list = QUICK_OPTIONS.map((o) => o.key).filter((k) => pins.has(k));
  storage?.setItem(KEY, JSON.stringify(list));
  return list;
}

/** Anzeige eines Wertes in der Leiste, z. B. "12,5 pt", "15 mm". */
export function formatValue(option, value) {
  if (option.kind !== 'stepper') return String(value);
  return `${String(value).replace('.', ',')} ${option.unit}`;
}
