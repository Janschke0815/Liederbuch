# `src/core/song-copy.js`

[← Übersicht](../README.md)

Mehrere Lieder in ein anderes Liederbuch kopieren: was dort schon steht (gleicher Titel und – falls beide einen haben – Interpret), wird übersprungen. Reine Logik, getestet in tests/song-copy.test.js.

**Benutzt:** [`core/song-list.js`](song-list.md)  
**Benutzt von:** [`ui/selection.js`](../ui/selection.md), [`ui/song-actions.js`](../ui/song-actions.md)

## Exportiert

### `planCopy(songs, existing)`

Welche Lieder kopiert werden und welche es im Ziel schon gibt.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` | `{title: string, artist: string}[]` | ausgewählte Lieder (Reihenfolge bleibt) |
| `existing` | `{title: string, artist: string}[]` | Lieder im Ziel-Liederbuch |

**Rückgabe:** `{copy: object[], skip: object[]}`

### `songCount(n)`

„3 Lieder“, „1 Lied“
