# `src/settings-ui.js`

[← Übersicht](README.md)

Einstellungsdialog mit Live-Muster. Änderungen wirken sofort auf Muster und Vorschau; "Abbrechen" stellt den vorherigen Stand wieder her, "Speichern" übernimmt ihn dauerhaft.

**Benutzt:** [`core/chordpro.js`](core/chordpro.md), [`prefs.js`](prefs.md), [`render/abc-view.js`](render/abc-view.md), [`render/song-view.js`](render/song-view.md), [`settings/settings.js`](settings/settings.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupSettings({ targets })`

Einstellungsdialog mit Live-Muster einrichten.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `opts` | `{ targets: () => HTMLElement[] }` | Elemente, auf die Einstellungen live wirken |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `fillSelect(sel, entries)`
