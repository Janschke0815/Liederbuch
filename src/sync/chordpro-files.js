// Liederbuch als reine ChordPro-Dateien (wie beim Programm ChordPro selbst):
//   Lieder/<Titel - Interpret>.cho   Liedtext; Einstellungen der App als Direktiven:
//                                    {transpose: 2}            (offizielles ChordPro)
//                                    {x_accidentals: flat}     (♯/♭-Schreibweise, nur Liederbuch)
//                                    {x_notiz: …}              (Notiz, eine Zeile je Direktive)
//   Setlisten/<Name>.txt             eine Zeile pro Lied (Dateiname), darunter eingerückt
//                                    „Transposition: 2“ und „Notiz: …“
// Andere Programme ignorieren x_-Direktiven (so sieht es der ChordPro-Standard vor).
// Reine Funktionen, kein DOM, keine Netzwerkzugriffe.

import { toWindowsText } from '../core/file-format.js';
import { cleanFileName, normalizeText } from './song-files.js';

export const SETLIST_DIR = 'Setlisten/';
export const SETLIST_EXT = '.txt';

const APP_DIRECTIVE = /^\s*\{\s*(transpose|x_accidentals|x_notiz)\s*:\s*(.*?)\s*\}\s*$/i;
// Kopf-Angaben, hinter denen die App-Direktiven eingefügt werden
const HEAD_DIRECTIVE = /^\s*\{\s*(title|t|subtitle|st|artist|composer|lyricist|arranger|album|year|key|capo|tempo|time|duration|copyright|sorttitle|tag|meta)\s*[:}]/i;

/** Lied (wie in der App) -> Inhalt der .cho-Datei (CR LF). */
export function songToFile(r) {
  const lines = normalizeText(r.chordpro).split('\n');
  const extra = [];
  if (Number.isInteger(r.transpose) && r.transpose !== 0) extra.push(`{transpose: ${r.transpose}}`);
  if (r.accidentals === 'sharp' || r.accidentals === 'flat') extra.push(`{x_accidentals: ${r.accidentals}}`);
  for (const l of normalizeText(r.note).split('\n')) {
    if (l.trim()) extra.push(`{x_notiz: ${l.trim().replace(/\}/g, ')')}}`);
  }
  if (extra.length) {
    let at = 0; // hinter den Kopf-Angaben am Anfang
    for (let i = 0; i < lines.length && HEAD_DIRECTIVE.test(lines[i]); i++) at = i + 1;
    lines.splice(at, 0, ...extra);
  }
  return toWindowsText(lines.join('\n'));
}

/** Inhalt einer .cho-Datei -> Liedtext für die App + Einstellungen. */
export function fileToSong(text) {
  let transpose = 0;
  let accidentals = 'auto';
  const notes = [];
  const kept = [];
  for (const line of normalizeText(text).split('\n')) {
    const m = APP_DIRECTIVE.exec(line);
    if (!m) {
      kept.push(line);
      continue;
    }
    const [, name, value] = m;
    const key = name.toLowerCase();
    if (key === 'transpose') {
      const n = Number.parseInt(value, 10);
      if (Number.isInteger(n)) transpose = Math.max(-11, Math.min(11, n));
    } else if (key === 'x_accidentals') {
      if (/^(sharp|flat)$/i.test(value)) accidentals = value.toLowerCase();
    } else notes.push(value);
  }
  return { chordpro: kept.join('\n'), transpose, accidentals, note: notes.join('\n') };
}

/** Liedtext ohne Titel/Interpret – zum Wiedererkennen einer umbenannten Datei. */
export function songBody(chordpro) {
  return normalizeText(chordpro)
    .split('\n')
    .filter((l) => !/^\s*\{\s*(title|t|subtitle|st|artist)\s*:/i.test(l))
    .join('\n');
}

/** Dateiname einer Setliste. */
export const setlistFileName = (name) => cleanFileName(name || 'Setliste') + SETLIST_EXT;

/**
 * Setliste -> Inhalt der .txt-Datei (CR LF).
 * @param fileOf songId -> Dateiname des Liedes (oder null, wenn unbekannt)
 */
export function setlistToFile(s, fileOf) {
  const lines = [`# Setliste „${s.name}“ – eine Zeile pro Lied (Datei im Ordner Lieder)`];
  for (const item of s.items || []) {
    const file = fileOf(item.songId);
    if (!file) continue;
    lines.push(file);
    if (Number.isInteger(item.transpose)) lines.push(`  Transposition: ${item.transpose}`);
    for (const l of normalizeText(item.note).split('\n')) if (l.trim()) lines.push(`  Notiz: ${l.trim()}`);
  }
  return toWindowsText(lines.join('\n') + '\n');
}

/**
 * Inhalt einer .txt-Datei -> {name, items}.
 * @param idOf Dateiname -> songId
 */
export function fileToSetlist(text, fileName, idOf) {
  const items = [];
  for (const raw of normalizeText(text).split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const sub = /^\s+(transposition|notiz)\s*:\s*(.*)$/i.exec(raw);
    if (sub && items.length) {
      const item = items.at(-1);
      if (sub[1].toLowerCase() === 'transposition') {
        const n = Number.parseInt(sub[2], 10);
        if (Number.isInteger(n)) item.transpose = n;
      } else item.note = item.note ? `${item.note}\n${sub[2].trim()}` : sub[2].trim();
      continue;
    }
    items.push({ songId: idOf(raw.trim()), transpose: null, note: '' });
  }
  return { name: String(fileName).replace(/\.txt$/i, ''), items };
}
