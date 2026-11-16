# `src/formats/song-files.js`

[← Übersicht](../README.md)

Hilfen für „eine Datei pro Lied“ auf einem WebDAV-Server: Dateinamen aus Titel und Interpret, Prüfsummen zum Erkennen von Änderungen, Ordnerliste (PROPFIND) lesen. Reine Funktionen.

**Benutzt:** [`core/text.js`](../core/text.md)  
**Benutzt von:** [`formats/backup.js`](backup.md), [`formats/chordpro-files.js`](chordpro-files.md), [`sync/webdav-client.js`](../sync/webdav-client.md), [`sync/webdav.js`](../sync/webdav.md)

## Exportiert

### `SONG_DIR`

`= 'Lieder/'`

### `SONG_EXT`

`= '.cho'`

### `SONG_FILE`

`= /\.(cho\|chordpro\|chopro\|crd\|pro)$/i`

Dateien, die beim Abgleich als Lied gelten (auch von Hand auf den Server gelegte).

### `cleanFileName(name)`

Dateiname ohne Endung, sicher für Windows, Mac und Linux.

### `songBaseName(chordpro)`

"Titel - Interpret" aus dem Liedtext.

### `nameFits(name, base)`

Passt ein vorhandener Dateiname noch zum Titel? ("Titel.cho" oder "Titel (2).cho")

### `uniqueName(base, taken)`

Freier Name: "Titel.cho", sonst "Titel (2).cho" … (taken: Kleinbuchstaben-Namen).

### `async hashText(text)`

Kurze Prüfsumme eines Liedtexts (Zeilenenden egal).

### `idForFile(name, prefix = 'datei-')`

Eindeutige, auf allen Geräten gleiche ID für eine Datei, die dieses Gerät noch nicht kennt.

### `withTitle(text, fileName)`

Dateiname als Titel, wenn eine Datei kein {title:} enthält.

### `parsePropfind(xml, folderUrl)`

Antwort auf PROPFIND (Depth: 1) -> Map Dateiname -> {etag, modified (ms)}.
Nur Dateien direkt im Ordner, keine Unterordner.

### `listingSignature(listing)`

Fingerabdruck einer Ordnerliste (null = Liste nicht verfügbar).

### `PROPFIND_BODY`

### `normalizeText`

Weitergereicht (für bestehende Aufrufer).
