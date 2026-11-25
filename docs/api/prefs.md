# `src/prefs.js`

[← Übersicht](README.md)

Alles, was sich die App pro Gerät im Browser merkt (localStorage) – an einer Stelle.

Jeder Eintrag hat einen Namen, den Schlüssel im Speicher und einen Standardwert. Der Typ des Standardwerts bestimmt, wie gelesen wird:

```text
  Text -> wie gespeichert    Zahl -> Number    true/false -> '1' bzw. ''    Objekt/Array -> JSON
```

So gibt es keine Tippfehler bei Schlüsseln, und man sieht auf einen Blick, was gespeichert wird.

Nicht hier, weil die Module ihren Speicher selbst verwalten (und dafür Tests haben):

```text
  settings          Schrift, Farben, Druck            src/settings/settings.js
  printOptions, printFonts, printPins                src/print-ui.js, src/print/*.js
  books, activeBook gemeinsame Liederbücher           src/books.js
  sync.*, webdav.*  Cloud-Verbindung, Zugangsdaten    src/sync-ui.js, src/books-ui.js, src/sync/*.js
  liveLead          Raum-Code des Vorsingers (sessionStorage, nur bis der Tab zu ist)   src/live-ui.js
```

**Benutzt von:** [`app.js`](app.md), [`books-ui.js`](books-ui.md), [`play-mode.js`](play-mode.md), [`setlist-ui.js`](setlist-ui.md), [`settings-ui.js`](settings-ui.md), [`sync-ui.js`](sync-ui.md), [`ui/abo.js`](ui/abo.md), [`ui/chord-filter.js`](ui/chord-filter.md), [`ui/chord-tap.js`](ui/chord-tap.md), [`ui/harp-from-notes.js`](ui/harp-from-notes.md), [`ui/list.js`](ui/list.md), [`ui/preview-tools.js`](ui/preview-tools.md), [`ui/publish.js`](ui/publish.md), [`ui/song.js`](ui/song.md), [`ui/toolbar.js`](ui/toolbar.md), [`ui/view.js`](ui/view.md)

## Exportiert

### `PREFS`

`= {`

### `createPrefs(storage = globalThis.localStorage)`

Zugriff auf die Werte aus PREFS.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `storage` | `Storage` | für Tests austauschbar |

### `prefs`

`= createPrefs()`
