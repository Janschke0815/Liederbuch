# `src/ui/capo-help.js`

[← Übersicht](../README.md)

Capo-Hilfe: schlägt Capo-Lagen vor, in denen das Lied mit möglichst einfachen Griffen klingt wie bisher. Wählt man eine, ändern sich {capo} im Text und die Transposition – der Klang bleibt.

**Benutzt:** [`core/capo.js`](../core/capo.md), [`core/chordpro.js`](../core/chordpro.md), [`core/chords.js`](../core/chords.md), [`core/meta-edit.js`](../core/meta-edit.md), [`render/song-view.js`](../render/song-view.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `optionButton(o, capoOld)`
