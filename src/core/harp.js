// Mundharmonika-Tabs (Harp-Tabs): Kanalnummern über dem Text, wie Akkorde in eckigen Klammern.
//   [4]  blasen        [-4]  ziehen         [+4]  blasen (andere Schreibweise)
//   [-3'] [-3''] [-3b]  Bendings           [6o] [6°]  Overblow
//   [4 -4 5]  mehrere Töne an einer Stelle
// Diatonisch 1–10, chromatisch bis 16. Reine Funktionen, kein DOM.

const NOTE = /^[+-]?(?:1[0-6]|[1-9])(?:'{1,3}|b{1,3}|o|°)?$/i;

/** Einzelner Ton, z. B. "-4" oder "3'". */
export function isHarpNote(token) {
  return NOTE.test(String(token).trim());
}

/** Inhalt einer Klammer: ein oder mehrere Töne, durch Leerzeichen getrennt. */
export function isHarpTab(text) {
  const tokens = String(text).trim().split(/\s+/);
  return tokens[0] !== '' && tokens.every(isHarpNote);
}

/**
 * Ganze Zeile aus Harp-Tönen (für den Import von "Tabs über dem Text"). Damit eine Zeile
 * wie "1 2 3" (z. B. Zählzeit) nicht versehentlich als Tab gilt: mindestens ein Ziehton
 * (-) oder Bending, oder mindestens drei Töne.
 */
export function isHarpLine(line) {
  const tokens = String(line).trim().split(/\s+/).filter((t) => !/^\|{1,2}$/.test(t));
  if (!tokens.length || tokens[0] === '' || !tokens.every(isHarpNote)) return false;
  return tokens.some((t) => /^-|['b°o]$/i.test(t)) || tokens.length >= 3;
}
