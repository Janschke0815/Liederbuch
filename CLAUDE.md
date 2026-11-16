# Hinweise für die Arbeit an diesem Projekt

Liederbuch: Gitarren-Liederbuch als PWA, reines JavaScript (ES-Module) ohne Build-Schritt.
Aufbau und Bedienung: siehe README.md („Aufbau“, „Fahrplan“).

## Bei jeder neuen Version

1. `src/version.js`: `APP_VERSION` erhöhen (Hauptversion.Fahrplan-Punkt.Korrektur) und `APP_DATE` setzen.
2. **`CHANGELOG.md`: neuen Abschnitt oben einfügen** – `## <Version> – <TT.MM.JJJJ> · <kurzer Titel>`,
   darunter Stichpunkte, was sich für Nutzer geändert hat (kurz erklärt, auf Deutsch).
   Ein Test (`tests/version.test.js`) schlägt fehl, wenn die aktuelle Version im Changelog fehlt.
3. Bei neuen Fahrplan-Punkten den „Fahrplan“ im README ergänzen.
4. Tests unter `tests/index.html` müssen alle bestehen.
5. API-Dokumentation neu erzeugen: `python tools/make-docs.py` (meldet auch fehlende Kommentare).
6. Commit-Nachricht auf Deutsch mit Version in Klammern, z. B. „… (1.24.0)“.

## Sonst

- Der Ordner `privat/` wird nie committet oder gepusht.
- Gepusht wird erst nach Freigabe.
- Neue gespeicherte Werte gehören in `src/prefs.js`, neue Tastenkürzel in `src/ui/shortcuts.js`.
- Jede exportierte Funktion, Klasse und öffentliche Methode bekommt einen JSDoc-Kommentar (siehe docs/architektur.md).
- CSS-Umbauten mit `tools/css-snapshot.js` vorher/nachher vergleichen.
