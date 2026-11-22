# `src/ui/files.js`

[← Übersicht](../README.md)

Dateien öffnen (Sicherung als ZIP oder JSON, ChordPro- und Textdateien) und Sichern als ZIP. Dateien kommen aus dem Dateidialog, per Ziehen & Ablegen oder per „Öffnen mit Liederbuch“.

**Benutzt:** [`books.js`](../books.md), [`formats/backup.js`](../formats/backup.md), [`formats/chordpro-files.js`](../formats/chordpro-files.md), [`formats/file-import.js`](../formats/file-import.md), [`formats/zip.js`](../formats/zip.md), [`storage/repository.js`](../storage/repository.md), [`storage/setlists.js`](../storage/setlists.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/song.js`](song.md)  
**Benutzt von:** [`app.js`](../app.md)

## Exportiert

### `async importFiles(files)`

Importiert Dateien (Sicherung, ZIP, ChordPro, Text).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async importBackup(name, data)` – Sicherung (JSON) übernehmen: Lieder, Papierkorb, Setlisten.
- `async bookData()` – Aktueller Stand des Liederbuchs wie in der Sicherung (Lieder + Setlisten).
- `async importZip(name, entries)` – ZIP öffnen: erst die JSON-Sicherung (falls vorhanden), dann die .cho-/.txt-Dateien abgleichen –
- `showImportReport(summary, report)` – Nach dem Öffnen einer ZIP: was aus den Dateien übernommen wurde.
