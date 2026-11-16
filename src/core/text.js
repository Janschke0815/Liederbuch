// Textfunktionen, die an mehreren Stellen gebraucht werden: deutsch sortieren, für die Suche
// vereinfachen, Zeilenenden vereinheitlichen. Reine Funktionen.

/** Deutsche Sortierung: Groß/klein und Akzente egal, Zahlen der Größe nach („Lied 2“ vor „Lied 10“). */
export const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });
export const compareText = (a, b) => collator.compare(a ?? '', b ?? '');

/** Für die Suche: klein, ohne Akzente, ß -> ss („Ärger“ findet „arger“). */
export function foldText(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
}

/** Zeilenenden vereinheitlichen (Windows \r\n und altes Mac \r -> \n). */
export const normalizeText = (t) => String(t ?? '').replace(/\r\n?/g, '\n');
