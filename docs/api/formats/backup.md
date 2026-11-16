# `src/formats/backup.js`

[← Übersicht](../README.md)

Sicherung als ZIP: lesbare ChordPro-Dateien (wie auf dem WebDAV-Server) + vollständige JSON.

```text
  Liederbuch-2026-11-16.zip
    Lieder/<Titel - Interpret>.cho       Liedtext, Transposition/Notiz als Direktiven
    Setlisten/<Name>.txt                 eine Zeile pro Lied (Dateiname)
    liederbuch-sicherung.json            alles inkl. Papierkorb und Zeitstempel
    LIESMICH.txt
```

Beim Öffnen:

```text
  1. Ist die JSON da, wird sie übernommen (Lieder, Setlisten, Papierkorb, Zeitstempel).
  2. Dann werden die .cho- und .txt-Dateien abgeglichen – mit der JSON bzw., wenn keine da ist,
     mit dem aktuellen Liederbuch: Eine Datei, die anders aussieht, als die App sie schreiben
     würde, wurde von Hand geändert und gewinnt; unbekannte Dateien werden neue Lieder bzw.
     Setlisten. Fehlende Dateien löschen nichts.
```

**Benutzt:** [`formats/chordpro-files.js`](chordpro-files.md), [`formats/file-format.js`](file-format.md), [`formats/song-files.js`](song-files.md)  
**Benutzt von:** [`ui/files.js`](../ui/files.md)

## Exportiert

### `BACKUP_JSON`

`= 'liederbuch-sicherung.json'`

### `planBackup(data)`

Wie die App die Lieder und Setlisten als Dateien benennt und schreibt.
Dieselbe Rechnung beim Sichern und beim Abgleich – so erkennt man von Hand Geändertes.

### `backupFiles(data)`

Dateien der Sicherung.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `data` |  | exportData() der Lieder, ergänzt um setlists |

**Rückgabe:** `{name: string, data: string}[]`

### `backupJson(entries)`

Die vollständige Sicherung aus der ZIP (oder null, wenn keine darin ist).

### `applyZipEdits(entries, base, now, current = null)`

Die .cho- und .txt-Dateien einer ZIP mit einem Stand abgleichen: von Hand geänderte Dateien gewinnen, unbekannte werden neu angelegt.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `entries` | `{name: string, data: Uint8Array}[]` | Inhalt der ZIP |
| `base` | `object` | Vergleichsstand: die JSON der Sicherung oder das aktuelle Liederbuch ({songs, setlists}) |
| `now` | `string` | Zeitpunkt für geänderte/neue Einträge (gewinnt damit beim Zusammenführen) |
| `[current]` | `object` | aktuelles Liederbuch – was dort schon so steht, gilt nicht als Änderung |

**Rückgabe:** `{songs: object[], setlists: object[], edited: number, added: number, setlistsChanged: number}` nur die geänderten bzw. neuen Datensätze
