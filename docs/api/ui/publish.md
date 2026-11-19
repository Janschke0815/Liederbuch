# `src/ui/publish.js`

[← Übersicht](../README.md)

„Für eine Gruppe veröffentlichen“: Lieder (alle, nach Tag oder aus einer Setliste) als Abo-Datei in den WebDAV-Ordner legen oder herunterladen, und den Einladungslink zum Weitergeben zeigen. Was zuletzt veröffentlicht wurde, merkt sich die App (prefs: aboPublished) – erneut veröffentlichen ersetzt die Datei, der Link bleibt gleich.

**Benutzt:** [`formats/abo.js`](../formats/abo.md), [`formats/song-files.js`](../formats/song-files.md), [`prefs.js`](../prefs.md), [`sync/webdav-client.js`](../sync/webdav-client.md), [`sync/webdav.js`](../sync/webdav.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async selection()` – Lieder und Setlisten, die nach der aktuellen Auswahl mitgehen.
- `async update()`
- `showLink(fileUrl)`
- `async open()`
- `async publish()`
