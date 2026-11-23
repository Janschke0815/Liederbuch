// Angeheftete Aktionen der Kopfleiste: welche, in welcher Reihenfolge. Reine Listen-Logik (getestet);
// die Oberfläche dazu steht in ui/toolbar.js.

/**
 * Gespeicherte Liste säubern: nur bekannte Aktionen, keine doppelten, Reihenfolge bleibt.
 * @param {unknown} pins  gespeicherter Wert
 * @param {string[]} available  IDs der Menüeinträge
 * @returns {string[]}
 */
export function cleanPins(pins, available) {
  if (!Array.isArray(pins)) return [];
  return [...new Set(pins)].filter((id) => available.includes(id));
}

/** Anheften (hinten anfügen) bzw. lösen. */
export function togglePin(pins, id) {
  return pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
}

/** Um eine Stelle verschieben (dir -1 = nach links/oben, +1 = nach rechts/unten); am Rand unverändert. */
export function movePin(pins, id, dir) {
  const i = pins.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= pins.length) return pins;
  const out = [...pins];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
