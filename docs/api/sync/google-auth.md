# `src/sync/google-auth.js`

[← Übersicht](../README.md)

Anmeldung bei Google (OAuth 2) – ganz im Browser, ohne eigenen Server.

Die App bekommt ein Zugangstoken für Google Drive (Berechtigung "drive.file": nur Dateien, die die App selbst angelegt hat oder die man ihr in der Google-Dateiauswahl gibt). Das Token gilt etwa eine Stunde und liegt nur auf diesem Gerät. Ein Langzeit-Token (Refresh-Token) gibt Google reinen Browser-Apps nicht – dafür bräuchte es einen Server mit Client-Secret. Ist das Token abgelaufen, genügt ein Tippen auf „Anmelden“: Wer schon zugestimmt hat, wird nicht noch einmal gefragt.

Zwei Wege:

```text
  signIn()               kleines Google-Fenster (Google Identity Services), Normalfall
  loginUrl()/finishLogin() Weiterleitung zu Google und zurück (#access_token=… in der Adresse) –
                         für die installierte App auf iPhone/iPad, wo Fenster nicht zuverlässig gehen
```

Kein Bildschirm, keine Drive-Zugriffe; die Speicherschicht (google-drive.js) holt sich hier nur das Token.

**Benutzt:** [`sync/sync-engine.js`](sync-engine.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md), [`sync/google-drive.js`](google-drive.md)

## Exportiert

### `DRIVE_SCOPE`

`= 'https:`

www.googleapis.com/auth/drive.file';

### `loadScript(src)`

Skript von Google einmal laden (Anmeldung, Dateiauswahl).

### `googleRedirectUri(loc = location)`

Rücksprung-Adresse nach der Anmeldung: diese Seite ohne Abfrage und Anker (bei Google eintragen).

### `prefersRedirect(nav = globalThis.navigator)`

Weiterleitung statt Fenster? Ja in der installierten App auf iPhone/iPad.

### `authMessage(code, description = '')`

Verständliche Meldung zu einem Fehlercode von Google.

### `class GoogleAuth`

Anmeldung bei Google: Zugangstoken holen, merken, erneuern, widerrufen.

#### `new GoogleAuth({)`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{clientId: string, storage?: Storage, session?: Storage, fetch?: typeof fetch,` |  | gis?: () => Promise<object>, redirectUri?: string}} opts gis: liefert das google-Objekt der Google Identity Services (für Tests austauschbar) |

#### `token()`

Gespeichertes Zugangstoken, solange es noch mindestens eine Minute gilt, sonst null.

#### `get signedIn`

Gibt es ein gültiges Zugangstoken?

#### `get known`

War dieses Gerät schon einmal angemeldet (dann fragt Google meist nicht erneut)?

#### `expire()`

Token ist abgelaufen oder widerrufen (Google antwortet 401): vergessen, neu anmelden.

#### `async signIn({ silent = false } = {})`

Anmelden mit kleinem Google-Fenster. Muss direkt aus einem Klick heraus aufgerufen werden.
silent: ohne Rückfrage, wenn schon einmal zugestimmt (das Fenster schließt sich gleich wieder).

#### `loginUrl({ silent = false, extra = {} } = {})`

Anmelden per Weiterleitung: Adresse der Google-Anmeldeseite. Die Seite kommt mit
#access_token=… zurück (siehe finishLogin).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[opts]` | `{silent?: boolean, extra?: object}` | extra wird bis zur Rückkehr aufbewahrt |

#### `finishLogin(hash)`

Rückkehr von Google auswerten (Anker der Adresse: #access_token=…&state=… oder #error=…).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `hash` | `string` | location.hash |

**Rückgabe:** `null | object` null, wenn der Anker keine Rückkehr von unserer Anmeldung ist; sonst die bei loginUrl() aufbewahrten Angaben (mit silent). Wirft AuthError bei Fehlern; err.retry = true heißt: still ging es nicht, mit Rückfrage noch einmal versuchen.

#### `signOut()`

Abmelden: Zugang bei Google widerrufen und das Token vergessen.
