# `src/ui/selection.js`

[← Übersicht](../README.md)

Mehrfachauswahl in der Liederliste: Leiste unten (Anzahl, Alle, Aktionen, Löschen) und die Aktionen für alle ausgewählten Lieder – löschen (mit Rückgängig), in ein anderes Liederbuch kopieren, zu einer Setliste hinzufügen (song-actions.js). Welche Lieder markiert sind, steht in list-select.js.

**Benutzt:** [`books.js`](../books.md), [`context-menu.js`](../context-menu.md), [`core/song-copy.js`](../core/song-copy.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/list-select.js`](list-select.md), [`ui/list.js`](list.md), [`ui/song-actions.js`](song-actions.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async chosen()` – Ausgewählte Lieder in der Reihenfolge der Liste.
- `render()`
- `async deleteSelected()`
