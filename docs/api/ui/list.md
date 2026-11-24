# `src/ui/list.js`

[← Übersicht](../README.md)

Liederliste links: Suche, Tag-Filter, Sortierung, Einträge, Kopf weggleiten lassen. Die Liste zeichnet sich selbst neu, wenn sich Lieder ändern oder ein anderes Lied geöffnet wird. „Was kann ich spielen?“ steht in chord-filter.js, die Mehrfachauswahl in list-select.js (Zustand) und selection.js (Leiste, Aktionen).

**Benutzt:** [`core/song-list.js`](../core/song-list.md), [`prefs.js`](../prefs.md), [`ui/app-state.js`](app-state.md), [`ui/chord-filter.js`](chord-filter.md), [`ui/dom.js`](dom.md), [`ui/list-select.js`](list-select.md), [`ui/song.js`](song.md), [`ui/view.js`](view.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-keys.js`](app-keys.md), [`ui/context-menus.js`](context-menus.md), [`ui/selection.js`](selection.md), [`ui/song-actions.js`](song-actions.md)

## Exportiert

### `listEl`

`= $('#song-list')`

### `async listedSongs()`

Lieder in der Reihenfolge der Liste (Suche, Tag, Griff-Filter, Sortierung) – auch fürs Blättern im Spielmodus.

### `refreshList()`

Liste neu zeichnen (wartet, bis sie fertig ist).

### `clearSearch()`

Suche leeren (z. B. nach dem Anlegen eines Liedes, damit es sichtbar ist).

### `focusSearch()`

In die Suche springen (Strg+K).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async renderTagFilter()` – Tag-Filter über der Liste (nur sichtbar, wenn es Tags gibt).
- `syncSortDir()` – Knopf für die Richtung: zeigt die aktuelle („A–Z“, „neueste zuerst“), Klick kehrt sie um.
- `songButton(s)`
- `emptyText()`
- `async render()`
