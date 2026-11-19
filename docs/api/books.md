# `src/books.js`

[← Übersicht](README.md)

Mehrere Liederbücher auf einem Gerät: das persönliche und beliebig viele gemeinsame. Jedes hat eine eigene lokale Datenbank; gemeinsame sind an eine geteilte Drive-Datei gebunden.

Buch: { id, name, dbName, shared, fileId }

```text
  abonniertes Liederbuch (nur lesen): { id: 'abo-…', name, dbName, abo: { url, publisher, user, password } }
```

**Benutzt von:** [`sync-ui.js`](sync-ui.md), [`ui/abo.js`](ui/abo.md), [`ui/app-state.js`](ui/app-state.md)

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

### `addAboBook({ url, name, publisher = '', user = '', password = '' }, storage = localStorage)`

Abonniertes Liederbuch eintragen (oder Namen/Schlüssel aktualisieren). Eigene Datenbank, nur lesen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `abo` | `{url: string, name?: string, publisher?: string, user?: string, password?: string}` | user/password: Anmeldung am Server, falls der Ordner geschützt ist (bleibt auf diesem Gerät) |

### `removeBook(id, storage = localStorage)`

Aus der Liste entfernen; die lokale Datenbank löscht der Aufrufer.

### `bookNameFromFile(fileName)`

Dateiname in Drive -> Anzeigename ("Liederbuch – Band.json" -> "Band").

### `fileNameForBook(name)`

Dateiname der Drive-Datei für ein gemeinsames Liederbuch: „Liederbuch – Name.json“.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `read(storage)`
- `shortHash(text)` – Kurze, feste Kennung aus einem Text (für IDs und Datenbanknamen).
