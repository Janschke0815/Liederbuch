# `src/formats/harp-import.js`

[← Übersicht](../README.md)

Mundharmonika-Zeilen aus fremden Quellen lesen (z. B. harptabs.com, Ultimate Guitar) und in die Schreibweise der App bringen (siehe core/harp.js). Reine Funktionen, kein DOM.

Erkannt wird, was dort üblich ist:

```text
  -6-6        zwei Töne ohne Leerzeichen dazwischen   -> [-6] [-6] (jeder an seiner Stelle)
  7,8  4+5    zwei Löcher zugleich                     -> [7 8]
  -3"         ganzer Ton gebogen                       -> [-3'']
  -3’ -3´     Bending mit typografischem Apostroph     -> [-3']
  | 4 -4 |    Taktstriche werden übergangen
```

**Benutzt:** [`core/harp.js`](../core/harp.md)  
**Benutzt von:** [`formats/ug-import.js`](ug-import.md)

## Exportiert

### `normalizeHarpNote(note)`

Bending-Zeichen vereinheitlichen: " -> '', ’ und ´ -> '.

### `harpTokens(line)`

Harp-Töne einer Zeile mit ihrer Spalte (für das Einfügen über dem Text).
Damit eine Zeile wie „1 2 3“ (Zählzeit) nicht versehentlich als Tab gilt: mindestens ein Ziehton,
Bending oder Doppelton, oder mindestens drei Töne.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `line` | `string` |  |

**Rückgabe:** `{col: number, text: string}[] | null` null, wenn es keine Harp-Zeile ist

### `isHarpRow(line)`

Ist die Zeile eine Zeile Mundharmonika-Töne (auch in fremder Schreibweise)?

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `splitChunk(chunk)` – Teilt einen Block ohne Leerzeichen in Töne – „-6-6“ -> ["-6", "-6"], „7,8“ -> ["7 8"].
