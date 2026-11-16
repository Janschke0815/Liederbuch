# `src/core/repeat.js`

[← Übersicht](../README.md)

Wiederholungsangaben wie "2×", "x2", "(2x)", "2 mal" am Ende eines Textes. Werden im Lied als kleines Abzeichen dargestellt statt als Liedtext.

**Benutzt von:** [`formats/ug-import.js`](../formats/ug-import.md), [`render/song-view.js`](../render/song-view.md), [`ui/snippets.js`](../ui/snippets.md)

## Exportiert

### `splitRepeat(text)`

"Refrain x2" -> {text: 'Refrain', times: 2}; ohne Angabe -> {text, times: null}

### `formatRepeat(n)`

Anzahl als Wiederholungs-Text: 2 -> „2×“.

### `bumpRepeat(line)`

Editor: Wiederholung an einer Zeile setzen oder hochzählen.
Abschnittsanfang {start_of_…: Name} -> Angabe in den Namen, sonst ans Zeilenende.
