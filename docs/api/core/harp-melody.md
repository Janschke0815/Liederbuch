# `src/core/harp-melody.js`

[← Übersicht](../README.md)

Melodie (ABC-Notation) → Mundharmonika-Tabs für eine diatonische 10-Kanal-Harp (Richter-Stimmung). Reine Funktionen, kein DOM: Töne und Silben aus dem ABC-Text lesen, jedem Ton einen Kanal geben (blasen/ziehen zuerst, dann Bending, dann Overblow), die passende Harp-Tonart vorschlagen und das Ergebnis als ChordPro-Zeilen mit Tabs über den Silben schreiben (Schreibweise wie in harp.js).

**Benutzt von:** [`ui/harp-from-notes.js`](../ui/harp-from-notes.md)

## Exportiert

### `HARP_KEYS`

`= ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']`

Harp-Tonarten in der üblichen Schreibweise, Index = Tonklasse (0 = C).

### `abcKeySignature(key)`

Vorzeichen einer ABC-Tonart („G“, „F#m“, „Bb“, „Ddor“, „Amix“).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `key` | `string` | Wert hinter K: |

**Rückgabe:** `{tonic: number, minor: boolean, acc: Record<string, number>}` Tonklasse, Moll?, Vorzeichen je Buchstabe

### `abcSyllables(line)`

Silben einer w:-Zeile. „-“ trennt Silben eines Wortes, „_“ hält die vorige Silbe über eine
weitere Note, „*“ lässt eine Note ohne Silbe, „~“ verbindet Wörter unter einer Note.

**Rückgabe:** `{text: string, joined: boolean, hold?: boolean}[]` joined: Wort geht mit der nächsten Silbe weiter

### `abcMelody(abc)`

Notenzeilen eines ABC-Textes mit Tonhöhen (MIDI) und der ersten Liedtextzeile darunter.
Pausen, Vorschlagsnoten, Akkordsymbole und Verzierungen zählen nicht; übergebundene Noten
(Bindebogen „-“) nur einmal; bei Akkorden aus Noten ([CEG]) zählt die erste.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `abc` | `string` |  |

**Rückgabe:** `{notes: number[], chords: (string|null)[], lyrics: string|null}[]` chords: Akkordsymbol vor dem Ton

### `harpHoleFor(midi, harpKey)`

Kanal für einen Ton auf einer Harp in einer Tonart.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `midi` | `number` | Tonhöhe |
| `harpKey` | `number` | Tonklasse der Harp (0 = C-Harp) |

**Rückgabe:** `{tab: string, kind: 'plain'|'bend'|'over'} | null` null: gibt es auf dieser Harp nicht

### `melodyForHarp(abc, harpKey, transpose = 0)`

Melodie für eine Harp-Tonart umwandeln; liegt sie zu hoch oder zu tief, wird sie um Oktaven
verschoben (shift in Halbtönen).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `abc` | `string` |  |
| `harpKey` | `number` | Tonklasse der Harp |
| `[transpose]` | `number` | Halbtöne, um die das Lied gerade transponiert angezeigt wird |

### `rankHarpKeys(abc, transpose = 0)`

Harp-Tonarten nach Eignung: wenige fehlende Töne, wenige Bendings. Bei Gleichstand gewinnt die
1. Lage (Harp in der Tonart des Liedes), bei Moll die 3. Lage (Harp einen Ganzton tiefer).

**Rückgabe:** `{key: number, name: string, missing: number, bends: number, overs: number, octave: number}[]`

### `harpTabsFromAbc(abc, harpKey, transpose = 0, { chords = false } = {})`

Melodie als ChordPro-Zeilen: Tabs über den Silben der w:-Zeile, ohne Liedtext eine reine Tab-Zeile
je Notenzeile. Töne, die es auf der Harp nicht gibt, stehen als Anmerkung [*?].

| Parameter | Typ | Bedeutung |
|---|---|---|
| `abc` | `string` |  |
| `harpKey` | `number` |  |
| `[transpose]` | `number` |  |
| `[opts]` | `{chords?: boolean}` | chords: Akkordsymbole der Noten mitnehmen (stehen über den Tabs, in der Tonart der Noten – die Vorschau transponiert sie wie alle Akkorde des Liedes) |

**Rückgabe:** `{text: string, missing: number, bends: number, overs: number, octave: number, count: number, chords: number}` chords: Anzahl übernommener Akkorde

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `parseMusicLine(line, startSig)`
- `convertNotes(lines, harpKey, shift)`
