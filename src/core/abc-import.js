// Fertige Noten ins Lied holen: ABC aus dem Internet (abcnotation.com, Volkslied-Sammlungen …) oder eine
// MusicXML-Datei. Reine Textlogik: Stücke trennen, Kopf aufräumen, Liedinfo (Titel, Tonart, Takt, Tempo)
// herauslesen, Notenabschnitt bauen. Der Dialog dazu steht in ui/notes-import.js.

import { musicXmlToAbc } from './musicxml.js';

/** Kopfzeilen, die im Lied stören (Titel, Komponist, Herkunft … stehen schon in der Liedinfo). */
const DROP = /^[TCOABDFGHINRSZ]:/;
/** Kopfzeilen, die für die Noten gelten und bleiben */
const KEEP = /^[MLQKPVU]:/;

/**
 * Text mit einem oder mehreren ABC-Stücken (je ab „X:“) in Stücke zerlegen.
 * Text ohne „X:“ gilt als ein Stück.
 * @param {string} text
 * @returns {{title: string, text: string}[]}
 */
export function splitAbcTunes(text) {
  const src = String(text).replace(/\r\n?/g, '\n');
  const starts = [...src.matchAll(/^X:.*$/gm)].map((m) => m.index);
  const chunks = starts.length ? starts.map((s, i) => src.slice(s, starts[i + 1] ?? src.length)) : [src];
  return chunks
    .map((t) => t.trim())
    .filter((t) => /^[^%\n]*[A-Ga-gz]/m.test(t.replace(/^[A-Za-z]:.*$/gm, '')))
    .map((t, i) => ({ title: /^T:\s*(.*)$/m.exec(t)?.[1].trim() || `Stück ${i + 1}`, text: t }));
}

/**
 * Ein ABC-Stück fürs Lied aufbereiten: Titel, Komponist & Co. aus dem Kopf nehmen (stehen in der
 * Liedinfo), „X:“ weglassen, W:-Strophen unter den Noten weglassen; Takt, Tonart und Tempo merken.
 * @param {string} tune
 * @returns {{abc: string, title: string, composer: string, key: string, time: string, tempo: number|null}}
 */
export function abcForSong(tune) {
  const lines = String(tune).replace(/\r\n?/g, '\n').split('\n');
  const field = (l) => /^([A-Za-z]):\s*(.*)$/.exec(l);
  let inHead = true;
  const out = [];
  const info = { title: '', composer: '', key: '', time: '', tempo: null };
  for (const line of lines) {
    const f = field(line);
    if (f && f[1] === 'T' && !info.title) info.title = f[2].trim();
    if (f && f[1] === 'C' && !info.composer) info.composer = f[2].trim();
    if (f && f[1] === 'M' && !info.time) info.time = f[2].trim().replace(/^C\|$/, '2/2').replace(/^C$/, '4/4');
    if (f && f[1] === 'K' && !info.key) info.key = f[2].trim().split(/\s+/)[0];
    if (f && f[1] === 'Q' && info.tempo === null) info.tempo = Number(/(\d+)\s*$/.exec(f[2])?.[1]) || null;
    if (f && (f[1] === 'X' || f[1] === 'W' || (inHead && DROP.test(line)))) continue;
    if (inHead && f && f[1] === 'K') inHead = false;
    if (inHead && !f && !/^%/.test(line) && line.trim()) inHead = false;
    if (inHead && f && !KEEP.test(line) && !/^[wW]:/.test(line)) continue;
    out.push(line);
  }
  while (out.length && !out.at(-1).trim()) out.pop();
  // Leerzeilen beenden in ABC ein Stück – im Lied bleiben sie also draußen
  return { abc: out.filter((l) => l.trim()).join('\n'), ...info };
}

/**
 * Was eingefügt oder geöffnet wurde, als Liste von Stücken fürs Lied: MusicXML (erkannt am Inhalt)
 * oder ABC (ein oder mehrere Stücke).
 * @param {string} text
 * @param {{part?: number}} [opts]  bei MusicXML: Spur
 * @returns {{kind: 'abc'|'musicxml', tunes: ReturnType<typeof abcForSong>[], parts?: string[], part?: number}}
 * @throws {Error} wenn keine Noten darin stehen
 */
export function readNotes(text, opts = {}) {
  const src = String(text || '').trim();
  if (/^<|<score-partwise|<score-timewise/.test(src)) {
    const r = musicXmlToAbc(src, opts);
    return { kind: 'musicxml', tunes: [r], parts: r.parts, part: r.part };
  }
  const tunes = splitAbcTunes(src).map((t) => abcForSong(t.text)).filter((t) => t.abc.trim());
  if (!tunes.length) throw new Error('Keine Noten gefunden – erwartet wird ABC-Notation oder MusicXML');
  return { kind: 'abc', tunes };
}

/** Sieht eingefügter Text nach einem ganzen Notenstück aus (ABC mit Kopf oder MusicXML)? */
export function looksLikeNotes(text) {
  const s = String(text || '');
  return /<score-(partwise|timewise)[\s>]/.test(s) || (/^X:/m.test(s) && /^K:/m.test(s));
}

/**
 * Notenabschnitt für den Liedtext.
 * @param {string} abc
 * @param {string} [label]
 * @returns {string}
 */
export function abcSection(abc, label = 'Melodie') {
  return `{start_of_abc: label="${String(label).replace(/"/g, "'")}"}\n${abc}\n{end_of_abc}`;
}

/**
 * Notenabschnitt in den Liedtext setzen und fehlende Liedinfo ergänzen – als ein Schritt.
 * Steht die Stelle mitten in einer Zeile wie „{title: …}“, kommen die Noten hinter diese Zeile.
 * Liedinfo: leere Zeilen wie „{key: }“ werden gefüllt, sonst kommt die Zeile an den Anfang.
 * @param {string} text  Liedtext
 * @param {number} at  Einfügestelle
 * @param {string} section  Notenabschnitt (abcSection)
 * @param {[string, string][]} [meta]  z. B. [['key', 'G'], ['time', '3/4']]
 * @returns {{text: string, cursor: number}}  cursor: hinter dem Notenabschnitt
 */
export function placeNotes(text, at, section, meta = []) {
  let pos = Math.max(0, Math.min(at, text.length));
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineEnd = text.indexOf('\n', pos) < 0 ? text.length : text.indexOf('\n', pos);
  if (pos > lineStart && pos < lineEnd + 1 && /^\s*\{/.test(text.slice(lineStart, lineEnd))) pos = lineEnd;
  const before = text.slice(0, pos);
  const after = text.slice(pos);
  const lead = !before || before.endsWith('\n') ? '' : '\n';
  const tail = after.startsWith('\n') ? '' : '\n';
  let out = `${before}${lead}${section}${tail}`;
  let cursor = out.length;
  out += after;
  const prepend = [];
  for (const [k, v] of meta) {
    const empty = new RegExp(`^\\{\\s*${k}\\s*:\\s*\\}[ \\t]*$`, 'm');
    const m = empty.exec(out);
    if (m) {
      const line = `{${k}: ${v}}`;
      out = out.slice(0, m.index) + line + out.slice(m.index + m[0].length);
      if (m.index < cursor) cursor += line.length - m[0].length;
    } else {
      prepend.push(`{${k}: ${v}}\n`);
    }
  }
  const head = prepend.join('');
  return { text: head + out, cursor: cursor + head.length };
}
