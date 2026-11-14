// Erkennt, was in einer geöffneten Datei steckt. Reine Funktionen, kein DOM.
//   - Liederbuch-Sicherung (.json)
//   - ChordPro (.cho, .chordpro, .pro, .crd …), auch mehrere Lieder mit {new_song}
//   - Akkorde-über-Text (.txt aus Ultimate Guitar o. ä.) -> wird umgewandelt

import { isChord } from './chords.js';
import { ugToChordPro } from './ug-import.js';

export function looksLikeChordPro(text) {
  if (/^\s*\{\s*(title|t|artist|start_of_\w+|so[cvbtg]|c|comment|key)\s*[:}\s]/im.test(text)) return true;
  for (const m of text.matchAll(/\[([^\]\s]{1,12})\]/g)) if (isChord(m[1])) return true;
  return false;
}

export function splitChordProSongs(text) {
  return text
    .split(/^\s*\{\s*(?:new_song|ns)\s*\}\s*$/im)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s + '\n');
}

function baseName(fileName) {
  return fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
}

function hasTitle(chordpro) {
  return /^\s*\{\s*(title|t)\s*[:\s]/im.test(chordpro);
}

/**
 * @returns {{kind: 'backup', data: object} | {kind: 'songs', songs: string[]}}
 */
export function parseImportFile(fileName, text) {
  text = String(text).replace(/^﻿/, '');
  const isJsonName = /\.json$/i.test(fileName);
  if (isJsonName || /^\s*\{\s*"/.test(text)) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${fileName}: keine gültige JSON-Datei`);
    }
    return { kind: 'backup', data };
  }

  const title = baseName(fileName);
  if (looksLikeChordPro(text)) {
    const songs = splitChordProSongs(text);
    if (songs.length === 1 && !hasTitle(songs[0]) && title) songs[0] = `{title: ${title}}\n` + songs[0];
    return { kind: 'songs', songs };
  }
  return { kind: 'songs', songs: [ugToChordPro(text, { title })] };
}
