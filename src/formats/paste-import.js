// Eingefügter Text (z. B. von Ultimate Guitar kopiert) -> ein oder mehrere Lieder.
// Erkennt Titel/Interpret aus Kopfzeilen, entfernt Füllwerk und trennt mehrere Lieder.

import { ugToChordPro, isChordLine, isTabLine, sectionLabel } from './ug-import.js';
import { looksLikeChordPro, splitChordProSongs } from './file-import.js';
import { parseChordPro } from '../core/chordpro.js';

// "Wonderwall Chords by Oasis", "Hallelujah Ukulele Chords by Leonard Cohen @ Ultimate-Guitar.Com"
const CHORDS_BY = /^\s*(.+?)\s+(?:(?:ukulele\s+|guitar\s+|bass\s+)?(?:chords?|tabs?|akkorde)|guitar\s+pro|official)\s+(?:by|von)\s+(.+?)\s*(?:@.*)?$/i;
const TITLE_LINE = /^\s*(?:title|titel|song|lied)\s*:\s*(.+?)\s*$/i;
const ARTIST_LINE = /^\s*(?:artist|interpret|band|künstler|by|von)\s*:\s*(.+?)\s*$/i;
const DASH = /^\s*([^\-–—]{1,60}?)\s+[-–—]\s+(.{1,80}?)\s*$/;
// Zeilen, die nur zur Webseite gehören
const JUNK = /^\s*(?:difficulty|schwierigkeit|author|tabbed by|transcribed by|ver(?:sion)?\s*\d+|rating|\d[\d.,]*\s*(?:views|aufrufe|ratings?)|strumming\s*:?$|chords?\s*$|tabs?\s*$|print|report bad tab|x\s*$)/i;
const META = /^\s*(?:capo|key|tonart|tuning|stimmung|time|takt|tempo|bpm)\b/i;

const isContent = (l) => isChordLine(l) || isTabLine(l) || sectionLabel(l) || META.test(l);

/**
 * Kopfzeilen auswerten.
 * @returns {{title: string, artist: string, body: string}}
 */
export function detectHeader(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  let title = '';
  let artist = '';
  const drop = new Set();
  let plain = []; // kurze Textzeilen im Kopf (Titel/Interpret ohne Kennzeichnung)
  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) {
      if (plain.length) break; // Kopf-Absatz zu Ende
      continue;
    }
    if (isContent(l)) break;
    let m;
    if ((m = CHORDS_BY.exec(l))) [title, artist] = [title || m[1], artist || m[2]];
    else if ((m = TITLE_LINE.exec(l))) title ||= m[1];
    else if ((m = ARTIST_LINE.exec(l))) artist ||= m[1];
    else if (JUNK.test(l)) {
      /* weglassen */
    } else if (!title && (m = DASH.exec(l))) [artist, title] = [artist || m[1], m[2]];
    else {
      plain.push(i);
      if (plain.length > 2 || l.trim().length > 60) {
        plain = []; // das ist schon Liedtext
        break;
      }
      continue;
    }
    drop.add(i);
  }
  // Ohne Kennzeichnung: erste kurze Zeile = Titel, zweite = Interpret – aber nur, wenn
  // danach noch Inhalt folgt (sonst war es der Liedtext selbst)
  const rest = lines.slice(i).some((l) => l.trim());
  if (plain.length && rest && !title) {
    title = lines[plain[0]].trim();
    drop.add(plain[0]);
    if (plain[1] !== undefined && !artist) {
      artist = lines[plain[1]].trim();
      drop.add(plain[1]);
    }
  }
  const body = lines.filter((_, k) => !drop.has(k)).join('\n').replace(/^\s*\n/, '');
  return { title: clean(title), artist: clean(artist), body };
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/[{}]/g, '').trim();

/** Mehrere Lieder trennen: Linien (---, ===, ***) oder eine neue "… Chords by …"-Kopfzeile. */
export function splitPastedSongs(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const parts = [];
  let cur = [];
  const push = () => {
    if (cur.some((l) => l.trim())) parts.push(cur.join('\n'));
    cur = [];
  };
  for (const l of lines) {
    if (/^\s*(?:-{3,}|={3,}|\*{3,}|_{3,})\s*$/.test(l)) {
      push();
      continue;
    }
    if (CHORDS_BY.test(l) && cur.some((x) => isContent(x))) push();
    cur.push(l);
  }
  push();
  return parts;
}

/**
 * Eingefügten Text in Lieder umwandeln.
 * @param {{title?: string, artist?: string}} [override]  nur bei genau einem Lied verwendet
 * @returns {{chordpro: string, title: string, artist: string}[]}
 */
export function pastedToSongs(text, override = {}) {
  if (!String(text).trim()) return [];
  if (looksLikeChordPro(text)) {
    return splitChordProSongs(text).map((chordpro) => {
      const meta = parseChordPro(chordpro).meta;
      return { chordpro, title: meta.title || '', artist: (meta.artist || []).join(', ') };
    });
  }
  const parts = splitPastedSongs(text);
  return parts.map((part) => {
    const h = detectHeader(part);
    const single = parts.length === 1;
    const title = (single && override.title) || h.title;
    const artist = (single && override.artist) || h.artist;
    return { chordpro: ugToChordPro(h.body, { title, artist }), title, artist };
  });
}
