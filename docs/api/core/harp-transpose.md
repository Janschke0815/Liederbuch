# `src/core/harp-transpose.js`

[← Übersicht](../README.md)

Harp-Hilfe: Mundharmonika-Tabs auf einer Harp in einer anderen Tonart spielen. Reine Funktionen, kein DOM.

```text
{harp: C} im Lied sagt, für welche Harp die Tabs geschrieben sind – so, wie das Lied mit dem Capo
```

aus dem Text klingt (ohne Transponieren). Wird das Lied transponiert, braucht man für dieselben Tabs eine Harp in der verschobenen Tonart. Fehlt die Angabe, wird sie aus Tonart und Tabs geschätzt.

Zwei Wege, wenn man diese Harp nicht hat:

```text
  A  gleiche Tabs, das ganze Lied wandert mit (Akkorde werden transponiert)
  B  gleiche Tonart, die Tabs werden für die eigene Harp umgeschrieben (evtl. mit Bendings)
```

**Benutzt:** [`core/chords.js`](chords.md), [`core/harp-melody.js`](harp-melody.md), [`core/harp.js`](harp.md)  
**Benutzt von:** [`play-mode.js`](../play-mode.md), [`ui/capo-help.js`](../ui/capo-help.md), [`ui/harp-help.js`](../ui/harp-help.md), [`ui/song.js`](../ui/song.md)

## Exportiert

### `parseHarpKey(name)`

Harp-Tonart aus Text: „C“, „Bb“, „A#“, „f#“, „H“ (deutsch für B).

**Rückgabe:** `number` Tonklasse 0–11, -1 wenn unbekannt

### `harpKeyName(key)`

Name einer Harp-Tonart („C“, „Bb“, „F#“ …), wie auf den Harps gedruckt.

### `songHarpTabs(song)`

Alle einzelnen Töne der Mundharmonika-Tabs im Lied, in Reihenfolge.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |

**Rückgabe:** `string[]`

### `writtenHarp(song)`

Für welche Harp sind die Tabs geschrieben? Erst {harp:}, sonst geschätzt: Die Töne der Tabs sollen
zur Tonart des Liedes passen und der letzte Ton möglichst der Grundton sein. Bei Gleichstand gewinnt
die übliche Lage: 2. Lage (Harp eine Quarte über dem Lied, z. B. G-Lied auf C-Harp), dann 1. Lage;
bei Moll die 3. Lage (Harp einen Ganzton tiefer). Ohne Tonart: C-Harp.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |

**Rückgabe:** `{key: number, guessed: boolean} | null` null: keine Tabs im Lied

### `songHarp(song, transpose = 0)`

Harp, auf der die Tabs gerade passen: geschriebene Harp + Transposition.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |
| `[transpose]` | `number` |  |

**Rückgabe:** `{key: number, written: number, guessed: boolean} | null`

### `harpShift(from, to)`

Halbtöne von einer Harp zur anderen, möglichst kurzer Weg (-6 … +5).

### `rewriteHarpTabs(tabs, from, to)`

Tabs für eine andere Harp umschreiben – gleicher Klang. Liegt die Melodie zu hoch oder tief,
wandert das ganze Lied um Oktaven (nie einzelne Töne).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `tabs` | `string[]` | einzelne Töne (siehe songHarpTabs) |
| `from` | `number` | Harp, für die die Tabs gerade passen |
| `to` | `number` | eigene Harp |

**Rückgabe:** `{map: Map<string, string|null>, bends: number, overs: number, missing: number, octave: number, count: number, ok: boolean}` map: alter Ton -> neuer Ton (null: gibt es auf der Harp nicht); ok: false bei chromatischen Tabs

### `harpChoice(song, transpose, to)`

Was die Harp-Hilfe zur Wahl stellt, wenn man auf Harp `to` spielen will.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |
| `transpose` | `number` | aktuelle Transposition des Liedes |
| `to` | `number` | eigene Harp |

**Rückgabe:** `{from: number, shift: number, rewrite: ReturnType<typeof rewriteHarpTabs>} | null` shift: Weg A – so viele Halbtöne wandert das Lied; rewrite: Weg B

### `harpView(song, transpose, playAs = '')`

Für die Anzeige: Tabs umgeschrieben für die gewählte eigene Harp (Weg B) – oder unverändert.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `song` | `object` | Ergebnis von parseChordPro |
| `transpose` | `number` |  |
| `[playAs]` | `string` | gewählte Harp („A“), leer = Tabs wie geschrieben |

**Rückgabe:** `{harp: string, map: Map<string, string|null>|null} | null` harp: Name der Harp, auf der man so spielt

### `rewriteHarpText(text, map)`

Umgeschriebene Tabs in den ChordPro-Text schreiben (Klammern mit Harp-Tönen; Tab-, Raster- und
Notenabschnitte bleiben unberührt). Töne ohne Entsprechung werden zu [*?].

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` |  |
| `map` | `Map<string, string\|null>` | aus rewriteHarpTabs |

**Rückgabe:** `string`

### `HARP_KEYS`

Weitergereicht (für bestehende Aufrufer).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `soundingTonic(song)` – Klingender Grundton und Tongeschlecht aus {key:} bzw. erstem Akkord, plus Capo.
