# `src/sync-ui.js`

[← Übersicht](README.md)

Cloud-Knopf, Liederbuch-Auswahl und Dialog (verbinden, gemeinsame Liederbücher, Mitglieder).

Google Drive: Anmeldung mit google-auth.js (Fenster, auf iPhone/iPad per Weiterleitung), Speichern mit google-drive.js. Einladung per E-Mail mit Link <App>#drive=<Datei-ID>: Wer ihn öffnet, meldet sich an, bestätigt die Datei in der Google-Dateiauswahl und hat das Liederbuch – mit Leserechten nur zum Lesen (Google verweigert dann das Schreiben, die App sperrt das Bearbeiten).

Mehrere Liederbücher (ab 2.2): Jedes hat seinen eigenen Speicherort und sein eigenes Konto. Alle Einstellungen und Anmeldungen des geöffneten Buchs liegen unter bookKey(book, …); abgeglichen wird nur das geöffnete Liederbuch.

**Benutzt:** [`books.js`](books.md), [`context-menu.js`](context-menu.md), [`prefs.js`](prefs.md), [`storage/repository.js`](storage/repository.md), [`storage/stores.js`](storage/stores.md), [`sync/book-name.js`](sync/book-name.md), [`sync/config.js`](sync/config.md), [`sync/dropbox.js`](sync/dropbox.md), [`sync/google-auth.js`](sync/google-auth.md), [`sync/google-drive.js`](sync/google-drive.md), [`sync/sync-engine.js`](sync/sync-engine.md), [`sync/webdav.js`](sync/webdav.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupSync({ repo, extra = [], book, beforeSync, beforeConnect, beforeSwitch, toast, leaveAbo, refreshAbo })`

Cloud-Dialog und Abgleich einrichten (Google Drive, Dropbox oder WebDAV, gemeinsame Liederbücher).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{repo, book, beforeSync: () => Promise<void>, beforeConnect?: () => Promise<void>,` |  | beforeSwitch: () => Promise<void>, toast: Function, leaveAbo?: (entry: object) => boolean, refreshAbo?: (o: {quiet: boolean}) => Promise<void>}} opts leaveAbo/refreshAbo: Abo beenden bzw. aktualisieren (aus ui/abo.js) |
