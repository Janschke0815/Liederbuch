# Hinweise für die Arbeit an diesem Projekt

Liederbuch: Gitarren-Liederbuch als PWA, reines JavaScript (ES-Module), Vite als Dev-Server und Build
(`npm run dev`, `npm run build` → `dist/`). Statische Dateien (Icons, Manifest, Service Worker) liegen in `public/`.
Aufbau und Bedienung: siehe README.md („Aufbau“, „Fahrplan“).

## Bei jeder neuen Version

1. `src/version.js`: `APP_VERSION` erhöhen (Hauptversion.Fahrplan-Punkt.Korrektur; ab 2.0 zählt der Fahrplan-Punkt ab Punkt 21 neu: Punkt 22 = 2.1) und `APP_DATE` setzen.
2. **`CHANGELOG.md`: neuen Abschnitt oben einfügen** – `## <Version> – <TT.MM.JJJJ> · <kurzer Titel>`,
   darunter Stichpunkte, was sich für Nutzer geändert hat (kurz erklärt, auf Deutsch).
   Ein Test (`tests/version.test.js`) schlägt fehl, wenn die aktuelle Version im Changelog fehlt.
3. Bei neuen Fahrplan-Punkten den „Fahrplan“ im README ergänzen.
4. `npm test` muss bestehen (alle Tests aus `tests/index.html` plus Kopfleiste auf Handy-Breite, kopflos in
   Chrome/Edge), `npm run build` muss durchlaufen. Die GitHub Action prüft beides vor jedem Release.
5. API-Dokumentation neu erzeugen: `python tools/make-docs.py` (meldet auch fehlende Kommentare).
6. Commit-Nachricht auf Deutsch mit Version in Klammern, z. B. „… (1.24.0)“.

## Sonst

- Der Ordner `privat/` wird nie committet oder gepusht.
- Gepusht wird erst nach Freigabe.
- Neue gespeicherte Werte gehören in `src/prefs.js`, neue Tastenkürzel in `src/ui/shortcuts.js`.
- Jede exportierte Funktion, Klasse und öffentliche Methode bekommt einen JSDoc-Kommentar (siehe docs/architektur.md).
- CSS-Umbauten mit `tools/css-snapshot.js` vorher/nachher vergleichen (vor jeder Aufnahme neu laden, gleiche Fenstergröße).
- Dateien mit LF-Zeilenenden schreiben (`.gitattributes`, `.editorconfig`).
- Arbeiten mehrere Sitzungen gleichzeitig am Projekt, bekommt jede einen eigenen Git-Worktree bzw. Zweig –
  nie zwei Sitzungen im selben Arbeitsordner auf `main` (sonst überschreiben sich Commits gegenseitig).
- Kleine Änderungen lokal sammeln; gepusht wird gebündelt, wenn der Nutzer es sagt.
