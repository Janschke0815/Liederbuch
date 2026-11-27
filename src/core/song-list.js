// Liederliste: Sortierung und Erkennen doppelter Lieder.

import { collator, foldText } from './text.js';

export const SORT_MODES = {
  title: 'Titel',
  artist: 'Interpret',
  updated: 'Zuletzt geändert',
  played: 'Zuletzt gespielt',
};

const titleOf = (s) => (s.sortTitle || s.title || '').trim();
const byTitle = (a, b) => (!titleOf(a) - !titleOf(b)) || collator.compare(titleOf(a), titleOf(b));

/**
 * Lieder sortieren (neues Array).
 * @param songs  Liste aus repo.list()
 * @param mode   title | artist | updated | played
 * @param played Lied-ID -> Zeitpunkt (ISO oder ms) des letzten Spielens
 * @param reverse umgekehrt (Z–A bzw. älteste zuerst); Lieder ohne Titel/Interpret bzw. nie gespielte
 *                bleiben am Ende
 */
export function sortSongs(songs, mode = 'title', played = {}, reverse = false) {
  const sorted = sortForward(songs, mode, played);
  if (!reverse) return sorted;
  const missing = (s) => (mode === 'artist' ? !s.artist : mode === 'played' ? !played[s.id] : mode === 'title' ? !titleOf(s) : false);
  return [...sorted.filter((s) => !missing(s)).reverse(), ...sorted.filter(missing)];
}

/**
 * Beschriftung der Sortierrichtung: „A–Z“/„Z–A“ (Titel, Interpret) bzw. „neueste zuerst“/„älteste zuerst“.
 * @returns {string}
 */
export function sortDirectionLabel(mode, reverse = false) {
  if (mode === 'updated' || mode === 'played') return reverse ? 'älteste zuerst' : 'neueste zuerst';
  return reverse ? 'Z–A' : 'A–Z';
}

function sortForward(songs, mode, played) {
  const list = [...songs];
  switch (mode) {
    case 'artist':
      return list.sort((a, b) => (!a.artist - !b.artist) || collator.compare(a.artist || '', b.artist || '') || byTitle(a, b));
    case 'updated':
      return list.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || byTitle(a, b));
    case 'played': {
      const t = (s) => (played[s.id] ? new Date(played[s.id]).getTime() : 0);
      return list.sort((a, b) => t(b) - t(a) || byTitle(a, b));
    }
    default:
      return list.sort(byTitle);
  }
}

/**
 * Tags für die rechte Seite eines Listeneintrags: der gewählte Filter-Tag zuerst, dann die übrigen
 * in ihrer Reihenfolge; höchstens `max` sichtbar, der Rest wird gezählt („+2“).
 * @param {string[]} tags
 * @param {{max?: number, active?: string}} [opts]
 * @returns {{shown: string[], more: number}}
 */
export function listTags(tags = [], { max = 3, active = '' } = {}) {
  const ordered = active && tags.includes(active) ? [active, ...tags.filter((t) => t !== active)] : [...tags];
  const shown = ordered.slice(0, max);
  return { shown, more: ordered.length - shown.length };
}

/** Anfangsbuchstabe für Zwischenüberschriften der Liste ("#" für Ziffern, Zeichen, leer). */
export function letterOf(text) {
  const first = String(text || '').trim().charAt(0).toLocaleUpperCase('de');
  return /[A-ZÄÖÜ]/.test(first) ? first.normalize('NFD').charAt(0) : '#';
}

/** Titel/Interpret vergleichbar machen: klein, ohne Akzente, Satzzeichen und Klammerzusätze. */
export function songKey(text) {
  return foldText(text)
    .replace(/\s*[([].*?[)\]]\s*/g, ' ') // „(Live)“, „[Acoustic]“
    .replace(/^(the|der|die|das)\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Vorhandene Lieder mit gleichem Titel (und, falls beide einen haben, gleichem Interpreten).
 * @returns {object[]} Treffer aus songs
 */
export function findDuplicates(songs, { title, artist }) {
  const t = songKey(title);
  if (!t) return [];
  const a = songKey(artist);
  return songs.filter((s) => songKey(s.title) === t && (!a || !s.artist || songKey(s.artist) === a));
}
