# `src/ui/publish.js`

[← Übersicht](../README.md)

„Für eine Gruppe veröffentlichen“: Lieder (alle, nach Tag oder aus einer Setliste) als Abo-Datei in den Sync-Ordner (WebDAV) legen oder herunterladen, und den Einladungslink zum Weitergeben zeigen. Was zuletzt veröffentlicht wurde, merkt sich die App (prefs: aboPublished) – erneut veröffentlichen ersetzt die Datei, der Link bleibt gleich.

Automatisch veröffentlichen (nur Sync-Ordner): Ändern sich Lieder oder Setlisten, wird kurz danach von selbst neu veröffentlicht – mit derselben Auswahl wie beim letzten Mal.

**Benutzt:** [`books.js`](../books.md), [`formats/abo.js`](../formats/abo.md), [`formats/song-files.js`](../formats/song-files.md), [`prefs.js`](../prefs.md), [`sync/webdav-client.js`](../sync/webdav-client.md), [`sync/webdav.js`](../sync/webdav.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/share-with.js`](share-with.md)

## Exportiert

### `openPublish()`

„Veröffentlichen …“ öffnen (schließt den Cloud-Dialog, aus dem es meist kommt).

### `async republish()`

Mit der gemerkten Auswahl neu veröffentlichen (ohne Dialog). Fehler werden einmal gemeldet,
nicht bei jedem Versuch.

**Rückgabe:** `Promise<boolean>` hat es geklappt?

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async selectionOf(scope, value)` – Lieder und Setlisten einer Auswahl.
- `formScope()` – Auswahl, wie sie gerade im Dialog steht.
- `async putToWebdav(name, text)` – Abo-Datei in den Sync-Ordner (Unterordner „Abo“) schreiben. Liefert die Adresse der Datei.
- `suggestedUrl()` – Adresse aus dem Namen vorschlagen: …/abo/<Name>-<Zufall>.json
- `async update()`
- `showResult(s)`
- `async open()`
- `async publishFromDialog()`
- `scheduleRepublish()` – Nach einer Änderung etwas warten (es wird oft mehrmals hintereinander gespeichert), dann veröffentlichen.
- `setupAuto()` – Beobachten einschalten, wenn für dieses Liederbuch „automatisch“ gewählt ist.
