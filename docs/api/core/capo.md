# `src/core/capo.js`

[← Übersicht](../README.md)

Capo-Hilfe: In welchem Bund liegt das Lied mit möglichst einfachen Griffen?

**Benutzt:** [`core/chord-shapes.js`](chord-shapes.md), [`core/chords.js`](chords.md)  
**Benutzt von:** [`ui/capo-help.js`](../ui/capo-help.md)

## Exportiert

### `capoOptions(sounding, { maxCapo = 7 } = {})`

Capo-Lagen vorschlagen, in denen das Lied gleich klingt, aber mit möglichst einfachen Griffen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `sounding` | `string[]` | klingende Akkorde (ohne Capo gespielt) |
| `[opts]` | `{maxCapo?: number}` |  |

**Rückgabe:** `{capo: number, chords: string[], easy: number, total: number}[]` bester Vorschlag zuerst

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `preferFlats(chord, capo)` – Griffe wie Bb/Eb lesen sich für Gitarristen besser als A#/D#
