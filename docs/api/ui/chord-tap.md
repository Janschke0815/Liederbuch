# `src/ui/chord-tap.js`

[← Übersicht](../README.md)

Akkorde per Antippen: Schalter „Akkorde setzen“ unten in der Vorschau. Ist er an, öffnet ein Tippen ins Lied eine Auswahl mit den Akkorden des Liedes, „anderer Akkord …“ und „entfernen“. Der Akkord landet im ChordPro-Text (Logik ohne Bildschirm: core/chord-place.js).

Welche Textzeile: data-src an jeder .line (Renderer). Welche Spalte: sichtbare Liedtext-Zeichen der Zeile vor der getippten Stelle zählen – Akkord-Spans und unsichtbare Leerzeichen zählen nicht.

**Benutzt:** [`core/chord-place.js`](../core/chord-place.md), [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`render/song-view.js`](../render/song-view.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `columnIn(lineEl, { node, offset = 0, before = null })` – Sichtbare Spalte in einer gerenderten Zeile – an Textstelle (node, offset) oder vor einem Akkord-Element.
- `caretAt(x, y)` – Textstelle unter dem Finger/Mauszeiger.
- `setOn(value)`
- `lineText(src)`
- `closePick()`
- `onOutside(e)`
- `onKey(e)`
- `names()` – Ansicht wie in der Vorschau (transponiert) und zurück in den Text.
- `apply(newText, msg)`
- `openPick(src, col, x, y)`
- `render()`
