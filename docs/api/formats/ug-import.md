# `src/formats/ug-import.js`

[← Übersicht](../README.md)

Import: "Akkorde über dem Text" (z. B. Ultimate Guitar) -> ChordPro-Text. Reine Funktionen, kein DOM.

**Benutzt:** [`core/chords.js`](../core/chords.md), [`core/harp.js`](../core/harp.md), [`core/repeat.js`](../core/repeat.md), [`formats/harp-import.js`](harp-import.md)  
**Benutzt von:** [`formats/file-import.js`](file-import.md), [`formats/paste-import.js`](paste-import.md)

## Exportiert

### `isChordLine(line)`

Akkordzeile – oder eine Zeile Mundharmonika-Töne ("4 -4 5 -5"), die genauso über dem Text steht.

### `isTabLine(line)`

Ist die Zeile ein Gitarren-Tab (e|---0---3---| …)? Mundharmonika-Zeilen zählen nicht.

### `sectionLabel(line)`

Abschnittsname aus einer Zeile wie „[Chorus]“ oder „Strophe 2:“, sonst null.

### `isInstrumentalLabel(label)`

Abschnitt ohne Gesang (Intro, Solo …)? Er endet an der nächsten Leerzeile, wenn danach Liedtext kommt.

### `sectionKind(label)`

Art eines Abschnitts aus seinem Namen: 'verse' | 'chorus' | 'bridge' | 'part'.

### `snapToWords(inline, lyrics)`

Töne und Akkorde, die knapp neben einem Wortanfang stehen, auf den Wortanfang rücken
(Akkorde und Harp-Töne getrennt betrachtet):
  - mitten im Wort, und davor im selben Wort noch keiner -> an den Wortanfang („I[4]'ve“ -> „[4]I've“)
  - auf einem Leerzeichen -> an den Anfang des nächsten Wortes
Weitere Töne im selben Wort bleiben, wo sie sind – das sind Silben („[-6]mi[-6]ner“).
Ein Bindestrich trennt Silben wie ein Leerzeichen („Gas-o-line“ -> drei Silben).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `inline` | `{col: number, harp?: boolean}[]` | Tokens mit Spalte im Liedtext (wird geändert) |
| `lyrics` | `string` |  |

### `mergeChordLine(chordLine, lyricLine, harpLine = null)`

Akkordzeile + Textzeile -> eine ChordPro-Zeile. Optional zusätzlich eine Zeile
Mundharmonika-Töne (Akkorde und Tabs untereinander über dem Text); an derselben Stelle
steht der Akkord vor dem Ton: [C][4]Text.

### `chordOnlyLine(chordLine)`

Reine Akkordzeile -> ChordPro, Füllzeichen (|, x2) bleiben als Text.

### `splitInlineSectionLabels(lines)`

Zerlegt "Verse 1 - Text" in eine eigene Abschnittszeile und den Inhalt. Der Inhalt
behält seine Spalte (der Name wird durch Leerzeichen ersetzt), damit eine Akkordzeile
darüber weiterhin passt; diese Akkordzeile wandert hinter die Abschnittsmarke.

### `ugToChordPro(input, meta = {})`

Wandelt "Akkorde über Text" in ChordPro um.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `input` | `string` |  |
| `[meta]` | `{title?: string, artist?: string, key?: string, capo?: string\|number}` |  |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `expandTabs(line, width = 4)`
- `tokenize(line)` – Zerlegt eine Zeile in Tokens mit Spaltenposition. Taktstriche sind eigene Tokens.
- `stripParens(t)`
- `tokenIsChord(t)`
- `metaLine(line)`
- `escapeLyrics(text)` – Eckige Klammern im Liedtext würden als Akkorde gelesen -> runde Klammern.
- `chordMarker(text)`
- `paragraphHasLyrics(lines, i)` – Enthält der Absatz ab Zeile i (bis zur nächsten Leerzeile) eine Zeile Liedtext?
