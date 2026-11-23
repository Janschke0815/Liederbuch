// Version der App – bei jeder veröffentlichten Änderung erhöhen (und das Datum anpassen).
// Wird in den Einstellungen und als Hinweis am App-Namen angezeigt, damit man sieht, welche
// Fassung gerade läuft (z. B. auf der NAS oder nach einem Update am Handy).
//   Hauptversion.Fahrplan-Punkt.Korrektur
export const APP_VERSION = '2.2.10';
export const APP_DATE = '2026-11-23';

/** "1.13.0 vom 16.11.2026" */
export function versionLabel(version = APP_VERSION, date = APP_DATE) {
  const [y, m, d] = String(date).split('-');
  return y && m && d ? `${version} vom ${d}.${m}.${y}` : version;
}
