# `src/metronome.js`

[← Übersicht](README.md)

Metronom mit Web Audio: genaue Zeitplanung (vorausplanen statt setInterval-Klicks), betonte Eins je nach Taktart.

**Benutzt von:** [`play-mode.js`](play-mode.md), [`ui/preview-tools.js`](ui/preview-tools.md)

## Exportiert

### `beatsPerBar(time)`

"3/4" -> 3, "6/8" -> 2 (punktierte Viertel), sonst 4

### `class Metronome`

Ein Metronom für die ganze App (Vorschau und Spielmodus teilen es).

#### `new Metronome()`

#### `start(bpm = 100, beats = 4)`

Metronom starten.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `bpm` | `number` | Schläge pro Minute (20–300) |
| `beats` | `number` | Schläge pro Takt (der erste wird betont) |

#### `stop()`

Metronom anhalten.

#### `toggle(bpm, beats)`

Starten bzw. anhalten.

**Rückgabe:** `boolean` läuft es jetzt?

### `metronome`

`= new Metronome()`
