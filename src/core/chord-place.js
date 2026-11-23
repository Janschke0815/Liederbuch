// Akkorde per Antippen setzen: eine Stelle im sichtbaren Liedtext (Zeile + Spalte) wird in den
// ChordPro-Text übersetzt. Reine Funktionen, kein DOM (getestet in tests/chord-place.test.js).
//
// Zeile = Nummer der Textzeile (ab 0, wie line.src aus dem Parser), Spalte = Zeichen im sichtbaren
// Text dieser Zeile, also ohne [Akkorde]. Spalte 3 in „Oh my [C]darling“ ist das „m“; ein Akkord
// „an Spalte 6“ steht vor dem „d“ von „darling“.

import { parseChordPro } from './chordpro.js';
import { isHarpTab } from './harp.js';

const BRACKET = /\[([^\]]*)\]/g;

/**
 * Sichtbarer Text einer Zeile und wo jedes sichtbare Zeichen im Rohtext steht.
 * @param {string} raw  Zeile mit [Akkorden]
 * @returns {{text: string, toRaw: number[]}}  toRaw[i] = Index im Rohtext; toRaw[text.length] = Zeilenende
 */
export function visibleColumns(raw) {
  let text = '';
  const toRaw = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '[') {
      const end = raw.indexOf(']', i);
      if (end > i) {
        i = end;
        continue;
      }
    }
    text += raw[i];
    toRaw.push(i);
  }
  toRaw.push(raw.length);
  return { text, toRaw };
}

/** Rohtext-Bereich zwischen sichtbarem Zeichen col−1 und col – dort stehen die Klammern „an Spalte col“. */
function slot(raw, col) {
  const { text, toRaw } = visibleColumns(raw);
  const c = Math.max(0, Math.min(col, text.length));
  return { from: c === 0 ? 0 : toRaw[c - 1] + 1, to: toRaw[c] };
}

const isGuitarChord = (inner) => inner.trim() && !inner.trim().startsWith('*') && !isHarpTab(inner.trim());

/** Gitarren-Akkord-Klammer im Bereich (keine Anmerkung [*…], kein Mundharmonika-Tab). */
function chordBracket(raw, from, to) {
  BRACKET.lastIndex = from;
  let m;
  while ((m = BRACKET.exec(raw)) && m.index < to) {
    if (isGuitarChord(m[1])) return { start: m.index, end: m.index + m[0].length, chord: m[1].trim() };
  }
  return null;
}

const splitLines = (text) => String(text).replace(/\r\n?/g, '\n').split('\n');

/**
 * Akkord an einer Stelle (oder null).
 * @param {string} text  ganzer ChordPro-Text
 * @param {number} line  Zeilennummer (ab 0)
 * @param {number} col   Spalte im sichtbaren Text
 */
export function chordAt(text, line, col) {
  const raw = splitLines(text)[line];
  if (raw === undefined) return null;
  const { from, to } = slot(raw, col);
  return chordBracket(raw, from, to)?.chord ?? null;
}

/**
 * Akkord an eine Stelle setzen; ein vorhandener Akkord dort wird ersetzt. Vor einem Mundharmonika-Tab
 * an derselben Stelle eingefügt ([C][4]Text).
 * @returns {string} neuer Text
 */
export function setChordAt(text, line, col, chord) {
  const lines = splitLines(text);
  const raw = lines[line];
  if (raw === undefined) return text;
  const { from, to } = slot(raw, col);
  const old = chordBracket(raw, from, to);
  const tag = `[${chord.trim()}]`;
  lines[line] = old ? raw.slice(0, old.start) + tag + raw.slice(old.end) : raw.slice(0, from) + tag + raw.slice(from);
  return lines.join('\n');
}

/** Akkord an einer Stelle entfernen (sonst unverändert). */
export function removeChordAt(text, line, col) {
  const lines = splitLines(text);
  const raw = lines[line];
  if (raw === undefined) return text;
  const { from, to } = slot(raw, col);
  const old = chordBracket(raw, from, to);
  if (!old) return text;
  lines[line] = raw.slice(0, old.start) + raw.slice(old.end);
  return lines.join('\n');
}

/** Sichtbare Spalten, an denen ein Gitarren-Akkord steht. */
function chordColumns(raw) {
  const cols = [];
  let visible = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '[') {
      const end = raw.indexOf(']', i);
      if (end > i) {
        if (isGuitarChord(raw.slice(i + 1, end))) cols.push(visible);
        i = end;
        continue;
      }
    }
    visible++;
  }
  return cols;
}

const SEPARATOR = /[\s-]/; // Wortgrenze bzw. Silbengrenze bei „Gas-o-line“

/**
 * Getippte Spalte am Anfang des Wortes bzw. der Silbe einrasten: Ein Tipp irgendwo auf „sweet“ setzt den
 * Akkord vor das „s“; bei „Gas-o-line“ vor die getippte Silbe. Steht im Wort vor der getippten Stelle
 * schon ein Akkord (z. B. „A[G]mazing“), rastet die Spalte dort ein – so wird er ausgewählt statt
 * daneben ein zweiter gesetzt. Ein Tipp auf ein Leerzeichen springt zum nächsten Wort.
 * @returns {number} Spalte
 */
export function snapColumn(text, line, col) {
  const raw = splitLines(text)[line];
  if (raw === undefined) return col;
  const vis = visibleColumns(raw).text;
  let c = Math.max(0, Math.min(col, vis.length));
  if (c === vis.length) return c;
  if (SEPARATOR.test(vis[c])) {
    while (c < vis.length && SEPARATOR.test(vis[c])) c++; // zum nächsten Wort bzw. zur nächsten Silbe
    return c;
  }
  let start = c;
  while (start > 0 && !SEPARATOR.test(vis[start - 1])) start--;
  const inWord = chordColumns(raw).filter((x) => x >= start && x <= c);
  return inWord.length ? inWord.at(-1) : start;
}

/**
 * Alle Gitarren-Akkorde des Liedes, jeder einmal, in der Reihenfolge ihres ersten Vorkommens.
 * @returns {string[]}
 */
export function songChords(text) {
  const seen = new Set();
  for (const b of parseChordPro(text).blocks) {
    for (const l of b.lines) {
      if (l.type !== 'lyrics') continue;
      for (const s of l.segments) if (s.chord && !s.annotation && !s.harp) seen.add(s.chord);
    }
  }
  return [...seen];
}
