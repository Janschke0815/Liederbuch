# `src/core/harp.js`

[← Übersicht](../README.md)

Mundharmonika-Tabs (Harp-Tabs): Kanalnummern über dem Text, wie Akkorde in eckigen Klammern.

```text
  [4]  blasen        [-4]  ziehen         [+4]  blasen (andere Schreibweise)
  [-3'] [-3''] [-3b]  Bendings           [6o] [6°]  Overblow
  [7 8] [(7 8)] [7,8] [7+8]  mehrere Löcher gleichzeitig – angezeigt als „(7 8)“
```

Diatonisch 1–10, chromatisch bis 16. Reine Funktionen, kein DOM.

**Benutzt von:** [`core/chord-place.js`](chord-place.md), [`core/chordpro.js`](chordpro.md), [`core/harp-transpose.js`](harp-transpose.md), [`core/modes.js`](modes.md), [`formats/export-text.js`](../formats/export-text.md), [`formats/harp-import.js`](../formats/harp-import.md), [`formats/ug-import.js`](../formats/ug-import.md), [`render/song-view.js`](../render/song-view.md)

## Exportiert

### `isHarpNote(token)`

Einzelner Ton, z. B. "-4" oder "3'".

### `harpNotes(text)`

Töne in einer Klammer: „-4“ -> ['-4']; „7 8“, „(7 8)“, „7,8“, „7+8“ -> ['7', '8'].
Ein „+“ vor einer Zahl am Anfang bleibt Blaston („+4“), zwischen zwei Tönen trennt es.

**Rückgabe:** `string[] | null` null, wenn es keine Harp-Töne sind

### `isHarpTab(text)`

Inhalt einer Klammer: ein oder mehrere Töne (siehe harpNotes).

### `harpLabel(text)`

Anzeige eines Harp-Tabs: einzelner Ton wie geschrieben, mehrere Löcher gleichzeitig als „(7 8)“.

### `isHarpLine(line)`

Ganze Zeile aus Harp-Tönen (für den Import von "Tabs über dem Text"). Damit eine Zeile
wie "1 2 3" (z. B. Zählzeit) nicht versehentlich als Tab gilt: mindestens ein Ziehton
(-) oder Bending, oder mindestens drei Töne.
