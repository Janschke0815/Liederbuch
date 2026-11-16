# `src/sync/google-drive.js`

[← Übersicht](../README.md)

Cloud-Anbieter Google Drive: jedes Liederbuch ist eine JSON-Datei in Drive.

```text
  persönlich:  "Liederbuch.json" im eigenen Drive (wird gesucht bzw. angelegt)
  gemeinsam:   "Liederbuch – <Name>.json", per Drive mit anderen geteilt
```

Anmeldung über Google Identity Services (nur im Browser, kein eigener Server nötig). Berechtigung "drive.file": die App sieht ausschließlich Dateien, die sie selbst angelegt hat oder die man ihr über die Google-Dateiauswahl (Picker) gibt – nicht den Rest des Drives.

**Benutzt:** [`formats/file-format.js`](../formats/file-format.md), [`sync/sync-engine.js`](sync-engine.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `class NoAccessError extends Error`

Fehler: Auf ein gemeinsames Liederbuch gibt es keinen Zugriff mehr (gelöscht oder Freigabe entfernt).

#### `new NoAccessError()`

### `class GoogleDriveProvider`

Cloud-Anbieter Google Drive: eine JSON-Datei pro Liederbuch, gemeinsame Liederbücher über Freigaben.

#### `new GoogleDriveProvider({ clientId, apiKey = '', appId = '', book = { shared: false, fileId: null }, storage = localStorage } = {})`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{clientId: string, apiKey?: string, appId?: string,` |  | book?: {shared: boolean, fileId: string\|null}, storage?: Storage}} opts |

#### `token()`

Gespeichertes Zugangstoken, solange es gültig ist, sonst null.

#### `get signedIn`

Gibt es ein gültiges Zugangstoken?

#### `async signIn({ silent = false } = {})`

Holt einen Zugangsschlüssel. Muss aus einem Klick heraus aufgerufen werden, weil Google
dafür ein kleines Fenster öffnet. silent: ohne Rückfrage, wenn schon einmal erlaubt.

#### `signOut()`

Abmelden; die Dateien in Drive bleiben erhalten.

#### `async read(knownVersion)`

Liederbuch aus Drive lesen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[knownVersion]` | `string` | zuletzt gelesene Version – ist sie gleich, wird nichts geladen |

**Rückgabe:** `Promise<null | {unchanged: true} | {data: object, version: string}>`

#### `async write(data, expectedVersion)`

Liederbuch nach Drive schreiben (nur, wenn die Datei noch die erwartete Version hat).

**Rückgabe:** `Promise<string>` neue Version

#### `async createShared(fileName, data)`

Neue gemeinsame Datei anlegen. @returns {Promise<{id, name}>}

#### `async info()`

Name, eigene Rechte und Besitzer der aktuellen Datei.

#### `async members()`

Wer Zugriff auf das gemeinsame Liederbuch hat.

**Rückgabe:** `Promise<{id: string, email: string, name: string, role: string}[]>`

#### `async invite(email, message)`

Person einladen (darf bearbeiten); Google verschickt die Einladungs-Mail.

#### `async removeMember(permissionId)`

Zugriff einer Person entfernen.

#### `async pickShared()`

Google-Dateiauswahl für Liederbücher, die mit mir geteilt wurden.
Erst durch die Auswahl darf die App (Berechtigung drive.file) die Datei öffnen.

**Rückgabe:** `Promise<{id, name} | null>`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `loadScript(src)`
