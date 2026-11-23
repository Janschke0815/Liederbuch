# `src/render/song-view.js`

[← Übersicht](../README.md)

Song-Modell -> DOM. Wird für Vorschau und später für den Druck verwendet.

Akkorde stehen über der richtigen Silbe, ohne Monospace: jedes Akkord-Segment ist ein inline-block aus Akkord (oben) und dem ersten Wort darunter. Der restliche Text des Segments läuft als normaler Text weiter, damit lange Zeilen umbrechen können.

**Benutzt:** [`core/chords.js`](../core/chords.md), [`core/harp.js`](../core/harp.md), [`core/repeat.js`](../core/repeat.md), [`render/chord-diagram.js`](chord-diagram.md)  
**Benutzt von:** [`play-mode.js`](../play-mode.md), [`print/songbook.js`](../print/songbook.md), [`settings-ui.js`](../settings-ui.md), [`ui/capo-help.js`](../ui/capo-help.md), [`ui/chord-tap.js`](../ui/chord-tap.md), [`ui/list.js`](../ui/list.md), [`ui/paste.js`](../ui/paste.md), [`ui/song.js`](../ui/song.md)

## Exportiert

### `usedChords(song)`

Alle Akkordnamen des Liedes in Reihenfolge des ersten Auftretens (ohne Anmerkungen).

### `songKey(song, opts = {})`

Klingende Tonart nach Transposition: {key:} oder ersatzweise der erste Akkord.

**Rückgabe:** `{key: string, guessed: boolean} | null`

### `chordNamer(song, opts = {})`

Wie ein Akkord angezeigt wird (transponiert, ♯/♭) – genau wie in renderSong.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |
| `[opts]` | `{transpose?: number, accidentals?: string}` |  |

**Rückgabe:** `(chord: string) => string`

### `chordWriter(song, opts = {})`

Umkehrung zu chordNamer: ein angezeigter (transponierter) Akkord so, wie er in den Text gehört –
zurücktransponiert, in der Schreibweise der Originaltonart.

**Rückgabe:** `(chord: string) => string`

### `renderSong(song, opts = {})`

Ein Lied als HTML darstellen (Vorschau, Spielmodus, Druck).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |
| `[opts]` | `{transpose?: number, accidentals?: 'auto'\|'sharp'\|'flat'}` |  |

**Rückgabe:** `HTMLElement`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `el(tag, className, text)`
- `transposeKey(key, steps, useFlats)`
- `splitFirstWord(text)` – Teilt "darling, Clementine" in ["darling, ", "Clementine"] – erstes Wort inkl. Leerzeichen.
- `takeLineRepeat(line)` – Wiederholungsangabe am Zeilenende abtrennen.
- `makeRepeatScope(node, kind, times)` – Wiederholungsklammer: umschließt genau das, was wiederholt wird (Zeile, Zeilengruppe
- `renderLyricsLine(original, chordName)`
- `chordSpan(s, chordName)` – Akkord, Anmerkung oder Mundharmonika-Tab über dem Text.
- `renderLyricsLineBody(line, chordName)`
- `renderLine(line, chordName)`
- `renderBlock(block, chordName)`
- `firstChord(song)`
