# `src/ui/preview-tools.js`

[← Übersicht](../README.md)

Werkzeuge an der Vorschau: Vergrößern/Verkleinern und Metronom (Klick auf Takt/Tempo).

**Benutzt:** [`metronome.js`](../metronome.md), [`prefs.js`](../prefs.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/app-keys.js`](app-keys.md), [`ui/context-menus.js`](context-menus.md)

## Exportiert

### `getViewZoom()`

Aktuelle Vergrößerung der Vorschau (1 = 100 %).

### `setViewZoom(z)`

Vorschau vergrößern/verkleinern (60–250 %), wird gemerkt.

### `toggleMetronome()`

Metronom im Tempo des Liedes an/aus (ohne Tempo: 100 bpm).
