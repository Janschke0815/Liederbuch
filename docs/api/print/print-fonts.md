# `src/print/print-fonts.js`

[← Übersicht](../README.md)

Eigene Schrift nur für den Druck (in der Druckvorschau einstellbar). Ohne eigene Werte gilt, was unter Einstellungen steht. Reine Funktionen, kein DOM.

**Benutzt:** [`settings/settings.js`](../settings/settings.md)  
**Benutzt von:** [`print-ui.js`](../print-ui.md), [`print/print-quick.js`](print-quick.md)

## Exportiert

### `PRINT_FONT_KEYS`

`= ['lyricFont', 'lyricSize', 'chordFont', 'chordSize']`

### `cleanPrintFonts(overrides, settings)`

Nur die Schriftwerte, die sich von den Einstellungen unterscheiden (gültig gemacht).

### `withPrintFonts(settings, overrides)`

Einstellungen mit der Druckschrift darüber.

### `stepSize(key, value, dir)`

Schriftgröße um einen Schritt (0,5 pt) ändern, in den Grenzen der Einstellungen.

### `loadPrintFonts(storage = globalThis.localStorage)`

Gespeicherte Druckschriften (nur die, die von den Einstellungen abweichen).

**Rückgabe:** `object`

### `savePrintFonts(overrides, settings, storage = globalThis.localStorage)`

Druckschriften speichern; Werte, die den Einstellungen entsprechen, werden weggelassen.
