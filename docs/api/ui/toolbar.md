# `src/ui/toolbar.js`

[← Übersicht](../README.md)

Kopfleiste: angeheftete Aktionen beschriftet neben dem Menü „⋯“ (breiter Bildschirm).

Es gibt nur eine Liste – die Einträge im Menü „⋯“. Angeheftete stehen zusätzlich als Knopf in der Leiste (der den Menüeintrag auslöst) und fehlen dann im Menü (data-quick). Welche und in welcher Reihenfolge: ⋯ → Leiste anpassen, oder Rechtsklick auf einen Eintrag bzw. Knopf. Reicht der Platz nicht, zeigt die Leiste nur Symbole, dann rutschen die letzten Knöpfe ins Menü.

**Benutzt:** [`context-menu.js`](../context-menu.md), [`core/toolbar-pins.js`](../core/toolbar-pins.md), [`prefs.js`](../prefs.md), [`ui/dom.js`](dom.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `save(p)`
- `render()` – Knöpfe der Leiste neu aufbauen.
- `overflowing()` – Ragt die Kopfleiste über den Rand? (Buchname dabei in voller Breite gerechnet.)
- `fit()` – Bei Platzmangel erst nur Symbole, dann die letzten Knöpfe zurück ins Menü.
- `renderDialog()`
- `pinItems(id, { inBar = false } = {})`
