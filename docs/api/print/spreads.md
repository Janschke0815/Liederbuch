# `src/print/spreads.js`

[← Übersicht](../README.md)

Doppelseiten im Druck: Seite 1 ist eine rechte Seite, gerade Seitenzahlen liegen links. Lieder über mehrere Seiten sollen links beginnen, damit man sie aufgeschlagen ganz vor sich hat. Reine Funktionen (Reihenfolge, Lücken füllen) – das Setzen der Seiten macht songbook.js.

**Benutzt von:** [`print-ui.js`](../print-ui.md), [`print/songbook.js`](songbook.md)

## Exportiert

### `isLeftPage(number)`

Liegt diese Seite links? (Seite 1 = rechts, wie in einem Buch)

### `arrangeSpreads(items, firstPage)`

Reihenfolge mit möglichst kleinen Änderungen so anpassen, dass mehrseitige Lieder links beginnen
und dafür möglichst keine Leerseiten nötig sind. Würde ein mehrseitiges Lied rechts beginnen, gibt
es zwei kleinste Eingriffe – genommen wird der kürzere Sprung:
  – das nächste einseitige Lied dahinter rückt davor, oder
  – das einseitige Lied direkt davor rückt dahinter (nur wenn es selbst nichts verschiebt).
Gibt es kein einseitiges Lied mehr, bleibt eine Leerseite.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `items` | `{id: string, pages: number}[]` | Lieder in Wunsch-Reihenfolge (z. B. A–Z) mit ihrer Seitenzahl |
| `firstPage` | `number` | Seitenzahl, auf der das erste Lied beginnt |

**Rückgabe:** `{order: string[], moved: number, blanks: number}` moved: Umstellungen; blanks: nötige Leerseiten

### `reorderSubset(all, subset)`

Neue Reihenfolge einiger Lieder in die Gesamtliste übernehmen: Die Plätze dieser Lieder bleiben,
sie werden nur in der neuen Reihenfolge besetzt (nicht gewählte Lieder bleiben, wo sie sind).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `all` | `string[]` | alle Lied-IDs |
| `subset` | `string[]` | einige davon, in neuer Reihenfolge |

**Rückgabe:** `string[]`

### `applyOrder(songs, order)`

Lieder nach gespeicherter Reihenfolge; was darin fehlt (neue Lieder), kommt in bisheriger
Reihenfolge ans Ende.
@template {{id: string}} T

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` | `T[]` | z. B. alphabetisch |
| `order` | `string[]` | gespeicherte IDs |

**Rückgabe:** `T[]`

### `moveId(ids, id, dir)`

Ein Lied unter den gewählten einen Platz nach vorn (-1) oder hinten (+1) schieben.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `ids` | `string[]` | gewählte Lieder in Reihenfolge |

**Rückgabe:** `string[]` unverändert, wenn es nicht weitergeht
