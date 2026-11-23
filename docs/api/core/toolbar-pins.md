# `src/core/toolbar-pins.js`

[← Übersicht](../README.md)

Angeheftete Aktionen der Kopfleiste: welche, in welcher Reihenfolge. Reine Listen-Logik (getestet); die Oberfläche dazu steht in ui/toolbar.js.

**Benutzt von:** [`ui/toolbar.js`](../ui/toolbar.md)

## Exportiert

### `cleanPins(pins, available)`

Gespeicherte Liste säubern: nur bekannte Aktionen, keine doppelten, Reihenfolge bleibt.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `pins` | `unknown` | gespeicherter Wert |
| `available` | `string[]` | IDs der Menüeinträge |

**Rückgabe:** `string[]`

### `togglePin(pins, id)`

Anheften (hinten anfügen) bzw. lösen.

### `movePin(pins, id, dir)`

Um eine Stelle verschieben (dir -1 = nach links/oben, +1 = nach rechts/unten); am Rand unverändert.
