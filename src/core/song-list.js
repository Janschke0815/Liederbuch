// Liederliste: Sortierung und Erkennen doppelter Lieder.

const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

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
 */
export function sortSongs(songs, mode = 'title', played = {}) {
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

/** Anfangsbuchstabe für Zwischenüberschriften der Liste ("#" für Ziffern, Zeichen, leer). */
export function letterOf(text) {
  const first = String(text || '').trim().charAt(0).toLocaleUpperCase('de');
  return /[A-ZÄÖÜ]/.test(first) ? first.normalize('NFD').charAt(0) : '#';
}

/** Titel/Interpret vergleichbar machen: klein, ohne Akzente, Satzzeichen und Klammerzusätze. */
export function songKey(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
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
