# `src/core/chordpro.js`

[← Übersicht](../README.md)

ChordPro-Parser: Text -> Song-Modell. Reine Funktionen, kein DOM.

Song-Modell:

```text
{
  meta: { title, subtitle[], artist[], composer[], album, year, key, capo, tempo, time, ... },
  blocks: [ { kind: null|'verse'|'chorus'|'bridge'|'tab'|'grid'|'part'|<eigener>, label, lines: [Line] } ]
}
```

Line:

```text
  { type: 'lyrics', segments: [{ chord, annotation, harp?, text }], chordsOnly, harpOnly? }
    harp: Mundharmonika-Tab wie [-4] statt Akkord (siehe harp.js)
  { type: 'comment', text, style: 'normal'|'italic'|'box' }
  { type: 'tab', text }            – Zeile in Tab/Grid-Block, unverändert
  { type: 'chorus-ref', label }    – {chorus} = Refrain wiederholen
  { type: 'repeat-start', label } | { type: 'repeat-end' }  – {start_of_repeat: 2×} … {end_of_repeat}
  { type: 'empty' } | { type: 'new-page' } | { type: 'column-break' }
```

**Benutzt:** [`core/harp.js`](harp.md)  
**Benutzt von:** [`formats/export-text.js`](../formats/export-text.md), [`formats/paste-import.js`](../formats/paste-import.md), [`live-ui.js`](../live-ui.md), [`play-mode.js`](../play-mode.md), [`print/songbook.js`](../print/songbook.md), [`settings-ui.js`](../settings-ui.md), [`storage/repository.js`](../storage/repository.md), [`ui/capo-help.js`](../ui/capo-help.md), [`ui/list.js`](../ui/list.md), [`ui/paste.js`](../ui/paste.md), [`ui/song.js`](../ui/song.md)

## Exportiert

### `parseLyricsLine(line)`

Eine Textzeile mit [Akkorden] in Segmente zerlegen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `line` | `string` |  |

**Rückgabe:** `{type: 'lyrics', segments: {chord: string|null, annotation: string|null, harp?: string, text: string}[], chordsOnly: boolean}`

### `parseChordPro(src)`

ChordPro-Text in das Song-Modell übersetzen (Aufbau siehe Kopf dieser Datei).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `src` | `string` | der Liedtext |

**Rückgabe:** `{meta: object, blocks: {kind: string|null, label: string, lines: object[]}[]}`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `parseDirective(line)`
- `envKind(name)`
