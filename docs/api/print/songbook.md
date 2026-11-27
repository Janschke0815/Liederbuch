# `src/print/songbook.js`

[← Übersicht](../README.md)

Druckfertiges Liederbuch: Deckblatt, Inhaltsverzeichnis, ein Lied pro neuer Seite.

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`print/paginate.js`](paginate.md), [`print/spreads.js`](spreads.md), [`render/abc-view.js`](../render/abc-view.md), [`render/song-view.js`](../render/song-view.md)  
**Benutzt von:** [`print-ui.js`](../print-ui.md)

## Exportiert

### `PAPER`

`= {`

### `DEFAULT_PRINT_OPTIONS`

`= {`

### `async buildSongbook(root, songs, options = {})`

Baut das Liederbuch in root auf.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `root` | `HTMLElement` |  |
| `songs` | `Array<{id, title, artist, chordpro, transpose, accidentals}>` | bereits sortiert |
| `options` | `typeof DEFAULT_PRINT_OPTIONS` |  |

**Rückgabe:**  {Promise<{pages: number, songPages: Map<string, number>, pageCounts: Map<string, number>, firstSongPage: number, blanks: number, startsRight: string[], overflows: number}>} pageCounts: Seiten je Lied; blanks: eingefügte Leerseiten; startsRight: mehrseitige Lieder, die rechts beginnen (nur mit Doppelseiten ohne Leerseiten)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `el(tag, className, text)`
- `buildCover(opts, count)`
- `buildToc(songs)`
- `prepareSong(article, id)` – Bereitet ein gerendertes Lied für den Umbruch vor.
