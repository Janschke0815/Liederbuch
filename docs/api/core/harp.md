# `src/core/harp.js`

[← Übersicht](../README.md)

Mundharmonika-Tabs (Harp-Tabs): Kanalnummern über dem Text, wie Akkorde in eckigen Klammern.

```text
  [4]  blasen        [-4]  ziehen         [+4]  blasen (andere Schreibweise)
  [-3'] [-3''] [-3b]  Bendings           [6o] [6°]  Overblow
  [4 -4 5]  mehrere Töne an einer Stelle
```

Diatonisch 1–10, chromatisch bis 16. Reine Funktionen, kein DOM.

**Benutzt von:** [`core/chordpro.js`](chordpro.md), [`formats/ug-import.js`](../formats/ug-import.md)

## Exportiert

### `isHarpNote(token)`

Einzelner Ton, z. B. "-4" oder "3'".

### `isHarpTab(text)`

Inhalt einer Klammer: ein oder mehrere Töne, durch Leerzeichen getrennt.

### `isHarpLine(line)`

Ganze Zeile aus Harp-Tönen (für den Import von "Tabs über dem Text"). Damit eine Zeile
wie "1 2 3" (z. B. Zählzeit) nicht versehentlich als Tab gilt: mindestens ein Ziehton
(-) oder Bending, oder mindestens drei Töne.
