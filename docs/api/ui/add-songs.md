# `src/ui/add-songs.js`

[← Übersicht](../README.md)

Neue Lieder anlegen – mit Nachfrage, wenn es Titel und Interpret schon gibt (eingefügter Text, Lesezeichen von Ultimate Guitar, ChordPro-/Textdateien).

**Benutzt:** [`books.js`](../books.md), [`core/song-list.js`](../core/song-list.md), [`storage/repository.js`](../storage/repository.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/list.js`](list.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/files.js`](files.md), [`ui/paste.js`](paste.md)

## Exportiert

### `async addSongs(items)`

Lieder anlegen – vorher prüfen, ob es sie schon gibt (gleicher Titel und Interpret).
Das erste angelegte bzw. ersetzte Lied wird geöffnet.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `items` |  | [{ chordpro, transpose?, accidentals?, note? }] |

**Rückgabe:** `Promise<null | {firstId, created, replaced, skipped, message}>` null = abgebrochen

### `countDuplicates(existing, songs)`

Hinweis im Einfügen-Dialog: wie viele der erkannten Lieder es schon gibt.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `askDuplicates(dups)` – Fragt nach, was mit Liedern geschehen soll, die es schon gibt.
