// Google-Zugangsdaten für Google Drive (Einrichtung: docs/google-einrichtung.md).
// Hier eingetragen gelten sie für alle Geräte und alle Mitglieder – niemand muss etwas eintragen,
// nur „Mit Google anmelden“. Keiner dieser Werte ist geheim (stehen bei jeder Web-App im Code);
// ein Client-Secret wird nicht gebraucht und gehört nicht hierher. Leer: im Cloud-Dialog unter
// „Google-Einrichtung“ pro Gerät eintragbar.
export const GOOGLE_CLIENT_ID = ''; // OAuth-Client-ID (Webanwendung)
export const GOOGLE_API_KEY = ''; // API-Schlüssel, nur für die Dateiauswahl (Einladung öffnen)
export const GOOGLE_APP_ID = ''; // Projektnummer des Google-Cloud-Projekts

// Dropbox (siehe README, „Dropbox einrichten“): App-Schlüssel einer Dropbox-App mit Zugriff „App folder“.
// Ebenfalls nicht geheim; alternativ im Cloud-Dialog unter „Dropbox-Einrichtung“ pro Gerät eintragen.
export const DROPBOX_APP_KEY = '';
