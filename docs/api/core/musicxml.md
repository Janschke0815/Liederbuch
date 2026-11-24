# `src/core/musicxml.js`

[← Übersicht](../README.md)

MusicXML → ABC: Noten aus MuseScore, Sibelius, Finale, Notenscan-Apps oder Downloads (musescore.com, IMSLP …) als Notenabschnitt ins Lied holen. Gedacht für Liederbuch-Melodien: eine Stimme (die erste Stimme der gewählten Spur), Akkordsymbole, Liedtext der ersten Strophe, Wiederholungen und Klammern. Mehrstimmiges (weitere Stimmen, Akkorde aus Noten) fällt weg – es bleibt die Melodie. Komprimiertes MusicXML (.mxl) ist eine ZIP-Datei: readMxl packt es im Browser aus.

**Benutzt von:** [`core/abc-import.js`](abc-import.md), [`ui/notes-import.js`](../ui/notes-import.md)

## Exportiert

### `keyFromFifths(fifths, mode = 'major')`

Tonart aus den Vorzeichen (fifths: -7…7) und dem Tongeschlecht als ABC-Tonart („G“, „Em“, „Bb“).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `fifths` | `number` |  |
| `[mode]` | `string` | 'minor' für Moll |

**Rückgabe:** `string`

### `musicXmlToAbc(xml, { part } = {})`

MusicXML-Text (score-partwise) in ABC umwandeln – eine Melodiestimme mit Akkorden und Liedtext.
@throws {Error} wenn es kein lesbares MusicXML ist

| Parameter | Typ | Bedeutung |
|---|---|---|
| `xml` | `string` |  |
| `[opts]` | `{part?: number}` | part: Nummer der Spur (sonst automatisch: die mit Liedtext) |

**Rückgabe:**  {{abc: string, title: string, composer: string, key: string, time: string, tempo: number|null, parts: string[], part: number, measures: number}} abc: Kopf (M:, L:, Q:, K:) und Notenzeilen mit w:-Zeilen; key/time: für die Liedinfo

### `async readMxl(buffer)`

Komprimiertes MusicXML (.mxl, eine ZIP-Datei) auspacken: liefert den Text der Partitur.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `buffer` | `ArrayBuffer` |  |

**Rückgabe:** `Promise<string>`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `signature(fifths)` – Vorzeichen je Stammton bei fifths Kreuzen/Bes: { F: 1, C: 1 }
- `frac(n, d)` – Bruch kürzen
- `lengthCode(n, d)` – ABC-Längenangabe relativ zu L:1/8 für eine Dauer in Ganzen (z. B. 1/4 → „2“).
- `harmonyName(h)` – Akkordsymbol aus <harmony> („F#m7/C#“) oder ''
- `pitchCode(step, octave)` – Ton als ABC (ohne Vorzeichen): Oktave 4 = C…B, 5 = c…b, darüber ', darunter ,
- `partsOf(doc)` – Welche Spur (part) die Melodie trägt: die erste mit Liedtext, sonst die erste mit Noten.
- `hasPrintBreaks(partEl)`
- `zipEntries(buffer)` – Inhaltsverzeichnis einer ZIP-Datei (zentrales Verzeichnis am Ende).
- `async unzipEntry(buffer, { method, size, offset })` – Eine Datei aus der ZIP-Datei auspacken (gespeichert oder „deflate“).
