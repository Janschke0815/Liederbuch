# `src/sync/book-name.js`

[← Übersicht](../README.md)

Name eines Liederbuchs mit abgleichen. Er steht als einzelner Datensatz in der Cloud-Datei (Schlüssel "book": [{ id: 'name', name, updatedAt }]) und wird wie ein Lied zusammengeführt: Die neueste Umbenennung gewinnt.

Wurde der Name nie bewusst gewählt (persönliches Buch mit Standardnamen „Mein Liederbuch“), gibt es keinen Datensatz – dann übernimmt das Gerät den Namen aus der Cloud. Ein Name, der schon vor dieser Version gewählt wurde, zählt mit der ältestmöglichen Zeit: Er gewinnt gegen den Standardnamen, verliert aber gegen jede spätere Umbenennung.

**Benutzt:** [`books.js`](../books.md), [`sync/google-drive.js`](google-drive.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `slimName(r)`

Datensatz für die Cloud-Datei.

### `nameRecord(book, storage = localStorage)`

Eigener Namens-Datensatz eines Liederbuchs auf diesem Gerät (oder null beim Standardnamen).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `book` | `{id: string, name: string}` |  |

### `driveFileName(book, name)`

Dateiname in Google Drive zum Namen: persönliches Buch mit Standardnamen „Liederbuch.json“,
sonst „Liederbuch – Name.json“.

### `class BookNameStore extends EventTarget`

Sammlung „book“ für den Abgleich (wie SongRepository: allRecords, applyRemote, Ereignis „change“).
Ereignis „remote-name“ (detail: neuer Name), wenn ein anderes Gerät umbenannt hat.

#### `new BookNameStore(book, storage = localStorage)`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `book` | `{id: string, name: string}` | das geöffnete Liederbuch (sein name wird mitgeführt) |

#### `async allRecords()`

**Rückgabe:** `Promise<object[]>`

#### `async applyRemote(records)`

Name von einem anderen Gerät übernehmen.

### `rememberRename(book, name, storage = localStorage, now = new Date()`

Umbenennen eines Buchs, das gerade nicht geöffnet ist: nur den Datensatz merken (geht beim nächsten Öffnen mit).
