# `src/core/playable.js`

[← Übersicht](../README.md)

"Was kann ich spielen?": Lieder, die nur aus bekannten Griffen bestehen (optional mit Capo).

**Benutzt:** [`core/chord-shapes.js`](chord-shapes.md), [`core/chords.js`](chords.md)  
**Benutzt von:** [`ui/list.js`](../ui/list.md)

## Exportiert

### `chordKey(name, shift = 0)`

Vergleichsschlüssel: Grundton (0–11) + Akkordtyp; Slash-Bass zählt nicht.

### `parseKnown(text)`

"G, C D Em am" -> Set von Schlüsseln (Kleinschreibung beim Grundton wird toleriert).

### `playableCapo(chords, known, { withCapo = false, maxCapo = 7 } = {})`

Bund, in dem alle Akkorde mit bekannten Griffen gehen (0 = ohne Capo), sonst null.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `chords` | `string[]` | Akkorde so, wie sie gespielt werden (inkl. Transposition) |
