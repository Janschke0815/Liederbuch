# `src/core/chord-place.js`

[← Übersicht](../README.md)

Akkorde per Antippen setzen: eine Stelle im sichtbaren Liedtext (Zeile + Spalte) wird in den ChordPro-Text übersetzt. Reine Funktionen, kein DOM (getestet in tests/chord-place.test.js).

Zeile = Nummer der Textzeile (ab 0, wie line.src aus dem Parser), Spalte = Zeichen im sichtbaren Text dieser Zeile, also ohne [Akkorde]. Spalte 3 in „Oh my [C]darling“ ist das „m“; ein Akkord „an Spalte 6“ steht vor dem „d“ von „darling“.

**Benutzt:** [`core/chordpro.js`](chordpro.md), [`core/harp.js`](harp.md)  
**Benutzt von:** [`ui/chord-tap.js`](../ui/chord-tap.md)

## Exportiert

### `visibleColumns(raw)`

Sichtbarer Text einer Zeile und wo jedes sichtbare Zeichen im Rohtext steht.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `raw` | `string` | Zeile mit [Akkorden] |

**Rückgabe:** `{text: string, toRaw: number[]}` toRaw[i] = Index im Rohtext; toRaw[text.length] = Zeilenende

### `chordAt(text, line, col)`

Akkord an einer Stelle (oder null).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` | ganzer ChordPro-Text |
| `line` | `number` | Zeilennummer (ab 0) |
| `col` | `number` | Spalte im sichtbaren Text |

### `setChordAt(text, line, col, chord)`

Akkord an eine Stelle setzen; ein vorhandener Akkord dort wird ersetzt. Vor einem Mundharmonika-Tab
an derselben Stelle eingefügt ([C][4]Text).

**Rückgabe:** `string` neuer Text

### `removeChordAt(text, line, col)`

Akkord an einer Stelle entfernen (sonst unverändert).

### `songChords(text)`

Alle Gitarren-Akkorde des Liedes, jeder einmal, in der Reihenfolge ihres ersten Vorkommens.

**Rückgabe:** `string[]`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `slot(raw, col)` – Rohtext-Bereich zwischen sichtbarem Zeichen col−1 und col – dort stehen die Klammern „an Spalte col“.
- `chordBracket(raw, from, to)` – Gitarren-Akkord-Klammer im Bereich (keine Anmerkung [*…], kein Mundharmonika-Tab).
