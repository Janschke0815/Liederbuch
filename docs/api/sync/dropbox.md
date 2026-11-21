# `src/sync/dropbox.js`

[← Übersicht](../README.md)

Cloud-Anbieter Dropbox: das persönliche Liederbuch ist eine JSON-Datei im App-Ordner (Dropbox → Apps → <Name der Dropbox-App> → Liederbuch.json). Die App sieht nur diesen Ordner.

Anmeldung ohne eigenen Server: OAuth mit PKCE. Die Seite leitet zu Dropbox weiter und kommt mit ?code=… zurück (startLogin / finishLogin). Dropbox gibt ein Langzeit-Token (refresh_token) – danach muss man sich nicht mehr anmelden; das kurzlebige Zugangstoken wird still erneuert.

Versionen: Dropbox vergibt jeder Dateifassung eine „rev“. Geschrieben wird nur, wenn die Datei noch die erwartete rev hat (mode update + strict_conflict) – sonst ConflictError, die Sync-Engine liest neu und führt zusammen.

**Benutzt:** [`formats/file-format.js`](../formats/file-format.md), [`sync/sync-engine.js`](sync-engine.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `DROPBOX_FILE`

`= '/Liederbuch.json'`

### `headerJson(value)`

JSON für Dropbox-API-Arg: Header dürfen nur ASCII enthalten, alles andere als \uXXXX.

### `randomVerifier()`

Zufälliger Prüfschlüssel (code_verifier) für PKCE, 64 Zeichen.

### `async pkceChallenge(verifier)`

code_challenge = base64url(SHA-256(verifier))

### `dropboxRedirectUri(loc = location)`

Rücksprung-Adresse: diese Seite ohne Abfrage und Anker (muss so bei Dropbox eingetragen sein).

### `class DropboxProvider`

Cloud-Anbieter Dropbox: eine JSON-Datei im App-Ordner, Anmeldung per PKCE.

#### `new DropboxProvider({)`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `opts` | `{appKey: string, fetch?: typeof fetch, storage?: Storage, redirectUri?: string}` |  |

#### `get signedIn`

Ist die App mit Dropbox verbunden (Langzeit-Token vorhanden)?

#### `async loginUrl(extra = {})`

Anmeldung beginnen: Prüfschlüssel merken und zu Dropbox weiterleiten.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[extra]` | `object` | wird bis zur Rückkehr aufbewahrt (z. B. welches Liederbuch) |

**Rückgabe:** `Promise<string>` Adresse der Dropbox-Anmeldeseite

#### `async finishLogin(query)`

Rückkehr von Dropbox auswerten (?code=…&state=… oder ?error=…).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `query` | `URLSearchParams` |  |

**Rückgabe:** `Promise<null | object>` null, wenn die Adresse keine Dropbox-Rückkehr ist; sonst die bei loginUrl() aufbewahrten Angaben. Wirft AuthError bei Abbruch oder Fehler.

#### `signOut()`

Abmelden (Zugang bei Dropbox widerrufen); die Datei in Dropbox bleibt erhalten.

#### `async read(knownVersion)`

Liederbuch aus Dropbox lesen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[knownVersion]` | `string` | zuletzt gelesene rev – ist sie gleich, wird nichts geladen |

**Rückgabe:** `Promise<null | {unchanged: true} | {data: object, version: string}>`

#### `async write(data, expectedVersion)`

Liederbuch nach Dropbox schreiben (nur, wenn die Datei noch die erwartete rev hat).

**Rückgabe:** `Promise<string>` neue rev
