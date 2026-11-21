# `src/version.js`

[← Übersicht](README.md)

Version der App – bei jeder veröffentlichten Änderung erhöhen (und das Datum anpassen). Wird in den Einstellungen und als Hinweis am App-Namen angezeigt, damit man sieht, welche Fassung gerade läuft (z. B. auf der NAS oder nach einem Update am Handy).

```text
  Hauptversion.Fahrplan-Punkt.Korrektur
```

**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `APP_VERSION`

`= '2.0.1'`

Version der App – bei jeder veröffentlichten Änderung erhöhen (und das Datum anpassen).
Wird in den Einstellungen und als Hinweis am App-Namen angezeigt, damit man sieht, welche
Fassung gerade läuft (z. B. auf der NAS oder nach einem Update am Handy).
Hauptversion.Fahrplan-Punkt.Korrektur

### `APP_DATE`

`= '2026-11-21'`

### `versionLabel(version = APP_VERSION, date = APP_DATE)`

"1.13.0 vom 16.11.2026"
