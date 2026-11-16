# `src/formats/file-format.js`

[← Übersicht](../README.md)

Dateien, die Menschen zu sehen bekommen (NAS, Drive, Sicherung, geteilte Lieder), so schreiben, dass sie auch in Windows-Programmen wie dem Editor sauber aussehen: eingerückt und mit Windows-Zeilenumbrüchen (CR LF). Lesen geht weiterhin mit beiden Zeilenenden.

**Benutzt von:** [`formats/backup.js`](backup.md), [`formats/chordpro-files.js`](chordpro-files.md), [`sync/google-drive.js`](../sync/google-drive.md), [`sync/webdav.js`](../sync/webdav.md), [`ui/share.js`](../ui/share.md)

## Exportiert

### `CRLF`

`= '\r\n'`

### `toWindowsText(text)`

Text mit Windows-Zeilenumbrüchen (vorhandene \r\n bleiben, einzelne \n und \r werden zu \r\n).

### `toFileJson(data)`

JSON für Dateien: zwei Leerzeichen eingerückt, CR LF, Zeilenumbruch am Ende.
Zeilenumbrüche *in* Texten (z. B. im Liedtext) stehen in JSON als \n-Zeichenfolge und bleiben
davon unberührt – nur die Zeilen der Datei selbst bekommen CR LF.
