# `src/ui/list-select.js`

[← Übersicht](../README.md)

Mehrfachauswahl in der Liederliste: welche Lieder markiert sind und wie sich das ändert (Klick im Auswahlmodus, Strg/⌘+Klick, Umschalt+Klick für einen Bereich, „Alle“). Ereignis „selectionchange“ auf window bei jeder Änderung. Leiste und Aktionen dazu: selection.js.

**Benutzt:** [`ui/dom.js`](dom.md)  
**Benutzt von:** [`ui/context-menus.js`](context-menus.md), [`ui/list.js`](list.md), [`ui/selection.js`](selection.md)

## Exportiert

### `selection`

`= { active: false, ids: new Set(), last: null }`

Ausgewählte Lieder: active = Auswahlmodus an, ids = markierte Lieder, last = zuletzt angeklickt.

### `startSelection(id = null)`

Auswahlmodus starten (optional gleich mit einem Lied).

### `toggleSelected(id)`

Lied an-/abwählen.

### `selectRange(fromId, toId)`

Alle Lieder zwischen zwei (in der Reihenfolge der Liste) auswählen.

### `selectAllVisible()`

Alle sichtbaren Lieder auswählen bzw. – sind schon alle gewählt – keines.

### `endSelection()`

Auswahlmodus beenden.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `selectionChanged()`
