# `src/ui/harp-from-notes.js`

[← Übersicht](../README.md)

„Harp“ am Notenabschnitt der Vorschau: Melodie in Mundharmonika-Tabs umwandeln (core/harp-melody.js). Der Dialog schlägt die passende Harp vor, zeigt das Ergebnis und fügt es als eigenen Abschnitt hinter die Noten in den Liedtext ein (mit Rückgängig im Editor).

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`core/harp-melody.js`](../core/harp-melody.md), [`render/song-view.js`](../render/song-view.md), [`settings/settings.js`](../settings/settings.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/snippets.js`](snippets.md), [`ui/song-actions.js`](song-actions.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `describe(r)` – Kurzbeschreibung einer Harp für die Auswahl: „alles ohne Bending“, „3 Bendings“, „2 Töne fehlen“.
- `result()`
- `showResult()`
- `open(abc, index)` – Dialog für den index-ten Notenabschnitt des geöffneten Liedes.
- `afterAbcBlock(text, index)` – Ende des index-ten Notenabschnitts im Liedtext (Position hinter der Zeile {end_of_abc}).
