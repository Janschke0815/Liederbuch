# `src/sync/book-settings.js`

[← Übersicht](../README.md)

Wo ein Liederbuch abgeglichen wird: die gespeicherten Einstellungen je Buch (Schlüssel über bookKey, siehe books.js). Gemeinsam genutzt vom Cloud-Dialog (sync-ui.js) und den Liederbüchern (books-ui.js).

**Benutzt:** [`books.js`](../books.md)  
**Benutzt von:** [`books-ui.js`](../books-ui.md), [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `syncKindOf(b, storage = localStorage)`

Speicherort eines Liederbuchs. Geteilte Liederbücher laufen immer über Google Drive, alle anderen
wahlweise über Dropbox oder WebDAV.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `b` | `object` | Liederbuch (aus listBooks()) |

**Rückgabe:** `'gdrive'|'dropbox'|'webdav'`

### `webdavOf(b, storage = localStorage)`

Gespeicherte WebDAV-Zugangsdaten eines Liederbuchs.

**Rückgabe:** `{url: string, user: string, password: string}`

### `connectedVia(b, storage = localStorage)`

Womit das Buch zuletzt verbunden wurde ('gdrive', 'dropbox', 'webdav') oder null.
