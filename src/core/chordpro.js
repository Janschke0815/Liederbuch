// ChordPro-Parser: Text -> Song-Modell. Reine Funktionen, kein DOM.
//
// Song-Modell:
// {
//   meta: { title, subtitle[], artist[], composer[], album, year, key, capo, tempo, time, ... },
//   blocks: [ { kind: null|'verse'|'chorus'|'bridge'|'tab'|'grid'|'part'|<eigener>, label, lines: [Line] } ]
// }
// Line:
//   { type: 'lyrics', segments: [{ chord, annotation, harp?, text }], chordsOnly, harpOnly?, src }
//     src: Nummer der Zeile im Text (ab 0) – zum Setzen von Akkorden per Antippen (chord-place.js)
//     harp: Mundharmonika-Tab wie [-4] statt Akkord (siehe harp.js)
//   { type: 'comment', text, style: 'normal'|'italic'|'box' }
//   { type: 'tab', text }            – Zeile in Tab/Grid-Block, unverändert
//   { type: 'abc', text }            – Zeile in einem Notenabschnitt {start_of_abc} (kind 'abc'), unverändert
//   { type: 'chorus-ref', label }    – {chorus} = Refrain wiederholen
//   { type: 'repeat-start', label } | { type: 'repeat-end' }  – {start_of_repeat: 2×} … {end_of_repeat}
//   { type: 'empty' } | { type: 'new-page' } | { type: 'column-break' }

import { isHarpTab } from './harp.js';

const ALIASES = {
  t: 'title', st: 'subtitle', c: 'comment', ci: 'comment_italic', cb: 'comment_box',
  soc: 'start_of_chorus', eoc: 'end_of_chorus', sov: 'start_of_verse', eov: 'end_of_verse',
  sob: 'start_of_bridge', eob: 'end_of_bridge', sot: 'start_of_tab', eot: 'end_of_tab',
  sog: 'start_of_grid', eog: 'end_of_grid', np: 'new_page', npp: 'new_physical_page',
  colb: 'column_break', highlight: 'comment', col: 'columns', soa: 'start_of_abc', eoa: 'end_of_abc',
};

const MULTI_META = new Set(['subtitle', 'artist', 'composer', 'lyricist', 'arranger', 'tag']);
const SINGLE_META = new Set([
  'title', 'sorttitle', 'album', 'year', 'key', 'capo', 'tempo', 'time', 'duration', 'copyright', 'columns',
]);

const VERBATIM_KINDS = new Set(['tab', 'grid', 'abc']);
const FILLER_TEXT = /^[\s|/%.:\-()x×\d*]*$/i;

/**
 * Eine Textzeile mit [Akkorden] in Segmente zerlegen.
 * @param {string} line
 * @returns {{type: 'lyrics', segments: {chord: string|null, annotation: string|null, harp?: string, text: string}[], chordsOnly: boolean}}
 */
export function parseLyricsLine(line) {
  const segments = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let pending = null; // Akkord, dessen Text noch gesammelt wird
  let m;
  const flush = (text) => {
    if (pending) segments.push({ ...pending, text });
    else if (text) segments.push({ chord: null, annotation: false, text });
  };
  while ((m = re.exec(line))) {
    flush(line.slice(last, m.index));
    const raw = m[1].trim();
    pending = raw.startsWith('*')
      ? { chord: raw.slice(1), annotation: true }
      : isHarpTab(raw)
        ? { chord: raw, annotation: false, harp: true } // Mundharmonika-Tab, kein Akkord
        : { chord: raw, annotation: false };
    last = re.lastIndex;
  }
  flush(line.slice(last));
  const hasChord = segments.some((s) => s.chord);
  const chordsOnly = hasChord && segments.every((s) => FILLER_TEXT.test(s.text));
  const harpOnly = chordsOnly && segments.every((s) => !s.chord || s.harp);
  return { type: 'lyrics', segments, chordsOnly, ...(harpOnly ? { harpOnly } : {}) };
}

function parseDirective(line) {
  const m = /^\s*\{\s*([A-Za-z_][\w-]*)\s*(?:[:\s]\s*([\s\S]*?))?\s*\}\s*$/.exec(line);
  if (!m) return null;
  const name = m[1].toLowerCase();
  return { name: ALIASES[name] || name, value: m[2] ?? '' };
}

/** Abschnittsname: „Refrain 2“ oder – Schreibweise ab ChordPro 6 – label="Refrain 2". */
function blockLabel(value) {
  const m = /^label\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))\s*$/i.exec(value || '');
  return (m ? (m[1] ?? m[2] ?? m[3]) : value) || null;
}

function envKind(name) {
  // start_of_chorus -> chorus, start_of_xyz -> xyz
  return name.replace(/^(start|end)_of_/, '');
}

/**
 * ChordPro-Text in das Song-Modell übersetzen (Aufbau siehe Kopf dieser Datei).
 * @param {string} src  der Liedtext
 * @returns {{meta: object, blocks: {kind: string|null, label: string, lines: object[]}[]}}
 */
export function parseChordPro(src) {
  const song = { meta: {}, blocks: [] };
  let current = null; // offener Block ({start_of_…})
  let loose = null; // impliziter Block für Zeilen außerhalb von Umgebungen

  const pushLine = (line) => {
    if (current) {
      current.lines.push(line);
      return;
    }
    if (!loose) {
      loose = { kind: null, label: null, lines: [] };
      song.blocks.push(loose);
    }
    loose.lines.push(line);
  };

  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  for (const [srcIndex, raw] of lines.entries()) {
    const line = raw.replace(/\s+$/, '');
    const d = parseDirective(line);

    if (current && VERBATIM_KINDS.has(current.kind)) {
      if (d && d.name.startsWith('end_of_')) {
        current = null;
        loose = null;
      } else {
        current.lines.push({ type: current.kind === 'abc' ? 'abc' : 'tab', text: line });
      }
      continue;
    }

    if (!d) {
      if (/^\s*#/.test(line)) continue; // ChordPro-Kommentarzeile
      if (line.trim() === '') pushLine({ type: 'empty' });
      else pushLine({ ...parseLyricsLine(line), src: srcIndex });
      continue;
    }

    const { name, value } = d;
    if (MULTI_META.has(name)) {
      (song.meta[name] ||= []).push(value);
    } else if (SINGLE_META.has(name)) {
      song.meta[name] = value;
    } else if (name === 'meta') {
      const [k, ...rest] = value.split(/\s+/);
      if (k) song.meta[k.toLowerCase()] = rest.join(' ');
    } else if (name === 'start_of_repeat') {
      // Wiederholung mehrerer Zeilen innerhalb eines Abschnitts
      pushLine({ type: 'repeat-start', label: value || null });
    } else if (name === 'end_of_repeat') {
      pushLine({ type: 'repeat-end' });
    } else if (name.startsWith('start_of_')) {
      current = { kind: envKind(name), label: blockLabel(value), lines: [] };
      loose = null;
      song.blocks.push(current);
    } else if (name.startsWith('end_of_')) {
      current = null;
      loose = null;
    } else if (name === 'comment' || name === 'comment_italic' || name === 'comment_box') {
      const style = name === 'comment' ? 'normal' : name.slice('comment_'.length);
      pushLine({ type: 'comment', text: value, style });
    } else if (name === 'chorus') {
      pushLine({ type: 'chorus-ref', label: value || null });
    } else if (name === 'new_page' || name === 'new_physical_page') {
      pushLine({ type: 'new-page' });
    } else if (name === 'column_break') {
      pushLine({ type: 'column-break' });
    } else {
      (song.unknown ||= []).push(d);
    }
  }

  // Leere Zeilen am Anfang/Ende eines Blocks entfernen, leere Blöcke verwerfen.
  for (const b of song.blocks) {
    while (b.lines[0]?.type === 'empty') b.lines.shift();
    while (b.lines.at(-1)?.type === 'empty') b.lines.pop();
  }
  song.blocks = song.blocks.filter((b) => b.lines.length || b.label);
  return song;
}
