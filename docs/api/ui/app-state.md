# `src/ui/app-state.js`

[← Übersicht](../README.md)

Gemeinsamer Zustand der Oberfläche: welches Liederbuch, seine Datenbanken und das gerade geöffnete Lied. Alle ui-Module holen sich das hier, statt es herumzureichen.

Ereignisse (auf window), auf die sich Module anmelden können:

```text
  songopened   ein anderes Lied ist geöffnet (detail: id oder null)
  repo 'change'  Lieder wurden geändert (eigene oder vom Abgleich)
```

**Benutzt:** [`books.js`](../books.md), [`storage/repository.js`](../storage/repository.md), [`storage/setlists.js`](../storage/setlists.md), [`storage/stores.js`](../storage/stores.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/abo.js`](abo.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-keys.js`](app-keys.md), [`ui/capo-help.js`](capo-help.md), [`ui/context-menus.js`](context-menus.md), [`ui/files.js`](files.md), [`ui/list.js`](list.md), [`ui/paste.js`](paste.md), [`ui/publish.js`](publish.md), [`ui/share.js`](share.md), [`ui/snippets.js`](snippets.md), [`ui/song-actions.js`](song-actions.md), [`ui/song.js`](song.md), [`ui/trash.js`](trash.md)

## Exportiert

### `book`

`= activeBook()`

Persönliches oder gemeinsames Liederbuch.

### `repo`

`= new SongRepository(await openIdbStore(book.dbName))`

### `sets`

`= new SetlistRepository(await openIdbStore(book.dbName, 'setlists'))`

### `readOnly`

`= Boolean(book.abo \|\| book.readOnly)`

Nur lesen (Text ändern, anlegen, löschen gesperrt): abonniertes Liederbuch oder ein in Google Drive
geteiltes Liederbuch, für das man nur Leserechte hat.

### `state`

`= { current: null }`

Veränderlicher Zustand. current: das geöffnete Lied (Datensatz aus repo) oder null.

### `services`

`= { printer: null, play: null, setlists: null, started: null }`

Teile, die app.js beim Start einrichtet und die mehrere Module brauchen:
  printer   setupPrint()     – printSongs(list, opts)
  play      setupPlayMode()  – open(id, list?)
  setlists  setupSetlists()  – open(id)
  started   Promise, erfüllt sobald das erste Lied geöffnet ist
