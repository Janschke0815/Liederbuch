# `src/formats/chordpro-files.js`

[← Übersicht](../README.md)

Liederbuch als reine ChordPro-Dateien (wie beim Programm ChordPro selbst):

```text
  Lieder/<Titel - Interpret>.cho   Liedtext; Einstellungen der App als Direktiven:
                                   {transpose: 2}            (offizielles ChordPro)
                                   {x_accidentals: flat}     (♯/♭-Schreibweise, nur Liederbuch)
                                   {x_notiz: …}              (Notiz, eine Zeile je Direktive)
  Setlisten/<Name>.txt             eine Zeile pro Lied (Dateiname), darunter eingerückt
                                   „Transposition: 2“ und „Notiz: …“
```

Andere Programme ignorieren x_-Direktiven (so sieht es der ChordPro-Standard vor). Reine Funktionen, kein DOM, keine Netzwerkzugriffe.

**Benutzt:** [`formats/file-format.js`](file-format.md), [`formats/song-files.js`](song-files.md)  
**Benutzt von:** [`formats/backup.js`](backup.md), [`sync/webdav.js`](../sync/webdav.md), [`ui/files.js`](../ui/files.md)

## Exportiert

### `SETLIST_DIR`

`= 'Setlisten/'`

### `SETLIST_EXT`

`= '.txt'`

### `songToFile(r)`

Lied (wie in der App) -> Inhalt der .cho-Datei (CR LF).

### `fileToSong(text)`

Inhalt einer .cho-Datei -> Liedtext für die App + Einstellungen.

### `songBody(chordpro)`

Liedtext ohne Titel/Interpret – zum Wiedererkennen einer umbenannten Datei.

### `setlistFileName(name)`

Dateiname einer Setliste.

### `setlistToFile(s, fileOf)`

Setliste -> Inhalt der .txt-Datei (CR LF).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `fileOf` |  | songId -> Dateiname des Liedes (oder null, wenn unbekannt) |

### `fileToSetlist(text, fileName, idOf)`

Inhalt einer .txt-Datei -> {name, items}.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `idOf` |  | Dateiname -> songId |
