// Song-Modell -> DOM. Wird für Vorschau und später für den Druck verwendet.
//
// Akkorde stehen über der richtigen Silbe, ohne Monospace: jedes Akkord-Segment ist ein
// inline-block aus Akkord (oben) und dem ersten Wort darunter. Der restliche Text des
// Segments läuft als normaler Text weiter, damit lange Zeilen umbrechen können.

import { transposeChord, transposeNote, shouldUseFlats, parseChord } from '../core/chords.js';
import { splitRepeat, formatRepeat } from '../core/repeat.js';

const DEFAULT_LABELS = { chorus: 'Refrain', bridge: 'Bridge' };

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function transposeKey(key, steps, useFlats) {
  const k = parseChord(key);
  if (!k || steps === 0) return key;
  return transposeNote(k.root, steps, useFlats) + k.quality;
}

/** Teilt "darling, Clementine" in ["darling, ", "Clementine"] – erstes Wort inkl. Leerzeichen. */
function splitFirstWord(text) {
  const m = /^(\s*\S*\s*)([\s\S]*)$/.exec(text);
  return [m[1], m[2]];
}

const repeatBadge = (n) => {
  const b = el('span', 'repeat', formatRepeat(n));
  b.title = `${n}-mal spielen`;
  return b;
};

/** Wiederholungsangabe am Zeilenende abtrennen. */
function takeLineRepeat(line) {
  const last = line.segments.at(-1);
  if (!last) return { line, times: null };
  const { text, times } = splitRepeat(last.text);
  if (!times) return { line, times: null };
  return { line: { ...line, segments: [...line.segments.slice(0, -1), { ...last, text }] }, times };
}

/**
 * Wiederholungsklammer: umschließt genau das, was wiederholt wird (Zeile, Zeilengruppe
 * oder Abschnitt); die Anzahl steht rechts an der Klammer.
 */
function makeRepeatScope(node, kind, times) {
  node.classList.add('repeat-scope', `repeat-scope--${kind}`);
  node.prepend(repeatBadge(times));
  return node;
}

function renderLyricsLine(original, chordName) {
  const { line, times } = takeLineRepeat(original);
  const div = renderLyricsLineBody(line, chordName);
  if (!times) return div;
  const scope = el('div');
  scope.append(div);
  return makeRepeatScope(scope, 'line', times);
}

function renderLyricsLineBody(line, chordName) {
  const div = el('div', line.chordsOnly ? 'line line--chords' : 'line');
  if (line.chordsOnly) {
    for (const s of line.segments) {
      if (s.chord) div.append(el('span', s.annotation ? 'chord annotation' : 'chord', s.annotation ? s.chord : chordName(s.chord)));
      if (s.text) div.append(el('span', 'chord-filler', s.text));
    }
    return div;
  }
  const hasChords = line.segments.some((s) => s.chord);
  if (hasChords) div.classList.add('line--with-chords');
  for (const s of line.segments) {
    if (!s.chord) {
      div.append(el('span', 'lyric', s.text));
      continue;
    }
    const [head, tail] = splitFirstWord(s.text);
    const seg = el('span', 'seg');
    seg.append(
      el('span', s.annotation ? 'chord annotation' : 'chord', s.annotation ? s.chord : chordName(s.chord)),
      // Zero-width space hält die Textzeile auch bei leerem Text auf Grundlinienhöhe
      el('span', 'lyric', head || '​'),
    );
    div.append(seg);
    if (tail) div.append(el('span', 'lyric', tail));
  }
  return div;
}

function renderLine(line, chordName) {
  switch (line.type) {
    case 'lyrics': return renderLyricsLine(line, chordName);
    case 'comment': return el('p', `comment comment--${line.style}`, line.text);
    case 'chorus-ref': {
      const { text, times } = splitRepeat(line.label || '');
      const p = el('p', 'chorus-ref', text || DEFAULT_LABELS.chorus);
      if (times) p.append(' ', repeatBadge(times));
      return p;
    }
    case 'tab': return document.createTextNode(line.text + '\n');
    case 'new-page': return el('div', 'new-page');
    case 'column-break': return el('div', 'column-break');
    default: return null;
  }
}

function renderBlock(block, chordName) {
  const kind = block.kind || 'none';
  const section = el('section', `block block--${kind}`);
  const { text: labelText, times } = splitRepeat(block.label || '');
  const label = labelText || DEFAULT_LABELS[block.kind];
  if (label) section.append(el('div', 'block-label', label));
  if (times) makeRepeatScope(section, 'block', times);

  if (block.kind === 'tab' || block.kind === 'grid') {
    const pre = el('pre', 'tab');
    for (const l of block.lines) pre.append(renderLine(l, chordName));
    section.append(pre);
    return section;
  }

  // Absätze (durch Leerzeilen getrennt) – im Druck nie mittendrin umbrechen
  let para = null;
  let target = section; // Abschnitt oder offene Wiederholungsgruppe
  for (const line of block.lines) {
    if (line.type === 'empty') {
      para = null;
      continue;
    }
    if (line.type === 'repeat-start') {
      const group = el('div');
      makeRepeatScope(group, 'group', splitRepeat(line.label || '').times || 2);
      section.append(group);
      target = group;
      para = null;
      continue;
    }
    if (line.type === 'repeat-end') {
      target = section;
      para = null;
      continue;
    }
    if (!para) {
      para = el('div', 'para');
      target.append(para);
    }
    const node = renderLine(line, chordName);
    if (node) para.append(node);
  }
  return section;
}

function firstChord(song) {
  for (const b of song.blocks)
    for (const l of b.lines)
      if (l.type === 'lyrics')
        for (const s of l.segments) if (s.chord && !s.annotation && parseChord(s.chord)) return s.chord;
  return null;
}

/**
 * Klingende Tonart nach Transposition: {key:} oder ersatzweise der erste Akkord.
 * @returns {{key: string, guessed: boolean} | null}
 */
export function songKey(song, opts = {}) {
  const steps = opts.transpose || 0;
  let base = song.meta.key;
  if (!base) {
    const c = parseChord(firstChord(song) || '');
    if (!c) return null;
    base = c.root + (/^m(?!aj)/.test(c.quality) ? 'm' : '');
  }
  const useFlats = shouldUseFlats(opts.accidentals || 'auto', base, steps);
  const key = steps === 0 && (opts.accidentals || 'auto') === 'auto' ? base : transposeKey(base, steps, useFlats);
  return { key, guessed: !song.meta.key };
}

/**
 * @param {object} song  Ergebnis von parseChordPro
 * @param {{transpose?: number, accidentals?: 'auto'|'sharp'|'flat'}} [opts]
 * @returns {HTMLElement}
 */
export function renderSong(song, opts = {}) {
  const steps = opts.transpose || 0;
  const mode = opts.accidentals || 'auto';
  const key = song.meta.key;
  const untouched = steps === 0 && mode === 'auto';
  // Ohne {key:} dient der erste Akkord als Anhaltspunkt für # oder b
  const useFlats = shouldUseFlats(mode, key || firstChord(song), steps);
  const chordName = untouched ? (c) => c : (c) => transposeChord(c, steps, useFlats);

  const article = el('article', 'song');
  const header = el('header', 'song-header');
  header.append(el('h1', 'song-title', song.meta.title || 'Ohne Titel'));
  for (const st of song.meta.subtitle || []) header.append(el('p', 'song-subtitle', st));
  if (song.meta.artist?.length) header.append(el('p', 'song-artist', song.meta.artist.join(', ')));

  const info = [];
  if (key) info.push(`Tonart: ${untouched ? key : transposeKey(key, steps, useFlats)}`);
  if (song.meta.capo && Number(song.meta.capo) > 0) info.push(`Capo ${song.meta.capo}. Bund`);
  else if (song.meta.capo && !/^0*$/.test(song.meta.capo)) info.push(`Capo ${song.meta.capo}`);
  if (steps) info.push(`transponiert ${steps > 0 ? '+' : ''}${steps}`);
  if (song.meta.time) info.push(`${song.meta.time}-Takt`);
  if (song.meta.tempo) info.push(/^\d+$/.test(song.meta.tempo) ? `♩ = ${song.meta.tempo}` : song.meta.tempo);
  if (info.length) header.append(el('p', 'song-info', info.join(' · ')));
  article.append(header);

  const body = el('div', 'song-body');
  for (const block of song.blocks) body.append(renderBlock(block, chordName));
  article.append(body);
  return article;
}
