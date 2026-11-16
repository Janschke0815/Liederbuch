# `src/ui/paste.js`

[← Übersicht](../README.md)

Text einfügen: Akkorde-über-Text (z. B. von Ultimate Guitar) oder ChordPro wird zu Liedern. Auch Strg+V irgendwo in der App und das Lesezeichen „Ins Liederbuch“ landen hier.

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`formats/paste-import.js`](../formats/paste-import.md), [`formats/ug-bookmarklet.js`](../formats/ug-bookmarklet.md), [`render/song-view.js`](../render/song-view.md), [`settings/settings.js`](../settings/settings.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/view.js`](view.md)  
**Benutzt von:** [`app.js`](../app.md)

## Exportiert

### `async openImport(text = '')`

Einfügen-Dialog öffnen, optional mit Text.

### `checkBookmarkHash`

`= takeUgFromHash`

Beim Start: kam die App über das Lesezeichen?

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `pastedSongs()` – Eingefügter Text -> Lieder (Titel/Interpret aus den Feldern gelten nur bei einem Lied).
- `infoText(songs)`
- `renderPreview()`
- `async takeUgFromHash()`
- `openBookmarkDialog()`
