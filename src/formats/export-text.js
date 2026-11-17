// Lied exportieren: transponierter ChordPro-Text und "Akkorde über dem Text" (z. B. für
// Nachrichten oder Foren). Reine Funktionen, kein DOM.

import { parseChordPro } from '../core/chordpro.js';
import { transposeChord, shouldUseFlats, parseChord } from '../core/chords.js';
import { harpLabel } from '../core/harp.js';

const DEFAULT_LABELS = { verse: 'Strophe', chorus: 'Refrain', bridge: 'Bridge', tab: 'Tab', grid: 'Grid' };

function firstChordName(song) {
  for (const b of song.blocks)
    for (const l of b.lines)
      if (l.type === 'lyrics') for (const s of l.segments) if (s.chord && !s.annotation && parseChord(s.chord)) return s.chord;
  return null;
}

/** Funktion Akkord -> transponierter Akkord, mit derselben #/b-Wahl wie die Anzeige. */
function chordMapper(song, steps, accidentals = 'auto') {
  if (!steps && accidentals === 'auto') return (c) => c;
  const useFlats = shouldUseFlats(accidentals, song.meta.key || firstChordName(song), steps);
  return (c) => transposeChord(c, steps, useFlats);
}

/** ChordPro-Text mit transponierten Akkorden und angepasster {key:}. */
export function transposeChordPro(text, steps = 0, accidentals = 'auto') {
  const song = parseChordPro(text);
  const map = chordMapper(song, steps, accidentals);
  return String(text)
    .split('\n')
    .map((line) => {
      const key = /^(\s*\{\s*key\s*:\s*)([^}]*?)(\s*\}\s*)$/i.exec(line);
      if (key) return key[1] + map(key[2]) + key[3];
      if (/^\s*\{/.test(line)) return line;
      return line.replace(/\[([^\]*][^\]]*)\]/g, (m, c) => (parseChord(c) ? `[${map(c)}]` : m));
    })
    .join('\n');
}

/**
 * Liedzeile mit Akkorden und Mundharmonika-Tabs in getrennten Reihen über dem Text
 * (Akkorde oben, Tabs direkt über dem Text) – so, wie es der Import wieder einliest.
 */
function lyricsToSplitText(line, map) {
  let text = '';
  const rows = { chords: '', harp: '' };
  for (const s of line.segments) {
    if (s.chord) {
      const key = s.harp ? 'harp' : 'chords';
      const name = s.harp ? harpLabel(s.chord) : s.annotation ? s.chord : map(s.chord);
      if (rows[key].length > text.length) text = text.padEnd(rows[key].length);
      rows[key] = rows[key].padEnd(text.length) + name + ' ';
    }
    text += s.text;
  }
  return [rows.chords, rows.harp, text].filter((r) => r.trim()).map((r) => r.replace(/\s+$/, ''));
}

/** Eine Liedzeile als zwei Zeilen: Akkorde (an der richtigen Spalte) über dem Text. */
function lyricsToText(line, map, harpLayout = 'inline') {
  const hasHarp = line.segments.some((s) => s.harp);
  const hasChord = line.segments.some((s) => s.chord && !s.harp);
  if (harpLayout === 'split' && hasHarp && hasChord && !line.chordsOnly) return lyricsToSplitText(line, map);
  let text = '';
  let chords = '';
  for (const s of line.segments) {
    if (s.chord) {
      const name = s.harp ? harpLabel(s.chord) : s.annotation ? s.chord : map(s.chord);
      // Akkord an die aktuelle Textspalte; überlappt er den vorigen, Text auffüllen
      if (chords.length > text.length) text = text.padEnd(chords.length, line.chordsOnly ? ' ' : ' ');
      chords = chords.padEnd(text.length) + name + ' ';
      if (line.chordsOnly) text = text.padEnd(chords.length);
    }
    if (!line.chordsOnly) text += s.text;
    else if (s.text.trim()) {
      chords = chords.padEnd(text.length) + s.text.trim() + ' ';
      text = text.padEnd(chords.length);
    }
  }
  const out = [];
  if (chords.trim()) out.push(chords.replace(/\s+$/, ''));
  if (!line.chordsOnly && text.trim()) out.push(text.replace(/\s+$/, ''));
  return out;
}

/**
 * Ganzes Lied als "Akkorde über dem Text" (für Monospace-Schrift gedacht).
 * opts.harpLayout: 'split' = Mundharmonika-Tabs in eigener Zeile unter den Akkorden.
 */
export function chordproToText(text, steps = 0, accidentals = 'auto', { harpLayout = 'inline' } = {}) {
  const song = parseChordPro(text);
  const map = chordMapper(song, steps, accidentals);
  const out = [];
  const m = song.meta;
  if (m.title) out.push(m.title);
  if (m.artist?.length) out.push(m.artist.join(', '));
  const info = [];
  if (m.key) info.push(`Tonart: ${map(m.key)}`);
  if (m.capo && Number(m.capo) > 0) info.push(`Capo ${m.capo}`);
  if (m.time) info.push(`${m.time}-Takt`);
  if (m.tempo) info.push(`${m.tempo} bpm`);
  if (info.length) out.push(info.join(' · '));
  for (const block of song.blocks) {
    out.push('');
    const label = block.label || DEFAULT_LABELS[block.kind];
    if (label) out.push(`[${label}]`);
    for (const l of block.lines) {
      if (l.type === 'lyrics') out.push(...lyricsToText(l, map, harpLayout));
      else if (l.type === 'comment') out.push(`(${l.text})`);
      else if (l.type === 'chorus-ref') out.push(`→ ${l.label || 'Refrain'}`);
      else if (l.type === 'tab') out.push(l.text);
      else if (l.type === 'empty') out.push('');
    }
  }
  // nur Leerzeilen am Anfang entfernen – führende Leerzeichen einer Akkordzeile zählen
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
}
