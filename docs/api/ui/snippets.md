# `src/ui/snippets.js`

[← Übersicht](../README.md)

Bausteine über dem Editor: Akkord, Strophe, Refrain, Bridge, Tab, Noten, Wiederholung, Hinweis – und die Übersicht der ChordPro-Syntax („?“).

**Benutzt:** [`core/abc.js`](../core/abc.md), [`core/chordpro.js`](../core/chordpro.md), [`core/repeat.js`](../core/repeat.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/shortcuts.js`](shortcuts.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/harp-from-notes.js`](harp-from-notes.md)

## Exportiert

### `insertText(text, selectFrom, selectTo)`

Text an der Cursorstelle des Editors einfügen (mit Rückgängig); danach optional einen Teil markieren.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` |  |
| `[selectFrom]` | `number` | Markierung ab hier (relativ zum eingefügten Text) |
| `[selectTo]` | `number` |  |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `insertRepeat()` – Wiederholung: Zeile mit dem Cursor, markierte Zeilen oder – auf der Abschnittszeile – der Abschnitt.
- `insertSnippet(kind)`
