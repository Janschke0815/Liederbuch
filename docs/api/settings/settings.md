# `src/settings/settings.js`

[← Übersicht](../README.md)

Layout-Einstellungen: Standardwerte, Prüfung, Speichern, Anwenden. Angewendet wird ausschließlich über CSS-Variablen und data-Attribute auf einem .songbook-Element – Vorschau, Einstellungs-Muster und Druck nutzen dasselbe CSS.

**Benutzt von:** [`play-mode.js`](../play-mode.md), [`print-ui.js`](../print-ui.md), [`print/print-fonts.js`](../print/print-fonts.md), [`settings-ui.js`](../settings-ui.md), [`ui/context-menus.js`](../ui/context-menus.md), [`ui/paste.js`](../ui/paste.md), [`ui/share.js`](../ui/share.md)

## Exportiert

### `FONTS`

`= {`

### `CHORUS_STYLES`

`= {`

### `LINE_SPACING`

`= { compact: 1.1, normal: 1.25, wide: 1.45 }`

### `PAPERS`

`= ['A4', 'A5', 'Letter']`

### `DEFAULT_SETTINGS`

`= Object.freeze({`

### `sanitize(input = {})`

Macht aus beliebigen (z. B. alten oder kaputten) Werten gültige Einstellungen.

### `applySettings(el, settings)`

Setzt die Einstellungen auf ein .songbook-Element.

### `loadSettings(storage = globalThis.localStorage)`

Gespeicherte Einstellungen lesen (fehlende Werte = Standard, ältere Speicherformate werden übernommen).

**Rückgabe:** `object`

### `saveSettings(settings, storage = globalThis.localStorage)`

Einstellungen prüfen, speichern und überall anwenden (Ereignis „settingschange“).

**Rückgabe:** `object` die gespeicherten (geprüften) Einstellungen
