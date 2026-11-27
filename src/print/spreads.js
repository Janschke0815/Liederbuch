// Doppelseiten im Druck: Seite 1 ist eine rechte Seite, gerade Seitenzahlen liegen links.
// Lieder über mehrere Seiten sollen links beginnen, damit man sie aufgeschlagen ganz vor sich hat.
// Reine Funktionen (Reihenfolge, Lücken füllen) – das Setzen der Seiten macht songbook.js.

/** Liegt diese Seite links? (Seite 1 = rechts, wie in einem Buch) */
export const isLeftPage = (number) => number % 2 === 0;

/**
 * Reihenfolge mit möglichst kleinen Änderungen so anpassen, dass mehrseitige Lieder links beginnen
 * und dafür möglichst keine Leerseiten nötig sind. Würde ein mehrseitiges Lied rechts beginnen, gibt
 * es zwei kleinste Eingriffe – genommen wird der kürzere Sprung:
 *   – das nächste einseitige Lied dahinter rückt davor, oder
 *   – das einseitige Lied direkt davor rückt dahinter (nur wenn es selbst nichts verschiebt).
 * Gibt es kein einseitiges Lied mehr, bleibt eine Leerseite.
 * @param {{id: string, pages: number}[]} items  Lieder in Wunsch-Reihenfolge (z. B. A–Z) mit ihrer Seitenzahl
 * @param {number} firstPage  Seitenzahl, auf der das erste Lied beginnt
 * @returns {{order: string[], moved: number, blanks: number}}  moved: Umstellungen; blanks: nötige Leerseiten
 */
export function arrangeSpreads(items, firstPage) {
  const rest = [...items];
  const order = [];
  let page = firstPage;
  let moved = 0;
  let blanks = 0;
  while (rest.length) {
    const next = rest[0];
    if (next.pages > 1 && !isLeftPage(page)) {
      const ahead = rest.findIndex((x, k) => k > 0 && x.pages === 1); // Sprungweite = Index
      const behind = order.length && order.at(-1).pages === 1 ? 1 : Infinity; // über genau ein Lied
      if (ahead > 0 && ahead <= behind) {
        order.push(rest.splice(ahead, 1)[0]);
        page += 1;
        moved++;
        continue;
      }
      if (behind === 1) {
        // einseitiges Lied davor tauscht mit dem mehrseitigen: das beginnt eine Seite früher (links)
        const single = order.pop();
        order.push(rest.shift(), single);
        page += next.pages; // -1 (Lied fehlt davor) + 1 (kommt danach) gleicht sich aus
        moved++;
        continue;
      }
      blanks++;
      page += 1; // Leerseite
    }
    order.push(rest.shift());
    page += next.pages;
  }
  return { order: order.map((x) => x.id), moved, blanks };
}

/**
 * Neue Reihenfolge einiger Lieder in die Gesamtliste übernehmen: Die Plätze dieser Lieder bleiben,
 * sie werden nur in der neuen Reihenfolge besetzt (nicht gewählte Lieder bleiben, wo sie sind).
 * @param {string[]} all  alle Lied-IDs
 * @param {string[]} subset  einige davon, in neuer Reihenfolge
 * @returns {string[]}
 */
export function reorderSubset(all, subset) {
  const inSubset = new Set(subset);
  let k = 0;
  return all.map((id) => (inSubset.has(id) ? subset[k++] : id));
}

/**
 * Lieder nach gespeicherter Reihenfolge; was darin fehlt (neue Lieder), kommt in bisheriger
 * Reihenfolge ans Ende.
 * @template {{id: string}} T
 * @param {T[]} songs  z. B. alphabetisch
 * @param {string[]} order  gespeicherte IDs
 * @returns {T[]}
 */
export function applyOrder(songs, order) {
  const rank = new Map(order.map((id, i) => [id, i]));
  const known = songs.filter((s) => rank.has(s.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
  return [...known, ...songs.filter((s) => !rank.has(s.id))];
}

/**
 * Ein Lied unter den gewählten einen Platz nach vorn (-1) oder hinten (+1) schieben.
 * @param {string[]} ids  gewählte Lieder in Reihenfolge
 * @returns {string[]}  unverändert, wenn es nicht weitergeht
 */
export function moveId(ids, id, dir) {
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
