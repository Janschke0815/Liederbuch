# `src/sync/abo-client.js`

[← Übersicht](../README.md)

Abo-Datei vom Server laden – mit Anmeldung, falls der Ordner geschützt ist, und nur, wenn sie sich seit dem letzten Mal geändert hat (ETag). Kein Bildschirm; die Oberfläche steht in ui/abo.js.

**Benutzt:** [`formats/abo.js`](../formats/abo.md), [`sync/sync-engine.js`](sync-engine.md), [`sync/webdav-client.js`](webdav-client.md)  
**Benutzt von:** [`ui/abo.js`](../ui/abo.md)

## Exportiert

### `class LoginNeeded extends Error`

Fehler: Der Ordner verlangt eine Anmeldung (oder sie stimmt nicht).
