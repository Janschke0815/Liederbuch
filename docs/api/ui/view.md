# `src/ui/view.js`

[← Übersicht](../README.md)

Aufteilung des Bildschirms: Handy-Reiter (Lieder / Bearbeiten / Ansehen), Editor ausblenden, Menü „⋯“ am Handy.

**Benutzt:** [`prefs.js`](../prefs.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/context-menus.js`](context-menus.md), [`ui/list.js`](list.md), [`ui/paste.js`](paste.md), [`ui/song-actions.js`](song-actions.md)

## Exportiert

### `setView(view)`

Handy: welcher Bereich sichtbar ist ('list' | 'editor' | 'preview').

### `isPaneHidden(pane)`

Ist der Bereich ('list' | 'editor' | 'preview') gerade ausgeblendet?

### `setPaneHidden(pane, hidden)`

Bereich ein- oder ausblenden (und die Wahl merken).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `pane` | `'list'\|'editor'\|'preview'` |  |
| `hidden` | `boolean` |  |

### `setFocusMode(on)`

Editor aus- (true) oder einblenden.

### `isFocusMode()`

Ist der Editor gerade ausgeblendet?

### `setMenu(open)`

Menü „⋯“ öffnen oder schließen.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `applyWidths()` – Gespeicherte Breiten und sichtbare Bereiche anwenden (0 = Standardbreite aus dem CSS).
- `resizeTo(which, x)` – Neue Breite aus der Mausposition x; which: 'list' (Liste) oder 'editor' (Editor | Vorschau).
- `addSplitter(pane, which)`
