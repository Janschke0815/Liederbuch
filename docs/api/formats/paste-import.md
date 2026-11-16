# `src/formats/paste-import.js`

[← Übersicht](../README.md)

Eingefügter Text (z. B. von Ultimate Guitar kopiert) -> ein oder mehrere Lieder. Erkennt Titel/Interpret aus Kopfzeilen, entfernt Füllwerk und trennt mehrere Lieder.

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`formats/file-import.js`](file-import.md), [`formats/ug-import.js`](ug-import.md)  
**Benutzt von:** [`ui/paste.js`](../ui/paste.md)

## Exportiert

### `detectHeader(text)`

Kopfzeilen auswerten.

**Rückgabe:** `{title: string, artist: string, body: string}`

### `splitPastedSongs(text)`

Mehrere Lieder trennen: Linien (---, ===, ***) oder eine neue "… Chords by …"-Kopfzeile.

### `pastedToSongs(text, override = {})`

Eingefügten Text in Lieder umwandeln.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[override]` | `{title?: string, artist?: string}` | nur bei genau einem Lied verwendet |

**Rückgabe:** `{chordpro: string, title: string, artist: string}[]`
