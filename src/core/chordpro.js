// ChordPro-Parser: Text -> Song-Modell. Reine Funktionen, kein DOM.
//
// Song-Modell:
// {
//   meta: { title, subtitle[], artist[], composer[], album, year, key, capo, tempo, time, ... },
//   blocks: [ { kind: null|'verse'|'chorus'|'bridge'|'tab'|'grid'|'part'|<eigener>, label, lines: [Line] } ]
// }
// Line:
//   { type: 'lyrics', segments: [{ chord, annotation, text }], chordsOnly }
//   { type: 'comment', text, style: 'normal'|'italic'|'box' }
//   { type: 'tab', text }            – Zeile in Tab/Grid-Block, unverändert
//   { type: 'chorus-ref', label }    – {chorus} = Refrain wiederholen
//   { type: 'repeat-start', label } | { type: 'repeat-end' }  – {start_of_repeat: 2×} … {end_of_repeat}
//   { type: 'empty' } | { type: 'new-page' } | { type: 'column-break' }

const ALIASES = {
  t: 'title', st: 'subtitle', c: 'comment', ci: 'comment_italic', cb: 'comment_box',
  soc: 'start_of_chorus', eoc: 'end_of_chorus', sov: 'start_of_verse', eov: 'end_of_verse',
  sob: 'start_of_bridge', eob: 'end_of_bridge', sot: 'start_of_tab', eot: 'end_of_tab',
  sog: 'start_of_grid', eog: 'end_of_grid', np: 'new_page', npp: 'new_physical_page',
  colb: 'column_break', highlight: 'comment',
};

const MULTI_META = new Set(['subtitle', 'artist', 'composer', 'lyricist', 'arranger']);
const SINGLE_META = new Set([
  'title', 'sorttitle', 'album', 'year', 'key', 'capo', 'tempo', 'time', 'duration', 'copyright',
]);

const VERBATIM_KINDS = new Set(['tab', 'grid']);
const FILLER_TEXT = /^[\s|/%.:\-()x×\d*]*$/i;

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
      : { chord: raw, annotation: false };
    last = re.lastIndex;
  }
  flush(line.slice(last));
  const hasChord = segments.some((s) => s.chord);
  const chordsOnly = hasChord && segments.every((s) => FILLER_TEXT.test(s.text));
  return { type: 'lyrics', segments, chordsOnly };
}

function parseDirective(line) {
  const m = /^\s*\{\s*([A-Za-z_][\w-]*)\s*(?:[:\s]\s*([\s\S]*?))?\s*\}\s*$/.exec(line);
  if (!m) return null;
  const name = m[1].toLowerCase();
  return { name: ALIASES[name] || name, value: m[2] ?? '' };
}

function envKind(name) {
  // start_of_chorus -> chorus, start_of_xyz -> xyz
  return name.replace(/^(start|end)_of_/, '');
}

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
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const d = parseDirective(line);

    if (current && VERBATIM_KINDS.has(current.kind)) {
      if (d && d.name.startsWith('end_of_')) {
        current = null;
        loose = null;
      } else {
        current.lines.push({ type: 'tab', text: line });
      }
      continue;
    }

    if (!d) {
      if (/^\s*#/.test(line)) continue; // ChordPro-Kommentarzeile
      if (line.trim() === '') pushLine({ type: 'empty' });
      else pushLine(parseLyricsLine(line));
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
      current = { kind: envKind(name), label: value || null, lines: [] };
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
