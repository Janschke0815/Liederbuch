# `src/sync/config.js`

[← Übersicht](../README.md)

Google-Zugangsdaten für den Drive-Sync (siehe README, Abschnitt "Cloud-Sync einrichten"). Hier eingetragen gelten sie für alle Geräte und alle Mitglieder; alternativ im Cloud-Dialog unter "Einrichtung" pro Gerät eintragen. Keiner dieser Werte ist geheim.

**Benutzt von:** [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `GOOGLE_CLIENT_ID`

`= ''`

Google-Zugangsdaten für den Drive-Sync (siehe README, Abschnitt "Cloud-Sync einrichten").
Hier eingetragen gelten sie für alle Geräte und alle Mitglieder; alternativ im Cloud-Dialog
unter "Einrichtung" pro Gerät eintragen. Keiner dieser Werte ist geheim.

### `GOOGLE_API_KEY`

`= ''`

API-Schlüssel, nur für die Dateiauswahl (Einladung öffnen)

### `GOOGLE_APP_ID`

`= ''`

Projektnummer des Google-Cloud-Projekts

### `DROPBOX_APP_KEY`

`= ''`

Dropbox (siehe README, „Dropbox einrichten“): App-Schlüssel einer Dropbox-App mit Zugriff „App folder“.
Ebenfalls nicht geheim; alternativ im Cloud-Dialog unter „Dropbox-Einrichtung“ pro Gerät eintragen.
