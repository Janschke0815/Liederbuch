# `src/books.js`

[← Übersicht](README.md)

Mehrere Liederbücher auf einem Gerät: das persönliche und beliebig viele gemeinsame. Jedes hat eine eigene lokale Datenbank; gemeinsame sind an eine geteilte Drive-Datei gebunden.

Buch: { id, name, dbName, shared, fileId }

**Benutzt von:** [`sync-ui.js`](sync-ui.md), [`ui/app-state.js`](ui/app-state.md)

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

### `addSharedBook({ fileId, name }, storage = localStorage)`

Gemeinsames Liederbuch eintragen (oder Namen aktualisieren).

### `removeBook(id, storage = localStorage)`

Aus der Liste entfernen; die lokale Datenbank löscht der Aufrufer.

### `bookNameFromFile(fileName)`

Dateiname in Drive -> Anzeigename ("Liederbuch – Band.json" -> "Band").

### `fileNameForBook(name)`

Dateiname der Drive-Datei für ein gemeinsames Liederbuch: „Liederbuch – Name.json“.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `read(storage)`
