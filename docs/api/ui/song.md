# `src/ui/song.js`

[← Übersicht](../README.md)

Das geöffnete Lied: öffnen, automatisch speichern, Vorschau, Transponieren und die Liedinfo (Titel, Capo, Takt … über dem Editor).

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`core/harp-transpose.js`](../core/harp-transpose.md), [`core/meta-edit.js`](../core/meta-edit.md), [`prefs.js`](../prefs.md), [`render/abc-view.js`](../render/abc-view.md), [`render/song-view.js`](../render/song-view.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-keys.js`](app-keys.md), [`ui/capo-help.js`](capo-help.md), [`ui/chord-tap.js`](chord-tap.md), [`ui/context-menus.js`](context-menus.md), [`ui/files.js`](files.md), [`ui/harp-from-notes.js`](harp-from-notes.md), [`ui/harp-help.js`](harp-help.md), [`ui/list.js`](list.md), [`ui/notes-import.js`](notes-import.md), [`ui/preview-tools.js`](preview-tools.md), [`ui/publish.js`](publish.md), [`ui/selection.js`](selection.md), [`ui/share.js`](share.md), [`ui/snippets.js`](snippets.md), [`ui/song-actions.js`](song-actions.md), [`ui/trash.js`](trash.md), [`ui/view.js`](view.md)

## Exportiert

### `editor`

`= $('#editor')`

### `preview`

`= $('#preview')`

### `setStatus(text, kind = '')`

Anzeige rechts über dem Editor (Punkt an der Diskette): „Ungespeichert …“, „Gespeichert“, Fehler.

### `async saveNow()`

Sofort speichern (Diskette, Strg+S); ist schon alles gespeichert, wird das kurz bestätigt.

### `isDirty()`

Gibt es Tipp-Änderungen, die noch nicht gespeichert sind?

### `renderPreview()`

Vorschau, Tonart-Anzeige und Liedinfo aus dem Editor-Text neu zeichnen.

### `songHasHarp()`

Hat das geöffnete Lied Mundharmonika-Tabs? (für Menüs)

### `updateControls()`

Knöpfe passend zum geöffneten Lied (Transposition, Schreibweise, gesperrt ohne Lied).

### `async openSong(id)`

Lied öffnen (id leer = keins). Speichert vorher Ungespeichertes.

### `async flushSave()`

Getipptes sofort speichern (sonst geschieht das 0,5 s nach der letzten Taste).

### `async setViewOption(changes)`

Ansicht des Liedes ändern und speichern (transpose, accidentals).

### `setEditorText(text, keepCursor = true)`

Text im Editor ersetzen, als hätte man getippt (Vorschau, Speichern).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `showHarpChip(harp)` – „Harp C“ in der Leiste über der Vorschau (öffnet die Harp-Hilfe, ui/harp-help.js) – nur bei Liedern mit Tabs.
- `fillMeta()`
