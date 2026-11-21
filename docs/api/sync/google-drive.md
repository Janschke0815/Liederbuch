# `src/sync/google-drive.js`

[← Übersicht](../README.md)

Speicherschicht Google Drive: jedes Liederbuch ist eine JSON-Datei in Drive (Format liederbuch-sync).

```text
  persönlich:  "Liederbuch.json" im eigenen Drive (wird gesucht bzw. angelegt)
  gemeinsam:   "Liederbuch – <Name>.json", per Drive mit anderen geteilt
```

Hier stehen nur die Drive-Zugriffe. Die Anmeldung kommt von außen (auth, siehe google-auth.js) – so lässt sich die Speicherung austauschen und mit einer Attrappe testen.

Rechte: Wer eine Datei nur lesen darf (Drive-Freigabe „Betrachter“), dem verweigert Google das Schreiben – unabhängig davon, was die App anzeigt. role() fragt die eigenen Rechte ab, die App schaltet das Liederbuch dann auf „nur lesen“.

Berechtigung "drive.file": Die App sieht ausschließlich Dateien, die sie selbst angelegt hat oder die man ihr über die Google-Dateiauswahl (Picker) gibt – nicht den Rest des Drives.

**Benutzt:** [`formats/file-format.js`](../formats/file-format.md), [`sync/google-auth.js`](google-auth.md), [`sync/sync-engine.js`](sync-engine.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `PERSONAL_FILE`

`= 'Liederbuch.json'`

### `class NoAccessError extends Error`

Fehler: Auf ein gemeinsames Liederbuch gibt es keinen Zugriff mehr (gelöscht oder Freigabe entfernt).

#### `new NoAccessError()`

### `class GoogleDriveProvider`

Speicherschicht Google Drive: eine JSON-Datei pro Liederbuch, Teilen über Drive-Freigaben.

#### `new GoogleDriveProvider({)`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{auth: import('./google-auth.js').GoogleAuth, apiKey?: string, appId?: string,` |  | book?: {shared?: boolean, fileId?: string\|null, readOnly?: boolean}, storage?: Storage, fetch?: typeof fetch}} opts apiKey/appId: nur für die Google-Dateiauswahl (Einladung öffnen); nicht geheim |

#### `get signedIn`

Gibt es ein gültiges Zugangstoken?

#### `signIn(opts)`

Anmelden (kleines Google-Fenster, siehe GoogleAuth.signIn).

#### `signOut()`

Abmelden; die Dateien in Drive bleiben erhalten.

#### `async read(knownVersion)`

Liederbuch aus Drive lesen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[knownVersion]` | `string` | zuletzt gelesene Version – ist sie gleich, wird nichts geladen |

**Rückgabe:** `Promise<null | {unchanged: true} | {data: object, version: string}>`

#### `async write(data, expectedVersion)`

Liederbuch nach Drive schreiben – nur, wenn die Datei noch die erwartete Version hat
(sonst ConflictError: neu lesen und zusammenführen; ein veralteter Stand überschreibt nie
einen neueren). Mit Leserechten: ReadOnlyError.

**Rückgabe:** `Promise<string>` neue Version

#### `async createShared(fileName, data)`

Neue gemeinsame Datei anlegen. @returns {Promise<{id, name}>}

#### `async info()`

Name, eigene Rechte und Besitzer der aktuellen Datei (null, wenn es noch keine gibt).

#### `async role()`

Eigene Rolle für die aktuelle Datei: 'owner' | 'writer' | 'reader' | null (keine Datei).
Google setzt sie beim Schreiben selbst durch; die App richtet danach nur die Anzeige.

#### `async members()`

Wer Zugriff auf das Liederbuch hat.

**Rückgabe:** `Promise<{id: string, emailAddress: string, displayName: string, role: string}[]>`

#### `async invite(email, message, role = 'reader')`

Person per E-Mail einladen; Google verschickt die Einladung (mit message und dem Link zur Datei).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `email` | `string` |  |
| `message` | `string` |  |
| `[role='reader']` | `'reader'\|'writer'` | reader: nur lesen (Abonnent), writer: darf bearbeiten |

#### `async setMemberRole(permissionId, role)`

Rechte einer Person ändern ('reader' oder 'writer').

#### `async removeMember(permissionId)`

Zugriff einer Person entfernen.

#### `async pickShared({ fileId = '' } = {})`

Google-Dateiauswahl für Liederbücher, die mit mir geteilt wurden.
Erst durch die Auswahl darf die App (Berechtigung drive.file) die Datei öffnen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[opts]` | `{fileId?: string}` | fileId: genau diese Datei vorauswählen (aus dem Einladungslink) |

**Rückgabe:** `Promise<{id, name} | null>`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async driveError(res)` – Grund eines Drive-Fehlers (z. B. insufficientFilePermissions) und Meldung.
