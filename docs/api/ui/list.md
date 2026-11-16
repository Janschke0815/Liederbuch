# `src/ui/list.js`

[← Übersicht](../README.md)

Liederliste links: Suche, Tag-Filter, „Was kann ich spielen?“, Sortierung. Die Liste zeichnet sich selbst neu, wenn sich Lieder ändern oder ein anderes Lied geöffnet wird.

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`core/playable.js`](../core/playable.md), [`core/song-list.js`](../core/song-list.md), [`prefs.js`](../prefs.md), [`render/song-view.js`](../render/song-view.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md), [`ui/view.js`](view.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-keys.js`](app-keys.md), [`ui/context-menus.js`](context-menus.md), [`ui/song-actions.js`](song-actions.md)

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
- `applyChordFilter(songs)` – Lieder filtern, die nur aus bekannten Griffen bestehen (mit gespeicherter Transposition).
- `songButton(s)`
- `emptyText()`
- `async render()`
