# `src/sync-ui.js`

[← Übersicht](README.md)

Cloud-Knopf, Liederbuch-Auswahl und Dialog (verbinden, gemeinsame Liederbücher, Mitglieder).

**Benutzt:** [`books.js`](books.md), [`prefs.js`](prefs.md), [`storage/repository.js`](storage/repository.md), [`sync/config.js`](sync/config.md), [`sync/google-drive.js`](sync/google-drive.md), [`sync/sync-engine.js`](sync/sync-engine.md), [`sync/webdav.js`](sync/webdav.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupSync({ repo, extra = [], book, beforeSync, beforeConnect, beforeSwitch, toast, leaveAbo, refreshAbo })`

Cloud-Dialog und Abgleich einrichten (Google Drive oder WebDAV, gemeinsame Liederbücher).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{repo, book, beforeSync: () => Promise<void>, beforeConnect?: () => Promise<void>,` |  | beforeSwitch: () => Promise<void>, toast: Function, leaveAbo?: (entry: object) => boolean, refreshAbo?: (o: {quiet: boolean}) => Promise<void>}} opts leaveAbo/refreshAbo: Abo beenden bzw. aktualisieren (aus ui/abo.js) |
