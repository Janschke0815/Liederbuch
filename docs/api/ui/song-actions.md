# `src/ui/song-actions.js`

[← Übersicht](../README.md)

Was man mit einem ganzen Lied tun kann: anlegen, löschen, duplizieren, zu einer Setliste hinzufügen. Wird von Knöpfen und Kontextmenüs benutzt.

**Benutzt:** [`core/meta-edit.js`](../core/meta-edit.md), [`sample.js`](../sample.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/list.js`](list.md), [`ui/song.js`](song.md), [`ui/view.js`](view.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/context-menus.js`](context-menus.md), [`ui/share.js`](share.md)

## Exportiert

### `async createAndOpen(chordpro)`

Neues Lied aus ChordPro-Text anlegen und öffnen.

### `async deleteSong(id)`

Lied löschen (in den Papierkorb), mit "Rückgängig".

### `async duplicateSong(id)`

Lied als Kopie anlegen und öffnen.

### `editSong()`

Editor zeigen und hineinspringen.

### `printSong(song)`

Lied aus der Liste bzw. dem geöffneten Lied drucken.

### `async setlistMenu(songId)`

Untermenü "Zur Setliste hinzufügen" für ein Lied (Kontextmenü).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async addToSetlist(setId, songId)`
- `async newSetlistWith(songId)`
