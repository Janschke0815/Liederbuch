// Sicherung als ZIP: lesbare ChordPro-Dateien (wie auf dem WebDAV-Server) + vollständige JSON.
//
//   Liederbuch-2026-11-16.zip
//     Lieder/<Titel - Interpret>.cho       Liedtext, Transposition/Notiz als Direktiven
//     Setlisten/<Name>.txt                 eine Zeile pro Lied (Dateiname)
//     liederbuch-sicherung.json            alles inkl. Papierkorb und Zeitstempel
//     LIESMICH.txt
//
// Beim Öffnen:
//   1. Ist die JSON da, wird sie übernommen (Lieder, Setlisten, Papierkorb, Zeitstempel).
//   2. Dann werden die .cho- und .txt-Dateien abgeglichen – mit der JSON bzw., wenn keine da ist,
//      mit dem aktuellen Liederbuch: Eine Datei, die anders aussieht, als die App sie schreiben
//      würde, wurde von Hand geändert und gewinnt; unbekannte Dateien werden neue Lieder bzw.
//      Setlisten. Fehlende Dateien löschen nichts.

import { toFileJson, toWindowsText } from './file-format.js';
import { songBaseName, uniqueName, cleanFileName, SONG_FILE, withTitle, normalizeText, idForFile } from '../sync/song-files.js';
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

Bearbeiten: Lieder und Setlisten dürfen hier direkt geändert, neue .cho-Dateien dazugelegt
werden. Nach dem erneuten Packen und Öffnen in der App gelten die geänderten Dateien.
Gelöschte Dateien löschen in der App nichts.
`;

const lower = (s) => String(s).toLowerCase();
const baseOf = (path) => String(path).replace(/^.*\//, '');
const decode = (e) => new TextDecoder().decode(e.data).replace(/^﻿/, '');

/**
 * Wie die App die Lieder und Setlisten als Dateien benennt und schreibt.
 * Dieselbe Rechnung beim Sichern und beim Abgleich – so erkennt man von Hand Geändertes.
 */
export function planBackup(data) {
  const songFile = new Map(); // Lied-ID -> Dateiname
  const songText = new Map(); // Dateiname (klein) -> Inhalt
  const taken = new Set();
  for (const s of data.songs || []) {
    const name = uniqueName(songBaseName(s.chordpro), taken);
    taken.add(lower(name));
    songFile.set(s.id, name);
    songText.set(lower(name), songToFile(s));
  }
  const setFile = new Map(); // Setlisten-ID -> Dateiname
  const setText = new Map(); // Dateiname (klein) -> Inhalt
  const setTaken = new Set();
  for (const sl of data.setlists || []) {
    const base = cleanFileName(sl.name || 'Setliste');
    let name = base + SETLIST_EXT;
    for (let i = 2; setTaken.has(lower(name)); i++) name = `${base} (${i})${SETLIST_EXT}`;
    setTaken.add(lower(name));
    setFile.set(sl.id, name);
    setText.set(lower(name), setlistToFile(sl, (id) => songFile.get(id) || null));
  }
  return { songFile, songText, setFile, setText };
}

/**
 * Dateien der Sicherung.
 * @param data  exportData() der Lieder, ergänzt um setlists
 * @returns {{name: string, data: string}[]}
 */
export function backupFiles(data) {
  const plan = planBackup(data);
  const files = [];
  for (const s of data.songs || []) files.push({ name: `Lieder/${plan.songFile.get(s.id)}`, data: plan.songText.get(lower(plan.songFile.get(s.id))) });
  for (const sl of data.setlists || []) files.push({ name: `Setlisten/${plan.setFile.get(sl.id)}`, data: plan.setText.get(lower(plan.setFile.get(sl.id))) });
  files.push({ name: BACKUP_JSON, data: toFileJson(data) });
  files.push({ name: 'LIESMICH.txt', data: toWindowsText(README) });
  return files;
}

/** Die vollständige Sicherung aus der ZIP (oder null, wenn keine darin ist). */
export function backupJson(entries) {
  const json = entries.find((e) => lower(baseOf(e.name)) === BACKUP_JSON);
  if (!json) return null;
  try {
    return JSON.parse(decode(json));
  } catch {
    throw new Error(`${BACKUP_JSON} in der ZIP-Datei ist beschädigt`);
  }
}

/**
 * .cho- und .txt-Dateien der ZIP mit einem Stand abgleichen.
 * @param entries  Inhalt der ZIP
 * @param base     Vergleichsstand: die JSON der Sicherung oder das aktuelle Liederbuch
 *                 ({songs, setlists} wie exportData + setlists)
 * @param now      Zeitpunkt für geänderte/neue Einträge (gewinnt damit beim Zusammenführen)
 * @returns {{songs: object[], setlists: object[], edited: number, added: number, setlistsChanged: number}}
 *          nur die geänderten bzw. neuen Datensätze
 */
// Verglichen wird der Inhalt, nicht der Dateitext – eine von Hand geschriebene Datei ohne
// {title:} oder mit anders angeordneten Direktiven ist sonst nie „gleich“.
const sameSong = (a, p) => Boolean(a) && !a.deletedAt &&
  normalizeText(a.chordpro) === p.chordpro &&
  (Number.isInteger(a.transpose) ? a.transpose : 0) === p.transpose &&
  (a.accidentals || 'auto') === p.accidentals &&
  normalizeText(a.note || '') === p.note;
const itemsKey = (items) => JSON.stringify((items || []).map((i) => [i.songId, Number.isInteger(i.transpose) ? i.transpose : null, i.note || '']));
const sameSetlist = (a, p) => Boolean(a) && !a.deletedAt && a.name === p.name && itemsKey(a.items) === itemsKey(p.items);

export function applyZipEdits(entries, base, now, current = null) {
  const plan = planBackup(base);
  const songById = new Map((base.songs || []).map((s) => [s.id, s]));
  const currentSong = new Map((current?.songs || []).map((s) => [s.id, s]));
  const idOfName = new Map([...plan.songFile].map(([id, name]) => [lower(name), id]));
  const songs = [];
  let edited = 0;
  let added = 0;

  const songEntries = entries.filter((e) => SONG_FILE.test(e.name) && !/(^|\/)papierkorb\//i.test(e.name));
  for (const e of songEntries) {
    const name = baseOf(e.name);
    const parsed = fileToSong(withTitle(normalizeText(decode(e)), name));
    // bekannte Datei -> deren Lied; neue Datei -> feste ID aus dem Dateinamen (kein Doppel beim
    // erneuten Öffnen)
    const known = idOfName.get(lower(name));
    const id = known || idForFile(name);
    if (!known) idOfName.set(lower(name), id);
    // unverändert gegenüber der Sicherung bzw. dem Liederbuch: nichts zu tun
    if (sameSong(songById.get(id), parsed) || sameSong(currentSong.get(id), parsed)) continue;
    const prev = songById.get(id) || currentSong.get(id);
    songs.push({ ...(prev || { createdAt: now }), id, ...parsed, updatedAt: now, deletedAt: null });
    if (prev) edited++;
    else added++;
  }

  const setById = new Map((base.setlists || []).map((s) => [s.id, s]));
  const currentSet = new Map((current?.setlists || []).map((s) => [s.id, s]));
  const setIdOfName = new Map([...plan.setFile].map(([id, name]) => [lower(name), id]));
  const songIdOf = (file) => idOfName.get(lower(file)) || idForFile(file);
  const setlists = [];
  for (const e of entries.filter((x) => /(^|\/)setlisten\/[^/]+\.txt$/i.test(x.name))) {
    const name = baseOf(e.name);
    const parsed = fileToSetlist(normalizeText(decode(e)), name, songIdOf);
    const id = setIdOfName.get(lower(name)) || idForFile(name, 'setliste-');
    if (sameSetlist(setById.get(id), parsed) || sameSetlist(currentSet.get(id), parsed)) continue;
    const prev = setById.get(id) || currentSet.get(id);
    setlists.push({ ...(prev || { createdAt: now }), id, ...parsed, updatedAt: now, deletedAt: null });
  }
  return { songs, setlists, edited, added, setlistsChanged: setlists.length };
}
