# `src/context-menu.js`

[← Übersicht](README.md)

Kontextmenü: Rechtsklick (Maus), langes Drücken (Touch) oder Menütaste / Umschalt+F10. Bedienbar mit Pfeiltasten, Enter, Esc; Untermenüs mit → / ←.

Eintrag: { label, icon?, hint?, action?, disabled?, danger?, checked?, items? (Untermenü),

```text
           context?: () => Einträge (eigenes Menü per Rechtsklick/lang drücken/Menütaste auf dem Eintrag),
           contextTitle? }
         oder '-' für eine Trennlinie
```

**Benutzt von:** [`print-ui.js`](print-ui.md), [`setlist-ui.js`](setlist-ui.md), [`sync-ui.js`](sync-ui.md), [`ui/context-menus.js`](ui/context-menus.md), [`ui/song.js`](ui/song.md), [`ui/toolbar.js`](ui/toolbar.md)

## Exportiert

### `closeMenu()`

Offenes Kontextmenü schließen (falls eins offen ist).

### `showMenu(items, { x, y, title, parentMenu = null } = {})`

Menü an Position (x, y) zeigen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `items` | `Array` |  |
| `at` | `{x: number, y: number, title?: string, parent?: HTMLElement}` |  |

### `attachContextMenu(root, selector, build, { title } = {})`

Kontextmenü an Elemente hängen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `root` | `HTMLElement` | Container (Ereignisse werden delegiert) |
| `selector` | `string` | welche Elemente ein Menü bekommen |
| `build` | `(el: HTMLElement, e: Event) => Array\|null\|Promise<Array\|null>` |  |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `iconSvg(name)`
