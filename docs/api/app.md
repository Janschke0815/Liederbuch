# `src/app.js`

[← Übersicht](README.md)

Einstieg der App: steckt die Teile der Oberfläche zusammen und öffnet das erste Lied.

Wo was steht:

```text
  ui/app-state.js     Liederbuch, Datenbanken, geöffnetes Lied
  ui/dom.js           kleine Hilfen ($, toast, ask …)
  ui/song.js          Lied öffnen/speichern, Vorschau, Transponieren, Liedinfo
  ui/list.js          Liederliste mit Suche, Filtern, Sortierung
  ui/view.js          Handy-Reiter, Editor ausblenden, Menü
  ui/song-actions.js  Anlegen, Löschen, Duplizieren, Setliste
  ui/snippets.js      Bausteine über dem Editor, Syntax-Hilfe
  ui/preview-tools.js Zoom, Metronom
  ui/paste.js         Text einfügen, Lesezeichen „Ins Liederbuch“
  ui/add-songs.js     Anlegen mit Nachfrage bei doppelten Liedern
  ui/files.js         Dateien öffnen, ZIP-Sicherung
  ui/abo.js, ui/publish.js   Liederbuch abonnieren bzw. für eine Gruppe veröffentlichen
  ui/trash.js, share.js, capo-help.js, context-menus.js
  ui/app-keys.js, ui/shortcuts.js   Tastenkürzel
  play-mode.js, print-ui.js, setlist-ui.js, settings-ui.js, sync-ui.js   größere Bereiche
```

**Benutzt:** [`books.js`](books.md), [`live-ui.js`](live-ui.md), [`play-mode.js`](play-mode.md), [`prefs.js`](prefs.md), [`print-ui.js`](print-ui.md), [`sample.js`](sample.md), [`setlist-ui.js`](setlist-ui.md), [`settings-ui.js`](settings-ui.md), [`storage/setlists.js`](storage/setlists.md), [`sync-ui.js`](sync-ui.md), [`ui/abo.js`](ui/abo.md), [`ui/add-songs.js`](ui/add-songs.md), [`ui/app-keys.js`](ui/app-keys.md), [`ui/app-state.js`](ui/app-state.md), [`ui/capo-help.js`](ui/capo-help.md), [`ui/context-menus.js`](ui/context-menus.md), [`ui/dom.js`](ui/dom.md), [`ui/files.js`](ui/files.md), [`ui/list.js`](ui/list.md), [`ui/paste.js`](ui/paste.md), [`ui/preview-tools.js`](ui/preview-tools.md), [`ui/publish.js`](ui/publish.md), [`ui/share.js`](ui/share.md), [`ui/snippets.js`](ui/snippets.md), [`ui/song-actions.js`](ui/song-actions.md), [`ui/song.js`](ui/song.md), [`ui/toolbar.js`](ui/toolbar.md), [`ui/trash.js`](ui/trash.md), [`ui/view.js`](ui/view.md), [`version.js`](version.md)  

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async start()`
