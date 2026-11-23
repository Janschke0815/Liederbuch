# `src/ui/selection.js`

[← Übersicht](../README.md)

Mehrfachauswahl in der Liederliste: Leiste unten (Anzahl, Alle, Aktionen, Löschen) und die Aktionen für alle ausgewählten Lieder – löschen (mit Rückgängig), in ein anderes Liederbuch kopieren, zu einer Setliste hinzufügen. Auswahl selbst (Klick, Strg/Umschalt) steht in list.js.

**Benutzt:** [`books.js`](../books.md), [`context-menu.js`](../context-menu.md), [`core/song-copy.js`](../core/song-copy.md), [`storage/repository.js`](../storage/repository.md), [`storage/stores.js`](../storage/stores.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/list.js`](list.md), [`ui/song.js`](song.md), [`ui/view.js`](view.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async chosen()` – Ausgewählte Lieder in der Reihenfolge der Liste.
- `render()`
- `async deleteSelected()`
- `async copyTo(target)` – In ein anderes Liederbuch kopieren; was es dort schon gibt, wird übersprungen.
- `async addToSetlist(setId)`
- `async newSetlist()`
