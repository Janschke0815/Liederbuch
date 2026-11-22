# `src/books.js`

[← Übersicht](README.md)

Mehrere Liederbücher auf einem Gerät. Jedes hat eine eigene lokale Datenbank.

```text
  persönlich (immer da):  PERSONAL – Speicherort und Anmeldung wie vor 2.2 (globale Schlüssel)
  eigenes Liederbuch:      { id: 'book-…', name, dbName, own: true, file }
                           eigener Speicherort und eigenes Konto (Schlüssel mit „:<id>“, siehe bookKey);
                           file: Dateiname in Google Drive bzw. Dropbox („Liederbuch – Name.json“)
  geteilt (Drive):         { id: 'shared-…', name, dbName, shared, fileId, readOnly?, ownAuth? }
                           readOnly: nur Leserechte; ownAuth: eigene Google-Anmeldung (ab 2.2)
  abonniert (nur lesen):   { id: 'abo-…', name, dbName, abo: { url, publisher, user, password } }
```

**Benutzt von:** [`app.js`](app.md), [`sync-ui.js`](sync-ui.md), [`ui/abo.js`](ui/abo.md), [`ui/app-state.js`](ui/app-state.md), [`ui/publish.js`](ui/publish.md)

## Exportiert

### `PERSONAL`

`= Object.freeze({`

### `listBooks(storage = localStorage)`

Alle Liederbücher, das persönliche zuerst.

### `getBook(id, storage = localStorage)`

Liederbuch mit dieser ID oder null.

### `activeBook(storage = localStorage)`

Das Liederbuch, das gerade geöffnet ist (sonst das persönliche).

### `setActiveBook(id, storage = localStorage)`

Liederbuch für den nächsten Start merken (nur bekannte IDs).

### `addSharedBook({ fileId, name, readOnly = false, ownAuth }, storage = localStorage)`

Gemeinsames Liederbuch eintragen (oder Namen/Rechte aktualisieren).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `entry` | `{fileId: string, name?: string, readOnly?: boolean}` | readOnly: nur Leserechte |

### `addAboBook({ url, name, publisher = '', user = '', password = '' }, storage = localStorage)`

Abonniertes Liederbuch eintragen (oder Namen/Schlüssel aktualisieren). Eigene Datenbank, nur lesen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `abo` | `{url: string, name?: string, publisher?: string, user?: string, password?: string}` | user/password: Anmeldung am Server, falls der Ordner geschützt ist (bleibt auf diesem Gerät) |

### `addBook({ name }, storage = localStorage)`

Eigenes Liederbuch anlegen (lokal; Speicherort und Konto wählt man danach im Cloud-Dialog).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `entry` | `{name: string}` |  |

**Rückgabe:** `object` das neue Buch

### `renameBook(id, name, storage = localStorage)`

Liederbuch umbenennen (nur der Name in der App; Dateien in der Cloud behalten ihren Namen).
Das persönliche Liederbuch und Abos lassen sich nicht umbenennen.

**Rückgabe:** `boolean` umbenannt

### `bookKey(book, base)`

Schlüssel für eine Einstellung eines Liederbuchs (Speicherort, Zugangsdaten, Anmeldung).
Das persönliche Liederbuch und vor 2.2 geteilte Bücher nutzen die alten, globalen Schlüssel
(keine Umstellung nötig); alle anderen bekommen eigene: „webdav.url:book-abc“.

### `BOOK_KEYS`

`= Object.freeze([`

Einstellungen, die bookKey pro Liederbuch trennt.

### `removeBook(id, storage = localStorage)`

Aus der Liste entfernen (samt eigener Einstellungen); die lokale Datenbank löscht der Aufrufer.

### `bookNameFromFile(fileName)`

Dateiname in Drive -> Anzeigename ("Liederbuch – Band.json" -> "Band").

### `driveBookName(fileName, ownerName = '')`

Anzeigename für ein in Drive geteiltes Liederbuch: das persönliche „Liederbuch.json“ einer anderen
Person heißt „Liederbuch von <Name>“, sonst wie bookNameFromFile.

### `fileNameForBook(name)`

Dateiname der Drive-Datei für ein gemeinsames Liederbuch: „Liederbuch – Name.json“.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `read(storage)`
- `shortHash(text)` – Kurze, feste Kennung aus einem Text (für IDs und Datenbanknamen).
