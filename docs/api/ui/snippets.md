# `src/ui/snippets.js`

[← Übersicht](../README.md)

Bausteine über dem Editor: Akkord, Strophe, Refrain, Bridge, Tab, Wiederholung, Hinweis – und die Übersicht der ChordPro-Syntax („?“).

**Benutzt:** [`core/repeat.js`](../core/repeat.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `insertText(text, selectFrom, selectTo)` – Text an der Cursorstelle einfügen; danach optional einen Teil davon markieren.
- `insertRepeat()` – Wiederholung: Zeile mit dem Cursor, markierte Zeilen oder – auf der Abschnittszeile – der Abschnitt.
- `insertSnippet(kind)`
