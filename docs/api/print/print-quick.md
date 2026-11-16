# `src/print/print-quick.js`

[← Übersicht](../README.md)

Druck-Optionen als Schnellwahl: Jede Option im Dialog „Optionen …“ lässt sich mit 📌 in die Leiste über der Druckvorschau heften. Hier steht, welche Optionen es gibt, wie sie in der Leiste aussehen und welche angeheftet sind. Reine Funktionen (Speicher wird übergeben).

**Benutzt:** [`print/print-fonts.js`](print-fonts.md)  
**Benutzt von:** [`print-ui.js`](../print-ui.md)

## Exportiert

### `QUICK_OPTIONS`

`= [`

store: wo der Wert liegt –
  'settings' gemeinsame Einstellungen (gelten auch unter Einstellungen → Druck)
  'print'    Druck-Optionen (Titel, Deckblatt …)
  'fonts'    Schrift nur für den Druck

### `DEFAULT_PINS`

`= ['pageNumbers', 'lyricSize', 'chordSize']`

### `loadPins(storage = globalThis.localStorage)`

Angeheftete Optionen in der Reihenfolge der Liste oben.

### `togglePin(key, storage = globalThis.localStorage)`

Option an- bzw. abheften; liefert die neue Liste.

### `formatValue(option, value)`

Anzeige eines Wertes in der Leiste, z. B. "12,5 pt", "15 mm".
