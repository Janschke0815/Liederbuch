# `src/books.js`

[← Übersicht](README.md)

Mehrere Liederbücher auf einem Gerät. Jedes hat eine eigene lokale Datenbank.

```text
  persönlich:              PERSONAL – Speicherort und Anmeldung wie vor 2.2 (globale Schlüssel). Lässt
                           sich entfernen, sobald es weitere gibt (ab 2.6, removePersonal); ohne andere
                           Bücher ist es immer da.
  eigenes Liederbuch:      { id: 'book-…', name, dbName, own: true, file }
                           eigener Speicherort und eigenes Konto (Schlüssel mit „:<id>“, siehe bookKey);
                           file: Dateiname in Google Drive bzw. Dropbox („Liederbuch – Name.json“)
  geteilt (Drive):         { id: 'shared-…', name, dbName, shared, fileId, readOnly?, ownAuth? }
                           readOnly: nur Leserechte; ownAuth: eigene Google-Anmeldung (ab 2.2)
  abonniert (nur lesen):   { id: 'abo-…', name, dbName, abo: { url, publisher, user, password } }
```

**Benutzt von:** [`app.js`](app.md), [`books-ui.js`](books-ui.md), [`sync-ui.js`](sync-ui.md), [`sync/book-name.js`](sync/book-name.md), [`sync/book-settings.js`](sync/book-settings.md), [`ui/abo.js`](ui/abo.md), [`ui/add-songs.js`](ui/add-songs.md), [`ui/app-state.js`](ui/app-state.md), [`ui/context-menus.js`](ui/context-menus.md), [`ui/files.js`](ui/files.md), [`ui/publish.js`](ui/publish.md), [`ui/selection.js`](ui/selection.md), [`ui/song-actions.js`](ui/song-actions.md)

## Exportiert

### `PERSONAL`

`= Object.freeze({`

### `personalBookName(storage = localStorage)`

Name des persönlichen Liederbuchs (Standard „Mein Liederbuch“, umbenennbar).

### `isPersonalHidden(storage = localStorage)`

Ist das persönliche Liederbuch entfernt (und gibt es andere)?

### `listBooks(storage = localStorage)`

Alle Liederbücher, das persönliche zuerst (sofern nicht entfernt).

### `myBook(storage = localStorage)`

Das erste Liederbuch, in das man selbst schreiben darf (für „zu deinen Liedern“, „hierhin kopieren“).

### `homeBook(storage = localStorage)`

Wohin die App zurückfällt (nach Entfernen, Abo beenden …): das erste Liederbuch der Liste.

### `removePersonal(storage = localStorage)`

Persönliches Liederbuch entfernen – nur, wenn es weitere gibt. Seine Einstellungen auf diesem Gerät
(Speicherort, Zugangsdaten, Name) werden gelöscht; die globale Google-Anmeldung bleibt (sie gilt auch
für ältere gemeinsame Bücher und den Einladungs-Briefkasten). Die lokale Datenbank löscht der Aufrufer.

**Rückgabe:** `boolean` entfernt

### `restorePersonal(storage = localStorage)`

Entferntes persönliches Liederbuch wieder anlegen (leer; verbunden wird es wie ein neues).

### `getBook(id, storage = localStorage)`

Liederbuch mit dieser ID oder null.

### `activeBook(storage = localStorage)`

Das Liederbuch, das gerade geöffnet ist (sonst das erste der Liste).

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
Abos lassen sich nicht umbenennen (der Name kommt vom Herausgeber).

**Rückgabe:** `boolean` umbenannt

### `bookKey(book, base)`

Schlüssel für eine Einstellung eines Liederbuchs (Speicherort, Zugangsdaten, Anmeldung).
Das persönliche Liederbuch nutzt die alten, globalen Schlüssel (keine Umstellung nötig), vor 2.2
geteilte Bücher die globale Google-Anmeldung; alles andere ist je Buch getrennt: „webdav.url:book-abc“.
(So überschreibt z. B. ein geteiltes Buch nie den Speicherort des persönlichen.)

### `unknownDriveBooks(files, storage = localStorage)`

Liederbuch-Dateien aus Google Drive, die auf diesem Gerät noch kein Liederbuch haben
(bekannt per Datei-ID oder – solange die ID noch nicht gemerkt ist – per Dateiname).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `files` | `{fileId: string, name: string}[]` | aus GoogleDriveProvider.listOwnBooks() |

**Rückgabe:** `{fileId: string, name: string}[]`

### `adoptDriveBook({ fileId, name, shared = false }, auth = {}, storage = localStorage)`

Liederbuch für eine eigene Drive-Datei eintragen, gleich mit Google Drive verbunden.
auth: Anmeldung, die das Buch übernimmt ({token, account} – Werte aus dem Speicher; global: nutzt
die Anmeldung des persönlichen Liederbuchs).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `file` | `{fileId: string, name: string, shared?: boolean}` |  |
| `auth` | `{token?: string\|null, account?: string\|null, global?: boolean}` |  |

**Rückgabe:** `object` das neue Buch

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
- `personal(storage)` – Das persönliche Liederbuch, mit eigenem Namen, falls umbenannt.
- `shortHash(text)` – Kurze, feste Kennung aus einem Text (für IDs und Datenbanknamen).
