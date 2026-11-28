# `src/modes.js`

[← Übersicht](README.md)

Funktionsumfang: einfache Ansicht oder Expertenmodus, Mundharmonika-Werkzeuge an oder aus. Versteckt werden nur Werkzeuge, nie Inhalte – Noten oder Tags in einem Lied bleiben sichtbar. Einzige Ausnahme: Harp-Tabs werden mit dem Schalter „Mundharmonika“ ein- bzw. ausgeblendet (setModes).

```text
  data-expert                 im HTML: nur im Expertenmodus zu sehen
  data-harp-tool              im HTML: nur mit Mundharmonika zu sehen
  data-simple-only            im HTML: nur in der einfachen Ansicht zu sehen (Hinweise zum Einschalten)
  { expert: true, harp: true } an Menüeinträgen (context-menu.js filtert sie)
```

Die Schalter hängen als Attribute an <html> (data-mode-simple, data-mode-noharp); das CSS dazu steht in styles/base.css. Bei jeder Änderung gibt es das Ereignis „modeschange“ auf window.

**Benutzt:** [`prefs.js`](prefs.md), [`settings/settings.js`](settings/settings.md)  
**Benutzt von:** [`app.js`](app.md), [`context-menu.js`](context-menu.md), [`ui/context-menus.js`](ui/context-menus.md), [`ui/modes-ui.js`](ui/modes-ui.md)

## Exportiert

### `isExpert()`

Expertenmodus an? (Solange noch nichts festgelegt ist: ja – so verschwindet beim Start nichts.)

### `harpToolsOn()`

Mundharmonika-Werkzeuge an? (Solange noch nichts festgelegt ist: ja.)

### `modesChosen()`

Ist schon festgelegt, welcher Funktionsumfang gilt?

### `applyModes()`

Gespeicherten Funktionsumfang auf die Seite anwenden.

### `setModes({ expert, harp } = {})`

Funktionsumfang ändern und anwenden; nicht genannte Schalter bleiben, wie sie sind.
Mundharmonika an/aus schaltet auch die Anzeige der Harp-Tabs mit (Einstellung showHarp) – danach
lässt sie sich wie gewohnt einzeln ändern.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `modes` | `{expert?: boolean, harp?: boolean}` |  |

### `allowedInMode(item)`

Darf ein Menüeintrag im aktuellen Funktionsumfang erscheinen? (Trennlinien und Lücken immer.)

### `asExpert(item)`

Menüeintrag nur im Expertenmodus zeigen (leere Einträge bleiben leer).
