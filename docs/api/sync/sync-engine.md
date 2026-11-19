# `src/sync/sync-engine.js`

[← Übersicht](../README.md)

Abgleich der lokalen Datenbank mit einer gemeinsamen Datei in der Cloud.

Prinzip: Jedes Gerät hat eine vollständige lokale Kopie (offline nutzbar). Beim Abgleich wird pro Lied die neuere Fassung genommen (updatedAt), Löschungen sind Grabsteine. Dadurch ist das Zusammenführen in jeder Reihenfolge und beliebig oft wiederholbar: Überschreibt ein Gerät versehentlich eine fremde Änderung in der Cloud, lädt das andere Gerät sie beim nächsten Abgleich einfach wieder hoch.

Ein Anbieter (Provider) braucht nur:

```text
  read(knownVersion) -> null (noch keine Datei) | {unchanged: true} | {data, version, rewrite?}
  write(data, expectedVersion) -> neue version; wirft ConflictError, wenn sich die Datei
                                  inzwischen geändert hat
```

**Benutzt:** [`storage/repository.js`](../storage/repository.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md), [`sync/abo-client.js`](abo-client.md), [`sync/google-drive.js`](google-drive.md), [`sync/webdav-client.js`](webdav-client.md), [`sync/webdav.js`](webdav.md)

## Exportiert

### `SYNC_FORMAT`

`= 'liederbuch-sync'`

### `SYNC_VERSION`

`= 2`

2: zusätzlich Setlisten ("setlists"); Version-1-Dateien werden weiter gelesen

### `class ConflictError extends Error`

Fehler: Die Datei in der Cloud wurde inzwischen geändert – neu lesen und zusammenführen.

#### `new ConflictError()`

### `class AuthError extends Error`

Fehler: Anmeldung nötig oder abgelaufen (die Oberfläche zeigt dann „Neu anmelden“).

#### `new AuthError(msg = 'Anmeldung nötig')`

### `mergeRecords(local, remote, slim = slimRecord)`

Führt lokale und entfernte Datensätze zusammen.

**Rückgabe:** `{merged: object[], toLocal: object[], remoteChanged: boolean}`

### `class SyncEngine extends EventTarget`

Status: 'off' | 'idle' | 'syncing' | 'offline' | 'auth' | 'error'
Ereignisse: "status" (bei jeder Änderung von state/lastSync/error)

#### `new SyncEngine(repo, provider, { pollMs = 15000, debounceMs = 1500, beforeSync, extra = [] } = {})`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `repo` |  | Lieder (SongRepository) |
| `provider` |  | Cloud-Anbieter |
| `opts.extra` |  | weitere Sammlungen, z. B. [{ key: 'setlists', repo, slim }] |

#### `start()`

Startet automatischen Abgleich (nach Änderungen, regelmäßig, beim Zurückkehren).

#### `stop()`

Abgleich beenden (Verbindung trennen).

#### `schedule()`

Abgleich bald ausführen (kurz gewartet, damit mehrere Änderungen zusammen übertragen werden).

#### `sync()`

Ein Abgleich; laufen schon einer, folgt direkt danach ein weiterer.
