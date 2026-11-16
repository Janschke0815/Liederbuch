// Rechnungen für den Spielmodus – ohne Bildschirmzugriff, damit sie sich testen lassen.
// Positionen sind Pixel: einspaltig senkrecht (scrollTop), zweispaltig waagerecht (scrollLeft).

export const DEFAULT_SECONDS = 180; // angenommene Liedlänge ohne {duration}

/** "3:20" oder "200" -> Sekunden (sonst null). */
export function durationSeconds(value) {
  const s = String(value || '').trim();
  const m = /^(\d+):(\d{1,2})$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

/** Liedlänge in Sekunden ({duration} oder 3 Minuten). */
export const songSeconds = (duration) => durationSeconds(duration) || DEFAULT_SECONDS;

/**
 * Grundgeschwindigkeit beim einspaltigen Scrollen: Der Text läuft in der Liedlänge einmal durch.
 * @param travel  Strecke in Pixeln, die gescrollt werden muss
 */
export const pixelsPerSecond = (travel, duration) => Math.max(200, travel) / songSeconds(duration);

/**
 * Zweispaltig: Doppelseiten bei 0, w, 2w … – die letzte kann nur halb gefüllt sein und endet bei max.
 * @param max  größte Scroll-Position
 * @param w    Breite einer Doppelseite
 */
export const pageCount = (max, w) => Math.max(1, Math.ceil(max / w - 0.02) + 1);
export const pageIndex = (pos, max, w) => (pos >= max - 2 ? pageCount(max, w) - 1 : Math.round(pos / w));
export const pagePos = (i, max, w) => Math.min(Math.min(Math.max(i, 0), pageCount(max, w) - 1) * w, max);
/** Nächste Doppelseite zu einer beliebigen Position. */
export const snapPos = (pos, max, w) => pagePos(Math.round(pos / w), max, w);

/** Sekunden pro Doppelseite beim automatischen Umblättern. */
export const secondsPerPage = (duration, pages, speed) => songSeconds(duration) / pages / speed;
