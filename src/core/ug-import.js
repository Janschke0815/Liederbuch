// Import: "Akkorde über dem Text" (z. B. Ultimate Guitar) -> ChordPro-Text.
// Reine Funktionen, kein DOM.

import { isChord } from './chords.js';
import { splitRepeat, formatRepeat } from './repeat.js';

const FILLER = /^(\|{1,2}|\/|-+|%|\.|:|\*|[x×]\d+|\d+[x×]|\([x×]?\d+[x×]?\)|N\.?C\.?|\.{2,3})$/i;
const PURE_PUNCT = /^(\|{1,2}|\/|-+|\.|:|\*)$/;

const SECTION_WORDS =
  'verse|strophe|vers|chorus|refrain|ref|bridge|intro|outro|pre-?chorus|post-?chorus|solo|interlude|instrumental|zwischenspiel|coda|hook|riff|ending|break';
// optional mit Wiederholung: "Chorus x2", "Refrain (2x)"
const REPEAT_SUFFIX = '(?:\\s*\\(?\\s*(?:[x×]\\s*\\d{1,2}|\\d{1,2}\\s*[x×])\\s*\\)?)?';
const SECTION_NAME = `(?:${SECTION_WORDS})\\.?(?:\\s*\\d+)?${REPEAT_SUFFIX}`;
const SEP = '[:\\-–—]';
// "Verse 1", "Chorus:", "Verse 1 -", "chorus –" allein auf der Zeile
const SECTION_PLAIN_RE = new RegExp(`^\\s*(${SECTION_NAME})\\s*${SEP}?\\s*$`, 'i');
// "Verse 1 - Text …" bzw. "Chorus: Am G": Abschnittsname und Inhalt auf einer Zeile
const SECTION_INLINE_RE = new RegExp(`^(\\s*(${SECTION_NAME})\\s*${SEP}\\s+)(\\S.*)$`, 'i');

function expandTabs(line, width = 4) {
  let out = '';
  for (const ch of line) {
    if (ch === '\t') out += ' '.repeat(width - (out.length % width));
    else out += ch;
  }
  return out;
}

/** Zerlegt eine Zeile in Tokens mit Spaltenposition. Taktstriche sind eigene Tokens. */
function tokenize(line) {
  const tokens = [];
  const re = /\|{1,2}|[^\s|]+/g;
  let m;
  while ((m = re.exec(line))) tokens.push({ col: m.index, text: m[0] });
  return tokens;
}

function stripParens(t) {
  const m = /^\((.+)\)$/.exec(t);
  return m ? m[1] : t;
}

function tokenIsChord(t) {
  return isChord(stripParens(t));
}

export function isChordLine(line) {
  const tokens = tokenize(line);
  if (!tokens.length) return false;
  let chords = 0;
  for (const { text } of tokens) {
    if (tokenIsChord(text)) chords++;
    else if (!FILLER.test(text)) return false;
  }
  return chords > 0;
}

export function isTabLine(line) {
  const t = line.trim();
  const dashes = (t.match(/-/g) || []).length;
  if (/^[A-Ga-g][#b]?\s*[|:]/.test(t) && dashes >= 3) return true;
  return /^[|:]?[-0-9|hpbrsx/\\~^().*\s]+[|:]?$/.test(t) && dashes >= 6;
}

function sectionLabel(line) {
  const br = /^\s*\[([^\]]+)\]\s*$/.exec(line);
  if (br && !isChord(br[1].trim())) return br[1].trim();
  const plain = SECTION_PLAIN_RE.exec(line);
  return plain ? plain[1].trim() : null;
}

export function sectionKind(label) {
  const l = label.toLowerCase();
  if (/^(pre|post)/.test(l)) return 'part';
  if (/^(chorus|refrain|ref\b)/.test(l)) return 'chorus';
  if (/^(verse|strophe|vers)/.test(l)) return 'verse';
  if (/^bridge/.test(l)) return 'bridge';
  return 'part';
}

function metaLine(line) {
  const capo = /^\s*capo\s*[:\-]?\s*(?:on\s*)?(\d+)/i.exec(line) ||
    /^\s*capo\b.*?(\d+)\s*(?:st|nd|rd|th|\.)?\s*(?:fret|bund)/i.exec(line);
  if (capo) return `{capo: ${capo[1]}}`;
  const key = /^\s*(?:key|tonart)\s*:\s*(\S+)\s*$/i.exec(line);
  if (key) return `{key: ${key[1]}}`;
  const time = /^\s*(?:time(?:\s*signature)?|takt(?:art)?)\s*:\s*(\d{1,2}\/\d{1,2})\s*$/i.exec(line);
  if (time) return `{time: ${time[1]}}`;
  const tempo = /^\s*(?:tempo|bpm)\s*:?\s*(\d{2,3})\s*(?:bpm)?\s*$/i.exec(line);
  if (tempo) return `{tempo: ${tempo[1]}}`;
  if (/^\s*(tuning|stimmung)\s*:/i.test(line)) return `{comment: ${line.trim()}}`;
  return null;
}

/** Eckige Klammern im Liedtext würden als Akkorde gelesen -> runde Klammern. */
function escapeLyrics(text) {
  return text.replace(/\[/g, '(').replace(/\]/g, ')');
}

function chordMarker(text) {
  const inner = stripParens(text);
  return isChord(inner) ? `[${inner}]` : `[*${text}]`;
}

/** Akkordzeile + Textzeile -> eine ChordPro-Zeile. */
export function mergeChordLine(chordLine, lyricLine) {
  let lyrics = escapeLyrics(lyricLine.replace(/\s+$/, ''));
  const indent = lyrics.length - lyrics.trimStart().length;
  lyrics = lyrics.slice(indent);

  const tokens = tokenize(chordLine).filter((t) => !PURE_PUNCT.test(t.text));
  const before = [];
  const inline = [];
  const after = [];
  for (const t of tokens) {
    const col = t.col - indent;
    if (col < 0) before.push(t);
    else if (col < lyrics.length) inline.push({ ...t, col });
    else after.push(t);
  }

  let out = lyrics;
  for (const t of inline.sort((a, b) => b.col - a.col)) {
    out = out.slice(0, t.col) + chordMarker(t.text) + out.slice(t.col);
  }
  if (before.length) out = before.map((t) => chordMarker(t.text)).join(' ') + ' ' + out;
  // "x2" hinter dem Textende ist eine Wiederholung, kein Akkord
  let repeat = '';
  const lastAfter = after.at(-1);
  if (lastAfter && !tokenIsChord(lastAfter.text)) {
    const r = splitRepeat(lastAfter.text);
    if (r.times && !r.text) {
      after.pop();
      repeat = ` (${formatRepeat(r.times)})`;
    }
  }
  if (after.length) out = out + (out ? ' ' : '') + after.map((t) => chordMarker(t.text)).join(' ');
  return out + repeat;
}

/** Reine Akkordzeile -> ChordPro, Füllzeichen (|, x2) bleiben als Text. */
export function chordOnlyLine(chordLine) {
  return tokenize(chordLine)
    .map((t) => (tokenIsChord(t.text) ? `[${stripParens(t.text)}]` : t.text))
    .join(' ');
}

/**
 * Zerlegt "Verse 1 - Text" in eine eigene Abschnittszeile und den Inhalt. Der Inhalt
 * behält seine Spalte (der Name wird durch Leerzeichen ersetzt), damit eine Akkordzeile
 * darüber weiterhin passt; diese Akkordzeile wandert hinter die Abschnittsmarke.
 */
export function splitInlineSectionLabels(lines) {
  const out = [];
  for (const line of lines) {
    const m = SECTION_INLINE_RE.exec(line);
    if (!m) {
      out.push(line);
      continue;
    }
    const [, prefix, label, rest] = m;
    const content = ' '.repeat(prefix.length) + rest;
    const prev = out.at(-1);
    if (prev !== undefined && prev.trim() && isChordLine(prev) && !isChordLine(content)) {
      out.pop();
      out.push(`[${label.trim()}]`, prev, content);
    } else {
      out.push(`[${label.trim()}]`, content);
    }
  }
  return out;
}

/**
 * Wandelt "Akkorde über Text" in ChordPro um.
 * @param {string} input
 * @param {{title?: string, artist?: string, key?: string, capo?: string|number}} [meta]
 */
export function ugToChordPro(input, meta = {}) {
  const text = String(input)
    .replace(/\r\n?/g, '\n')
    .replace(/\[\/?(?:ch|tab)\]/g, '');
  const lines = splitInlineSectionLabels(text.split('\n').map((l) => expandTabs(l).replace(/\s+$/, '')));

  const head = [];
  if (meta.title) head.push(`{title: ${meta.title}}`);
  if (meta.artist) head.push(`{artist: ${meta.artist}}`);
  if (meta.key) head.push(`{key: ${meta.key}}`);
  if (meta.capo) head.push(`{capo: ${meta.capo}}`);

  const out = [];
  let pendingSection = null; // Abschnitt angekündigt, aber noch nicht ausgegeben
  let openKind = null; // ausgegebener, noch offener Abschnitt

  const trailingBlanks = () => {
    let n = 0;
    while (out.length && out.at(-1) === '') {
      out.pop();
      n++;
    }
    return n;
  };
  // Schreibt eine Zeile vor die zuletzt ausgegebenen Leerzeilen.
  const pushBeforeBlanks = (line) => {
    const n = trailingBlanks();
    out.push(line);
    for (let k = 0; k < n; k++) out.push('');
  };
  const closeSection = () => {
    if (!openKind) return;
    pushBeforeBlanks(`{end_of_${openKind}}`);
    openKind = null;
  };
  // Abschnittsmarke ohne Inhalt -> als Kommentar erhalten
  const flushEmptySection = () => {
    if (pendingSection) pushBeforeBlanks(`{comment: ${pendingSection.label}}`);
    pendingSection = null;
  };
  const emitContent = (line) => {
    if (pendingSection) {
      const { kind, label } = pendingSection;
      out.push(`{start_of_${kind}: ${label}}`);
      openKind = kind;
      pendingSection = null;
    }
    out.push(line);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '') {
      out.push('');
      continue;
    }

    const label = sectionLabel(line);
    if (label) {
      closeSection();
      flushEmptySection();
      pendingSection = { kind: sectionKind(label), label };
      continue;
    }

    const metaOut = metaLine(line);
    if (metaOut) {
      (metaOut.startsWith('{comment') ? out : head).push(metaOut);
      continue;
    }

    if (isTabLine(line)) {
      const block = [];
      while (i < lines.length && lines[i].trim() !== '' && isTabLine(lines[i])) block.push(lines[i++]);
      i--;
      closeSection();
      const tabLabel = pendingSection ? `: ${pendingSection.label}` : '';
      pendingSection = null;
      out.push(`{start_of_tab${tabLabel}}`, ...block, '{end_of_tab}');
      continue;
    }

    if (isChordLine(line)) {
      const next = lines[i + 1];
      const nextIsLyrics =
        next !== undefined && next.trim() !== '' && !isChordLine(next) && !isTabLine(next) &&
        !sectionLabel(next) && !metaLine(next);
      if (nextIsLyrics) {
        emitContent(mergeChordLine(line, next));
        i++;
      } else {
        emitContent(chordOnlyLine(line));
      }
      continue;
    }

    emitContent(escapeLyrics(line.trim()));
  }

  closeSection();
  flushEmptySection();

  while (out[0] === '') out.shift();
  while (out.at(-1) === '') out.pop();
  // Mehrfache Leerzeilen zusammenfassen
  const body = out.filter((l, idx) => !(l === '' && out[idx - 1] === ''));
  return [...head, ...(head.length && body.length ? [''] : []), ...body].join('\n') + '\n';
}
