# `src/ui/chord-filter.js`

[← Übersicht](../README.md)

„Was kann ich spielen?“ über der Liederliste: Filter nach Griffen, die man kann (optional mit Capo). Eingeklappt filtert er weiter und zeigt die eigenen Griffe; der Hinweis „Gefiltert: …“ über der Liste hat „Aus“. Die Liste (list.js) fragt hier nach, was sie zeigen soll.

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`core/playable.js`](../core/playable.md), [`prefs.js`](../prefs.md), [`render/song-view.js`](../render/song-view.md), [`ui/dom.js`](dom.md)  
**Benutzt von:** [`ui/list.js`](list.md)

## Exportiert

### `chordFilterActive()`

Filtert der Griff-Filter gerade (eingeschaltet und Griffe eingetragen)?

### `capoFor(id)`

Capo-Bund, mit dem das Lied nur mit den eigenen Griffen geht (undefined: ohne Capo).

### `applyChordFilter(songs)`

Lieder, die nur aus bekannten Griffen bestehen (mit gespeicherter Transposition).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` | `object[]` |  |

**Rückgabe:** `object[]` ohne aktiven Filter dieselbe Liste

### `onChordFilterChange(fn)`

Was bei jeder Änderung am Filter passieren soll (die Liste neu zeichnen).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `fn` | `() => void` |  |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `save()`
- `sync()`
- `collapse()` – Einklappen; ohne eingetragene Griffe heißt das: Filter aus.
