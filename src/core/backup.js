// Sicherung als ZIP: lesbare ChordPro-Dateien (wie auf dem WebDAV-Server) + vollständige JSON.
//
//   Liederbuch-2026-11-16.zip
//     Lieder/<Titel - Interpret>.cho       Liedtext, Transposition/Notiz als Direktiven
//     Setlisten/<Name>.txt                 eine Zeile pro Lied (Dateiname)
//     liederbuch-sicherung.json            alles inkl. Papierkorb und Zeitstempel (zum Wiederherstellen)
//     LIESMICH.txt
//
// Beim Öffnen nimmt die App die JSON; fehlt sie, die .cho- und .txt-Dateien.

import { toFileJson, toWindowsText } from './file-format.js';
import { songBaseName, uniqueName, cleanFileName, SONG_FILE, withTitle } from '../sync/song-files.js';
import { songToFile, fileToSong, setlistToFile, fileToSetlist, SETLIST_EXT } from '../sync/chordpro-files.js';

export const BACKUP_JSON = 'liederbuch-sicherung.json';

const README = `Liederbuch – Sicherung

Lieder/      Jedes Lied als ChordPro-Datei (.cho). Lesbar mit jedem Texteditor, Akkorde stehen in
             eckigen Klammern vor der Silbe. Andere Programme (ChordPro, OnSong, SongbookPro …)
             können diese Dateien direkt übernehmen.
             Transposition und Notiz stehen als {transpose: …} bzw. {x_notiz: …} im Liedkopf.
Setlisten/   Jede Setliste als Textdatei: eine Zeile pro Lied (Dateiname im Ordner Lieder),
             darunter eingerückt „Transposition:“ und „Notiz:“.
${BACKUP_JSON}
             Vollständige Sicherung inkl. Papierkorb und Änderungszeiten.

Wiederherstellen: In der App „Datei öffnen“ und diese ZIP-Datei wählen. Vorhandene Lieder werden
nur ersetzt, wenn die Sicherung neuer ist.
`;

const lower = (s) => String(s).toLowerCase();
const baseOf = (path) => String(path).replace(/^.*\//, '');

/**
 * Dateien der Sicherung.
 * @param data  exportData() der Lieder, ergänzt um setlists
 * @returns {{name: string, data: string}[]}
 */
export function backupFiles(data) {
  const files = [];
  const taken = new Set();
  const fileOf = new Map();
  for (const s of data.songs || []) {
    const name = uniqueName(songBaseName(s.chordpro), taken);
    taken.add(lower(name));
    fileOf.set(s.id, name);
    files.push({ name: `Lieder/${name}`, data: songToFile(s) });
  }
  const setTaken = new Set();
  for (const sl of data.setlists || []) {
    const base = cleanFileName(sl.name || 'Setliste');
    let name = base + SETLIST_EXT;
    for (let i = 2; setTaken.has(lower(name)); i++) name = `${base} (${i})${SETLIST_EXT}`;
    setTaken.add(lower(name));
    files.push({ name: `Setlisten/${name}`, data: setlistToFile(sl, (id) => fileOf.get(id) || null) });
  }
  files.push({ name: BACKUP_JSON, data: toFileJson(data) });
  files.push({ name: 'LIESMICH.txt', data: toWindowsText(README) });
  return files;
}

/**
 * Inhalt einer geöffneten ZIP-Datei auswerten.
 * @param {{name: string, data: Uint8Array}[]} entries
 * @returns {{kind: 'backup', data: object} |
 *           {kind: 'files', songs: {file, chordpro, transpose, accidentals, note}[], setlists: {name, files: string[], items}[]}}
 */
export function parseBackupZip(entries) {
  const dec = new TextDecoder();
  const text = (e) => dec.decode(e.data).replace(/^﻿/, '');
  const json = entries.find((e) => lower(baseOf(e.name)) === BACKUP_JSON);
  if (json) {
    try {
      return { kind: 'backup', data: JSON.parse(text(json)) };
    } catch {
      throw new Error(`${BACKUP_JSON} in der ZIP-Datei ist beschädigt`);
    }
  }
  const songs = entries
    .filter((e) => SONG_FILE.test(e.name))
    .map((e) => ({ file: baseOf(e.name), ...fileToSong(withTitle(text(e), baseOf(e.name))) }));
  const setlists = entries
    .filter((e) => /(^|\/)setlisten\/[^/]+\.txt$/i.test(e.name))
    .map((e) => fileToSetlist(text(e), baseOf(e.name), (file) => file)); // songId vorerst = Dateiname
  if (!songs.length && !setlists.length) throw new Error('In der ZIP-Datei sind keine Lieder');
  return { kind: 'files', songs, setlists };
}
