# `src/ui/modes-ui.js`

[← Übersicht](../README.md)

Bedienung des Funktionsumfangs (src/modes.js): Schalter unter Einstellungen → App, Hinweise in „So geht's los“, ⋯ → „Mehr Funktionen …“. Die Schalter wirken sofort (nicht erst mit „Speichern“).

**Benutzt:** [`modes.js`](../modes.md), [`ui/dom.js`](dom.md)  
**Benutzt von:** [`app.js`](../app.md)

## Exportiert

### `setExpert(on)`

Expertenmodus ein- oder ausschalten, mit kurzer Bestätigung.

### `setHarpTools(on)`

Mundharmonika-Werkzeuge ein- oder ausschalten, mit kurzer Bestätigung.

### `openModeSettings()`

Einstellungen öffnen und zum Bereich „App“ springen (dort stehen die Schalter).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `syncSwitches()` – Schalter in den Einstellungen an den gespeicherten Stand angleichen.
- `onModesChange()` – Was sich nicht allein per CSS (data-expert, data-harp-tool) umschalten lässt.
