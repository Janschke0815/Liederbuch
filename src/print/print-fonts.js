// Eigene Schrift nur für den Druck (in der Druckvorschau einstellbar). Ohne eigene Werte gilt,
// was unter Einstellungen steht. Reine Funktionen, kein DOM.

import { sanitize } from '../settings/settings.js';

export const PRINT_FONT_KEYS = ['lyricFont', 'lyricSize', 'chordFont', 'chordSize'];
const KEY = 'printFonts';

/** Nur die Schriftwerte, die sich von den Einstellungen unterscheiden (gültig gemacht). */
export function cleanPrintFonts(overrides, settings) {
  const base = sanitize(settings);
  const merged = sanitize({ ...base, ...(overrides || {}) });
  const out = {};
  for (const k of PRINT_FONT_KEYS) if (merged[k] !== base[k]) out[k] = merged[k];
  return out;
}

/** Einstellungen mit der Druckschrift darüber. */
export function withPrintFonts(settings, overrides) {
  return sanitize({ ...sanitize(settings), ...cleanPrintFonts(overrides, settings) });
}

/** Schriftgröße um einen Schritt (0,5 pt) ändern, in den Grenzen der Einstellungen. */
export function stepSize(key, value, dir) {
  const [min, max] = key === 'lyricSize' ? [7, 28] : [6, 28];
  return Math.min(max, Math.max(min, Math.round((Number(value) + dir * 0.5) * 2) / 2));
}

export function loadPrintFonts(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage.getItem(KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function savePrintFonts(overrides, settings, storage = globalThis.localStorage) {
  const clean = cleanPrintFonts(overrides, settings);
  if (Object.keys(clean).length) storage.setItem(KEY, JSON.stringify(clean));
  else storage.removeItem(KEY);
  return clean;
}
