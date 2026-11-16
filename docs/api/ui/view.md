# `src/ui/view.js`

[← Übersicht](../README.md)

Aufteilung des Bildschirms: Handy-Reiter (Lieder / Bearbeiten / Ansehen), Editor ausblenden, Menü „⋯“ am Handy.

**Benutzt:** [`prefs.js`](../prefs.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/context-menus.js`](context-menus.md), [`ui/list.js`](list.md), [`ui/paste.js`](paste.md), [`ui/song-actions.js`](song-actions.md)

## Exportiert

### `setView(view)`

Handy: welcher Bereich sichtbar ist ('list' | 'editor' | 'preview').

### `setFocusMode(on)`

Editor ausblenden (nur Liste + Vorschau), z. B. zum Spielen

### `isFocusMode()`

Ist der Editor gerade ausgeblendet?

### `setMenu(open)`

Menü „⋯“ öffnen oder schließen.
