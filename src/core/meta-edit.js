// Kopfangaben ({title:}, {capo:}, {time:} …) direkt im ChordPro-Text lesen und setzen.
// Für das Liedinfo-Formular: der Text bleibt die einzige Quelle der Wahrheit.

const NAMES = {
  title: ['title', 't'],
  artist: ['artist'],
  key: ['key'],
  capo: ['capo'],
  harp: ['harp'], // Harp-Tonart der Mundharmonika-Tabs, z. B. C
  time: ['time'],
  tempo: ['tempo'],
  duration: ['duration'], // Liedlänge, z. B. 3:20 – danach richtet sich das Scrollen im Spielmodus
  columns: ['columns', 'col'], // Spalten im Druck: 1 oder 2 (leer = wie Einstellung)
};

// Reihenfolge, in der neue Angaben im Kopf einsortiert werden
const ORDER = ['title', 'subtitle', 'st', 't', 'artist', 'key', 'capo', 'harp', 'time', 'tempo', 'duration', 'columns', 'col', 'tag'];

const directiveRe = (names) => new RegExp(String.raw`^\s*\{\s*(?:${names.join('|')})\s*(?::\s*([^}]*?))?\s*\}\s*$`, 'i');
const ANY_DIRECTIVE = /^\s*\{\s*([a-z_]+)\s*(?::[^}]*)?\}\s*$/i;
const SECTION = /^\s*\{\s*(start_of_|end_of_|so[cvbtg]\b|eo[cvbtg]\b|chorus\b|new_page|np\b|comment|c\b|ci\b|cb\b)/i;

/** Wert einer Kopfangabe ('' wenn nicht vorhanden). */
export function getMeta(text, field) {
  const re = directiveRe(NAMES[field] || [field]);
  for (const line of String(text).split('\n')) {
    const m = re.exec(line);
    if (m) return (m[1] || '').trim();
  }
  return '';
}

/** Alle Formularfelder auf einmal. */
export function getAllMeta(text) {
  return Object.fromEntries(Object.keys(NAMES).map((f) => [f, getMeta(text, f)]));
}

/**
 * Setzt (oder entfernt bei leerem Wert) eine Kopfangabe. Vorhandene Zeile wird ersetzt,
 * sonst wird die Angabe im Kopf (vor dem ersten Abschnitt/Liedtext) passend einsortiert.
 */
export function setMeta(text, field, value) {
  const v = String(value ?? '').replace(/[{}\n]/g, '').trim();
  const lines = String(text).split('\n');
  const re = directiveRe(NAMES[field] || [field]);
  const name = (NAMES[field] || [field])[0];
  const idx = lines.findIndex((l) => re.test(l));
  if (idx >= 0) {
    if (v) lines[idx] = `{${name}: ${v}}`;
    else lines.splice(idx, 1);
    return lines.join('\n');
  }
  if (!v) return text;

  // Kopf = führende Direktiven (ohne Abschnitte/Kommentare)
  let headEnd = 0;
  while (headEnd < lines.length && ANY_DIRECTIVE.test(lines[headEnd]) && !SECTION.test(lines[headEnd])) headEnd++;
  const rank = ORDER.indexOf(name);
  let insertAt = headEnd;
  for (let i = 0; i < headEnd; i++) {
    const n = ANY_DIRECTIVE.exec(lines[i])[1].toLowerCase();
    const r = ORDER.indexOf(n);
    if (r > rank) {
      insertAt = i;
      break;
    }
  }
  lines.splice(insertAt, 0, `{${name}: ${v}}`);
  // Leerzeile zwischen Kopf und Lied, wenn der Kopf neu entsteht
  if (headEnd === 0 && lines[1] !== undefined && lines[1].trim() !== '') lines.splice(1, 0, '');
  return lines.join('\n');
}

const TAG_RE = /^\s*\{\s*tag\s*:\s*([^}]*?)\s*\}\s*$/i;

/** Alle {tag: …}-Angaben. */
export function getTags(text) {
  return String(text).split('\n').map((l) => TAG_RE.exec(l)?.[1]).filter(Boolean);
}

/** Ersetzt alle Tags; neue stehen im Kopf nach den übrigen Angaben. */
export function setTags(text, tags) {
  const clean = [...new Set(tags.map((t) => String(t).replace(/[{}\n]/g, '').trim()).filter(Boolean))];
  const lines = String(text).split('\n');
  const first = lines.findIndex((l) => TAG_RE.test(l));
  const rest = lines.filter((l) => !TAG_RE.test(l));
  if (first >= 0) {
    // an der Stelle der bisherigen Tags einsetzen
    const at = lines.slice(0, first).filter((l) => !TAG_RE.test(l)).length;
    rest.splice(at, 0, ...clean.map((t) => `{tag: ${t}}`));
    return rest.join('\n');
  }
  if (!clean.length) return text;
  let out = rest.join('\n');
  // erst einen Tag regulär einsortieren, die übrigen direkt dahinter
  out = setMeta(out, 'tag', clean[0]);
  const ls = out.split('\n');
  const i = ls.findIndex((l) => TAG_RE.test(l));
  ls.splice(i + 1, 0, ...clean.slice(1).map((t) => `{tag: ${t}}`));
  return ls.join('\n');
}
