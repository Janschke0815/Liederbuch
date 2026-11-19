// Abo-Datei: ein Liederbuch, das jemand für einen privaten Kreis veröffentlicht. Andere abonnieren es
// (nur lesen) und bekommen Änderungen automatisch.
//
// Die Datei ist nicht verschlüsselt – geschützt wird sie durch den Ort: Sie gehört in einen Ordner, an
// den nur die Gruppe herankommt (z. B. WebDAV-Ordner der NAS mit Anmeldung). Liegt sie unter einer
// offenen Adresse, kann jeder sie lesen, der die Adresse kennt – das wäre bei geschützten Liedern
// eine öffentliche Zugänglichmachung (§ 19a UrhG).
//
// Einladungslink:  <App>#abo=<Adresse der Datei>
//
// Datei (JSON, lesbar):
//   { format: 'liederbuch-abo', version: 1, name, publisher, description, rights: 'privat',
//     publishedAt, songs: [{ id, chordpro, createdAt, updatedAt }], setlists: [{ id, name, items, … }] }
//
// Reine Funktionen, kein DOM.

import { toFileJson } from './file-format.js';

export const ABO_FORMAT = 'liederbuch-abo';
export const ABO_VERSION = 1;
export const ABO_EXT = '.json';

/**
 * Inhalt eines Abos zusammenstellen (nur, was Abonnenten brauchen: keine Notizen, keine Transposition).
 * @param {object[]} songs     Lieder (Datensätze aus dem Repository)
 * @param {object[]} setlists  Setlisten, die mitgehen (Einträge auf nicht enthaltene Lieder fallen weg)
 * @param {{name: string, publisher?: string, description?: string}} meta
 * @param {string} [now]
 */
export function buildAboPayload(songs, setlists, meta, now = new Date().toISOString()) {
  const list = songs.filter((s) => !s.deletedAt).map(({ id, chordpro, createdAt, updatedAt }) => ({ id, chordpro, createdAt, updatedAt }));
  const ids = new Set(list.map((s) => s.id));
  return {
    format: ABO_FORMAT,
    version: ABO_VERSION,
    name: String(meta.name || 'Liederbuch').trim(),
    publisher: String(meta.publisher || '').trim(),
    description: String(meta.description || '').trim(),
    rights: 'privat',
    publishedAt: now,
    songs: list,
    setlists: (setlists || []).filter((s) => !s.deletedAt).map((s) => ({
      id: s.id, name: s.name, createdAt: s.createdAt, updatedAt: s.updatedAt, deletedAt: null,
      items: (s.items || []).filter((i) => ids.has(i.songId)).map((i) => ({ songId: i.songId, transpose: i.transpose ?? null, note: '' })),
    })),
  };
}

/** Inhalt -> Text der Abo-Datei (eingerückt, Windows-Zeilenenden, wie die übrigen Dateien). */
export function aboToText(payload) {
  return toFileJson(payload);
}

/**
 * Text einer Abo-Datei lesen und prüfen.
 * @param {string} text
 * @returns {object}  Inhalt wie buildAboPayload
 * @throws {Error} verständliche Meldung (keine Abo-Datei, neuere Version, beschädigt)
 */
export function parseAbo(text) {
  let file;
  try {
    file = JSON.parse(String(text).replace(/^﻿/, ''));
  } catch {
    throw new Error('Unter dieser Adresse liegt keine Abo-Datei des Liederbuchs');
  }
  if (file?.format !== ABO_FORMAT) throw new Error('Unter dieser Adresse liegt keine Abo-Datei des Liederbuchs');
  if (file.version > ABO_VERSION) throw new Error('Das Abo stammt aus einer neueren Version der App – bitte App neu laden');
  if (!Array.isArray(file.songs)) throw new Error('Die Abo-Datei ist beschädigt');
  file.songs = file.songs.filter((s) => s && typeof s.id === 'string' && typeof s.chordpro === 'string');
  file.setlists = Array.isArray(file.setlists) ? file.setlists.filter((s) => s && typeof s.id === 'string') : [];
  file.name = String(file.name || 'Abonniertes Liederbuch');
  return file;
}

/** Zufälliger, nicht erratbarer Teil für Dateinamen (falls die Datei unter einer offenen Adresse liegt). */
export function randomFilePart() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
}

/** Einladungslink: <App>#abo=<Adresse> */
export function aboLink(appUrl, fileUrl) {
  return `${appUrl}#abo=${encodeURIComponent(fileUrl)}`;
}

/**
 * Einladungslink bzw. dessen Teil hinter „#“ lesen – oder eine nackte Adresse der Datei.
 * @returns {string | null}  Adresse der Abo-Datei
 */
export function parseAboLink(text) {
  const s = String(text || '').trim();
  const m = /#abo=([^&\s]+)/.exec(s);
  let url = s;
  if (m) {
    try {
      url = decodeURIComponent(m[1]);
    } catch {
      return null;
    }
  }
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? url : null; // kein javascript: o. Ä.
  } catch {
    return null;
  }
}
