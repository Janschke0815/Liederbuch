# `src/core/modes.js`

[← Übersicht](../README.md)

Einfache Ansicht oder Expertenmodus, Mundharmonika-Werkzeuge an oder aus: Startwerte beim ersten Start einer Version, die das kennt. Reine Logik, kein DOM (Anwenden: src/modes.js).

**Benutzt:** [`core/harp.js`](harp.md)  
**Benutzt von:** [`app.js`](../app.md)

## Exportiert

### `usesHarp(chordpro)`

Enthält der ChordPro-Text Mundharmonika-Tabs wie [4], [-4] oder [-3']?

### `initialModes({ songs = [], sample = '', setlists = 0, books = 1, synced = false, harps = 0 } = {})`

Startwerte, solange noch nichts gewählt ist. Wer die App schon benutzt (eigene Lieder, Setlisten,
weitere Liederbücher, Cloud), behält alle Funktionen – nach einem Update verschwindet nichts.
Wer neu anfängt, sieht die einfache Ansicht. Mundharmonika ist an, sobald ein eigenes Lied Harp-Tabs
hat oder eigene Harps eingetragen sind.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `facts` | `{songs?: string[], sample?: string, setlists?: number, books?: number, synced?: boolean, harps?: number}` | songs: ChordPro-Texte aller Lieder; sample: das mitgelieferte Beispiellied (zählt nicht als eigenes) |

**Rückgabe:** `{expert: boolean, harp: boolean}`
