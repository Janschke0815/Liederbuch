# `src/sync/webdav.js`

[← Übersicht](../README.md)

Cloud-Anbieter WebDAV (z. B. Nextcloud, ownCloud, QNAP, Synology, eigener Server).

Aufbau auf dem Server – reine ChordPro-Dateien, keine Datenbank-Datei (siehe chordpro-files.js):

```text
  <Ordner>/Lieder/<Titel - Interpret>.cho   ein Lied pro Datei, Transposition/Notiz als Direktiven
  <Ordner>/Setlisten/<Name>.txt            eine Setliste pro Datei
  <Ordner>/Liederbuch.json                 nur ein Hinweis (enthält keine Daten): hält ältere
                                           App-Versionen davon ab, etwas zu überschreiben
```

Ohne Verzeichnisdatei merkt sich jedes Gerät, welche Dateien es beim letzten Abgleich gesehen hat (Dateiname -> Lied, ETag, Prüfsumme, Stand). Daran erkennt es:

```text
  Datei neu          -> neues Lied (oder umbenannt: gleicher Text ohne Titel wie eine fehlende)
  Datei geändert     -> Lied geändert (ETag anders)
  Datei verschwunden -> Lied gelöscht (in den Papierkorb) – es sei denn, es wurde hier inzwischen
                        geändert; dann wird es wieder hochgeladen
```

Alles lässt sich daher auch direkt auf dem Server bearbeiten, anlegen und löschen.

Für die Sync-Engine sieht das aus wie bisher: read() liefert alle Lieder und Setlisten als Datensätze, write() bekommt alle zusammengeführten Datensätze. Geschrieben wird je Datei mit If-Match / If-None-Match; 412 = Konflikt -> die Engine liest neu und führt zusammen.

Ältere Ablageformate (alles in Liederbuch.json bzw. Verzeichnis + Dateien) werden gelesen und beim ersten Schreiben umgestellt.

Die HTTP-Seite (Anmeldung, PROPFIND, PUT, DELETE, Fehlermeldungen) steht in webdav-client.js.

**Benutzt:** [`formats/chordpro-files.js`](../formats/chordpro-files.md), [`formats/file-format.js`](../formats/file-format.md), [`formats/song-files.js`](../formats/song-files.md), [`storage/repository.js`](../storage/repository.md), [`storage/setlists.js`](../storage/setlists.md), [`sync/sync-engine.js`](sync-engine.md), [`sync/webdav-client.js`](webdav-client.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md), [`ui/publish.js`](../ui/publish.md)

## Exportiert

### `WEBDAV_FILE`

`= 'Liederbuch.json'`

### `webdavFileUrl(url)`

Ordner- oder Datei-Adresse -> Adresse der JSON-Datei.

### `webdavUrlProblem(url)`

Ist die Adresse sicher genug für ein Passwort? (https, oder http nur auf diesem Rechner)

### `class WebDavProvider`

Cloud-Anbieter WebDAV: Lieder als .cho-Dateien, Setlisten als .txt (Aufbau siehe Kopf dieser Datei).

#### `new WebDavProvider({)`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{url: string, user?: string, password?: string, fetch?: typeof fetch,` |  | now?: () => string, storage?: Storage}} opts |

#### `get host`

Servername aus der Adresse (für Anzeige und Fehlermeldungen).

#### `prepare(local)`

Die Sync-Engine reicht vor dem Lesen die eigenen Datensätze (zum Wiedererkennen).

#### `async signIn()`

Prüft die Verbindung (Ordner erreichbar, Anmeldung gültig).

#### `signOut()`

Abmelden (Zugangsdaten bleiben gespeichert, bis die Oberfläche sie löscht).

#### `async read(knownVersion)`

Alle Lieder und Setlisten aus den Dateien lesen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[knownVersion]` | `string` | Signatur der letzten Ordnerlisten – gleich = nichts zu tun |

**Rückgabe:** `Promise<null | {unchanged: true} | {data: object, version: string, rewrite: boolean}>` rewrite: Dateien sollten neu geschrieben werden (altes Format)

#### `async write(data)`

Zusammengeführte Lieder und Setlisten als Dateien schreiben (nur Geändertes; umbenennen, löschen).

**Rückgabe:** `Promise<string>` neue Signatur der Ordnerlisten
