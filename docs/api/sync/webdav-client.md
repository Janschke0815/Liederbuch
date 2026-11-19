# `src/sync/webdav-client.js`

[← Übersicht](../README.md)

WebDAV über HTTP: Anmeldung, Ordnerliste (PROPFIND), Dateien lesen, schreiben, löschen. Weiß nichts von Liedern – das macht webdav.js. Fehler werden in verständliche Meldungen übersetzt.

**Benutzt:** [`core/text.js`](../core/text.md), [`formats/song-files.js`](../formats/song-files.md), [`sync/sync-engine.js`](sync-engine.md)  
**Benutzt von:** [`sync/abo-client.js`](abo-client.md), [`sync/webdav.js`](webdav.md), [`ui/publish.js`](../ui/publish.md)

## Exportiert

### `class WebdavClient`

HTTP-Zugriff auf einen WebDAV-Ordner mit Anmeldung und verständlichen Fehlermeldungen.

#### `new WebdavClient({ user = '', password = '', fetch, host = '' })`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `opts` | `{user?: string, password?: string, fetch: typeof fetch, host?: string}` | host: nur für Fehlermeldungen („Server … nicht erreichbar“) |

#### `async request(method, url, { headers = {}, body } = {})`

Eine Anfrage; 401/403 werden zu AuthError, Netzfehler zu einer erklärenden Meldung.

#### `async list(dirUrl)`

Ordnerliste (Name -> {etag, modified}). Fehlt der Ordner: leere Liste mit folderMissing.

#### `async text(url, etag)`

Textdatei lesen (Zeilenenden vereinheitlicht). null = gibt es nicht.

#### `remember(url, etag, text)`

Was gerade geschrieben wurde, gleich in den Zwischenspeicher (spart das Neuladen).

#### `async ensureFolders(...urls)`

Ordner anlegen (vorhandene sind kein Fehler).

#### `async put(url, body, headers = {}, folders = [])`

Datei schreiben. headers z. B. {'If-Match': etag} oder {'If-None-Match': '*'}.
412 (inzwischen geändert) -> ConflictError. Liefert das neue ETag.

#### `async putNew(urlOf, base, ext, body, taken, folders = [])`

Neue Datei unter freiem Namen anlegen: „Name.cho“, „Name (2).cho“ … Liegt unter einem Namen
schon genau dieser Inhalt, gilt die Datei als geschrieben.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `urlOf` |  | Dateiname -> Adresse |
| `taken` |  | schon vergebene Namen (klein geschrieben); wird ergänzt |

#### `async delete(url, etag)`

Datei löschen (nur, wenn sie noch das erwartete ETag hat). Fehlt sie schon: auch gut.
