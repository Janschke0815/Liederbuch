# `src/ui/notes-import.js`

[← Übersicht](../README.md)

Dialog „Noten einfügen“ (Baustein „Noten“ über dem Editor): MusicXML-Datei oder ABC aus dem Internet als Notenabschnitt ins Lied holen (core/abc-import.js, core/musicxml.js), mit Vorschau. Fehlen im Lied Titel, Tonart, Takt oder Tempo, werden sie auf Wunsch aus den Noten übernommen. Fügt man ein ganzes Notenstück direkt in den Editor ein, öffnet sich der Dialog ebenfalls.

**Benutzt:** [`core/abc-import.js`](../core/abc-import.md), [`core/chordpro.js`](../core/chordpro.md), [`core/musicxml.js`](../core/musicxml.md), [`render/abc-view.js`](../render/abc-view.md), [`render/song-view.js`](../render/song-view.md), [`settings/settings.js`](../settings/settings.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/snippets.js`](snippets.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Exportiert

### `openNotesImport({ text = '' } = {})`

Dialog „Noten einfügen“ öffnen (Baustein „Noten“, Alt+N).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[opts]` | `{text?: string}` | text: schon eingefügter Notentext (z. B. aus der Zwischenablage) |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `missingMeta(t)` – Was aus den Noten ins Lied übernommen würde (nur, was dort noch fehlt).
- `async update({ part } = {})`
- `async showTune()`
- `async loadFile(file)` – Datei lesen: .mxl ist gepackt, alles andere Text.
- `restoreCursor()` – Zurück in den Editor an die gemerkte Stelle
- `insideAbc()` – Steht der Cursor in einem Notenabschnitt? Dann wird Eingefügtes nicht umgeleitet.
