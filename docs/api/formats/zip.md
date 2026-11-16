# `src/formats/zip.js`

[← Übersicht](../README.md)

Kleines ZIP-Modul ohne fremde Bibliothek.

```text
  createZip: Dateien unkomprimiert („stored“) einpacken – Textdateien sind klein, und so öffnet
             jedes Programm (Windows-Explorer, macOS, Handy) die Datei.
  readZip:   liest „stored“ und „deflate“ (so packen Windows, macOS und die meisten Programme),
             entpackt mit DecompressionStream des Browsers.
```

Dateinamen in UTF-8 (Kennzeichen gesetzt, damit Umlaute überall stimmen).

**Benutzt von:** [`ui/files.js`](../ui/files.md)

## Exportiert

### `crc32(bytes)`

CRC-32-Prüfsumme (wie sie ZIP-Dateien verlangen).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `bytes` | `Uint8Array` |  |

**Rückgabe:** `number`

### `createZip(files, now = new Date()`

ZIP-Datei erzeugen (Einträge unkomprimiert, Namen in UTF-8).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `files` | `{name: string, data: string\|Uint8Array, date?: Date}[]` | Pfade mit „/“ |

**Rückgabe:** `Uint8Array`

### `isZip(bytes)`

Beginnt die Datei wie ein ZIP?

### `async readZip(bytes)`

ZIP-Datei lesen – unkomprimierte und mit „deflate“ gepackte Einträge (wie von Windows/macOS erzeugt).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `bytes` | `Uint8Array` |  |

**Rückgabe:** `Promise<{name: string, data: Uint8Array}[]>` nur Dateien, keine Ordner

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `dosTime(d)` – Zeit im DOS-Format (lokale Zeit, 2-Sekunden-Schritte).
- `decodeName(bytes, utf8)`
- `async inflate(bytes)`
