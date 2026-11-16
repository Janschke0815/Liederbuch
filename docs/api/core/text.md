# `src/core/text.js`

[← Übersicht](../README.md)

Textfunktionen, die an mehreren Stellen gebraucht werden: deutsch sortieren, für die Suche vereinfachen, Zeilenenden vereinheitlichen. Reine Funktionen.

**Benutzt von:** [`core/song-list.js`](song-list.md), [`formats/song-files.js`](../formats/song-files.md), [`storage/repository.js`](../storage/repository.md), [`storage/setlists.js`](../storage/setlists.md), [`sync/webdav-client.js`](../sync/webdav-client.md)

## Exportiert

### `collator`

`= new Intl.Collator('de', { sensitivity: 'base', numeric: true })`

Deutsche Sortierung: Groß/klein und Akzente egal, Zahlen der Größe nach („Lied 2“ vor „Lied 10“).

### `compareText(a, b)`

Zwei Texte deutsch vergleichen (für sort); leere Werte zählen als „“.

### `foldText(s)`

Für die Suche: klein, ohne Akzente, ß -> ss („Ärger“ findet „arger“).

### `normalizeText(t)`

Zeilenenden vereinheitlichen (Windows \r\n und altes Mac \r -> \n).
