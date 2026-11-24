# `src/formats/export-text.js`

[← Übersicht](../README.md)

Lied exportieren: transponierter ChordPro-Text und "Akkorde über dem Text" (z. B. für Nachrichten oder Foren). Reine Funktionen, kein DOM.

**Benutzt:** [`core/abc.js`](../core/abc.md), [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`core/harp.js`](../core/harp.md)  
**Benutzt von:** [`ui/share.js`](../ui/share.md)

## Exportiert

### `transposeChordPro(text, steps = 0, accidentals = 'auto')`

ChordPro-Text mit transponierten Akkorden und angepasster {key:}. Tabs und Noten bleiben, wie sie
sind; Noten ohne eigene Tonart (K:) bekommen die ursprüngliche ausdrücklich dazu – sonst läsen sie
sich nach der geänderten {key:} in der falschen Tonart.

### `chordproToText(text, steps = 0, accidentals = 'auto', { harpLayout = 'inline' } = {})`

Ganzes Lied als "Akkorde über dem Text" (für Monospace-Schrift gedacht).
opts.harpLayout: 'split' = Mundharmonika-Tabs in eigener Zeile unter den Akkorden.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `firstChordName(song)`
- `chordMapper(song, steps, accidentals = 'auto')` – Funktion Akkord -> transponierter Akkord, mit derselben #/b-Wahl wie die Anzeige.
- `lyricsToSplitText(line, map)` – Liedzeile mit Akkorden und Mundharmonika-Tabs in getrennten Reihen über dem Text
- `lyricsToText(line, map, harpLayout = 'inline')` – Eine Liedzeile als zwei Zeilen: Akkorde (an der richtigen Spalte) über dem Text.
