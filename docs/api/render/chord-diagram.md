# `src/render/chord-diagram.js`

[← Übersicht](../README.md)

Griffbild als SVG: 6 Saiten, 4–5 Bünde, ○ leer, × nicht anschlagen, Barré als Balken.

**Benutzt:** [`core/chord-shapes.js`](../core/chord-shapes.md)  
**Benutzt von:** [`render/song-view.js`](song-view.md)

## Exportiert

### `chordDiagram(name)`

Griffbild (SVG) für einen Akkord, oder null, wenn kein Griff bekannt ist.

**Rückgabe:** `HTMLElement | null`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `findBarre(frets)` – Barré: tiefster gegriffener Bund über mehrere Saiten, durchgehend greifbar.
