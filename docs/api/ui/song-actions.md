# `src/ui/song-actions.js`

[← Übersicht](../README.md)

Was man mit ganzen Liedern tun kann: anlegen, löschen, duplizieren, zu einer Setliste hinzufügen, in ein anderes Liederbuch kopieren. Wird von Knöpfen, Kontextmenüs und der Mehrfachauswahl benutzt.

**Benutzt:** [`books.js`](../books.md), [`core/meta-edit.js`](../core/meta-edit.md), [`core/song-copy.js`](../core/song-copy.md), [`sample.js`](../sample.md), [`storage/repository.js`](../storage/repository.md), [`storage/stores.js`](../storage/stores.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/list.js`](list.md), [`ui/song.js`](song.md), [`ui/view.js`](view.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/context-menus.js`](context-menus.md), [`ui/harp-from-notes.js`](harp-from-notes.md), [`ui/selection.js`](selection.md), [`ui/share.js`](share.md)

## Exportiert

### `async createAndOpen(chordpro)`

Neues Lied aus ChordPro-Text anlegen und öffnen.

### `async newSong()`

Neues Lied aus der Vorlage anlegen und den Titel zum Überschreiben markieren.

### `async playSong(id = state.current?.id)`

Lied im Spielmodus zeigen (ohne id: das geöffnete).

### `async deleteSong(id)`

Lied löschen (in den Papierkorb), mit "Rückgängig".

### `async duplicateSong(id)`

Lied als Kopie anlegen und öffnen.

### `editSong()`

Editor zeigen und hineinspringen.

### `printSong(song)`

Lied aus der Liste bzw. dem geöffneten Lied drucken.

### `async addToSetlist(setId, songs)`

Lieder hinten an eine Setliste anhängen.

### `async newSetlistWith(songs)`

Neue Setliste mit diesen Liedern anlegen und öffnen.

### `async setlistMenu(getSongs, done = ()`

Untermenü „Zur Setliste hinzufügen“ (Kontextmenü eines Liedes, Mehrfachauswahl).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `getSongs` | `() => Promise<object[]>` | liefert die Lieder erst beim Klicken |
| `[done]` | `() => void` | danach aufrufen (z. B. Auswahl beenden) |

### `async copySongsTo(songs, target)`

Lieder in ein anderes Liederbuch kopieren; was es dort schon gibt (gleicher Titel und Interpret),
wird übersprungen. Die Rückmeldung bietet an, das Ziel zu öffnen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` | `object[]` | Datensätze (Reihenfolge bleibt) |
| `target` | `{id: string, name: string, dbName: string}` | Ziel-Liederbuch (aus listBooks()) |
