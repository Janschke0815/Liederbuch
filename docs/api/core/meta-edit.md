# `src/core/meta-edit.js`

[← Übersicht](../README.md)

Kopfangaben ({title:}, {capo:}, {time:} …) direkt im ChordPro-Text lesen und setzen. Für das Liedinfo-Formular: der Text bleibt die einzige Quelle der Wahrheit.

**Benutzt von:** [`print-ui.js`](../print-ui.md), [`ui/capo-help.js`](../ui/capo-help.md), [`ui/harp-help.js`](../ui/harp-help.md), [`ui/song-actions.js`](../ui/song-actions.md), [`ui/song.js`](../ui/song.md)

## Exportiert

### `getMeta(text, field)`

Wert einer Kopfangabe ('' wenn nicht vorhanden).

### `getAllMeta(text)`

Alle Formularfelder auf einmal.

### `setMeta(text, field, value)`

Setzt (oder entfernt bei leerem Wert) eine Kopfangabe. Vorhandene Zeile wird ersetzt,
sonst wird die Angabe im Kopf (vor dem ersten Abschnitt/Liedtext) passend einsortiert.

### `getTags(text)`

Alle {tag: …}-Angaben.

### `setTags(text, tags)`

Ersetzt alle Tags; neue stehen im Kopf nach den übrigen Angaben.
