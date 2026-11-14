// Wiederholungsangaben wie "2×", "x2", "(2x)", "2 mal" am Ende eines Textes.
// Werden im Lied als kleines Abzeichen dargestellt statt als Liedtext.

const TOKEN = String.raw`\(?\s*(?:[x×]\s*(\d{1,2})|(\d{1,2})\s*(?:[x×]|mal\b))\s*\)?`;
const TRAIL_RE = new RegExp(String.raw`(^|\s)${TOKEN}\s*$`, 'i');

/**
 * "Refrain x2" -> {text: 'Refrain', times: 2}; ohne Angabe -> {text, times: null}
 */
export function splitRepeat(text) {
  const s = String(text ?? '');
  const m = TRAIL_RE.exec(s);
  if (!m) return { text: s, times: null };
  return { text: s.slice(0, m.index + m[1].length).replace(/\s+$/, ''), times: Number(m[2] || m[3]) };
}

export const formatRepeat = (n) => `${n}×`;

/**
 * Editor: Wiederholung an einer Zeile setzen oder hochzählen.
 * Abschnittsanfang {start_of_…: Name} -> Angabe in den Namen, sonst ans Zeilenende.
 */
export function bumpRepeat(line) {
  const dir = /^(\s*\{\s*(?:start_of_\w+|so[cvbt]|chorus)\s*)(?::\s*([^}]*))?(\}\s*)$/i.exec(line);
  if (dir) {
    const { text, times } = splitRepeat(dir[2] || '');
    const label = [text, formatRepeat(times ? times + 1 : 2)].filter(Boolean).join(' ');
    return `${dir[1].replace(/\s+$/, '')}: ${label}${dir[3]}`;
  }
  const { text, times } = splitRepeat(line);
  if (times) return `${text} (${formatRepeat(times + 1)})`;
  return `${line.replace(/\s+$/, '')} (${formatRepeat(2)})`;
}
