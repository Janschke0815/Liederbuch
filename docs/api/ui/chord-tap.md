# `src/ui/chord-tap.js`

[← Übersicht](../README.md)

Akkorde per Antippen. Am Handy: Bearbeiten → „Text | Akkorde“ – unter „Akkorde“ steht das Lied wie in der Vorschau, Antippen setzt Akkorde. Am PC: Knopf „Akkorde“ in der Leiste über der Vorschau. Ein Tipp öffnet eine Auswahl mit den Akkorden des Liedes, „anderer Akkord …“ und „entfernen“; der Akkord landet im ChordPro-Text (Logik ohne Bildschirm: core/chord-place.js).

Welche Textzeile: data-src an jeder .line (Renderer). Welche Spalte: sichtbare Liedtext-Zeichen der Zeile vor der getippten Stelle zählen (Akkord-Spans und unsichtbare Leerzeichen zählen nicht), dann am Wort- bzw. Silbenanfang einrasten (snapColumn). Ein Tipp auf einen Akkord wählt genau diesen.

**Benutzt:** [`core/chord-place.js`](../core/chord-place.md), [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`prefs.js`](../prefs.md), [`render/song-view.js`](../render/song-view.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `columnIn(lineEl, { node, offset = 0, before = null })` – Sichtbare Spalte in einer gerenderten Zeile – an Textstelle (node, offset) oder vor einem Akkord-Element.
- `caretAt(x, y)` – Textstelle unter dem Finger/Mauszeiger.
- `setEditMode(mode)` – Handy: Bearbeiten-Ansicht „Text“ oder „Akkorde“ (gemerkt).
- `syncChordView()` – Akkord-Ansicht am Handy: dieselbe Darstellung wie die Vorschau.
- `setPreviewOn(value)` – PC: Antippen in der Vorschau an/aus.
- `onTap(host)`
- `placeCaret(lineEl, col)` – Senkrechten Strich an Spalte col in die gerenderte Zeile setzen.
- `removeCaret()`
- `lineText(src)`
- `closePick()`
- `onOutside(e)`
- `onKey(e)`
- `names()` – Ansicht wie in der Vorschau (transponiert) und zurück in den Text.
- `apply(newText, msg)`
- `openPick(target, x, y)`
- `render()`
