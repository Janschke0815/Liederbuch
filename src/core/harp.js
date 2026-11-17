// Mundharmonika-Tabs (Harp-Tabs): Kanalnummern über dem Text, wie Akkorde in eckigen Klammern.
//   [4]  blasen        [-4]  ziehen         [+4]  blasen (andere Schreibweise)
//   [-3'] [-3''] [-3b]  Bendings           [6o] [6°]  Overblow
//   [7 8] [(7 8)] [7,8] [7+8]  mehrere Löcher gleichzeitig – angezeigt als „(7 8)“
// Diatonisch 1–10, chromatisch bis 16. Reine Funktionen, kein DOM.

const NOTE = /^[+-]?(?:1[0-6]|[1-9])(?:'{1,3}|b{1,3}|o|°)?$/i;

/** Einzelner Ton, z. B. "-4" oder "3'". */
export function isHarpNote(token) {
  return NOTE.test(String(token).trim());
}

/**
 * Töne in einer Klammer: „-4“ -> ['-4']; „7 8“, „(7 8)“, „7,8“, „7+8“ -> ['7', '8'].
 * Ein „+“ vor einer Zahl am Anfang bleibt Blaston („+4“), zwischen zwei Tönen trennt es.
 * @returns {string[] | null}  null, wenn es keine Harp-Töne sind
 */
export function harpNotes(text) {
  let t = String(text).trim();
  const paren = /^\((.*)\)$/.exec(t);
  if (paren) t = paren[1].trim();
  const notes = t.split(/\s+|,|(?<=[\d'°ob])\+/i).filter(Boolean);
  return notes.length && notes.every(isHarpNote) ? notes : null;
}

/** Inhalt einer Klammer: ein oder mehrere Töne (siehe harpNotes). */
export function isHarpTab(text) {
  return harpNotes(text) !== null;
}

/** Anzeige eines Harp-Tabs: einzelner Ton wie geschrieben, mehrere Löcher gleichzeitig als „(7 8)“. */
export function harpLabel(text) {
  const notes = harpNotes(text);
  if (!notes) return String(text);
  return notes.length > 1 ? `(${notes.join(' ')})` : notes[0];
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
