# `src/ui/harp-help.js`

[← Übersicht](../README.md)

Harp-Hilfe: Mundharmonika-Tabs auf einer Harp in anderer Tonart spielen (core/harp-transpose.js). Weg A: gleiche Tabs, das Lied wird transponiert. Weg B: gleiche Tonart, die Tabs werden für die eigene Harp umgeschrieben – nur in der Ansicht (pro Lied auf diesem Gerät), auf Wunsch in den Text.

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`core/harp-transpose.js`](../core/harp-transpose.md), [`core/meta-edit.js`](../core/meta-edit.md), [`prefs.js`](../prefs.md), [`render/song-view.js`](../render/song-view.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/context-menus.js`](context-menus.md)

## Exportiert

### `openHarpHelp()`

Harp-Hilfe für das geöffnete Lied (nur mit Mundharmonika-Tabs).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `describe(r)` – Weg B als Kurztext: „alles ohne Bending“, „2 Bendings, 1 Ton fehlt“.
- `setPlayAs(id, name)` – Eigene Harp für ein Lied merken (leer = Tabs wie geschrieben).
- `fixWrittenHarp(song)` – Geschätzte Harp beim ersten Anwenden als {harp:} in den Text schreiben – dann bleibt sie fest.
- `option(title, detail, score, onclick, { current = false, good = false, disabled = false } = {})`
- `fillOptions()`
- `fillTo(from, selected)` – „Ich spiele auf“: eigene Harps zuerst, die passende ist markiert.
- `defaultTo(song, t, from)` – Vorauswahl: gewählte Harp, sonst passende eigene, sonst die mit den wenigsten Bendings.
- `fillMine()`
- `fill()`
