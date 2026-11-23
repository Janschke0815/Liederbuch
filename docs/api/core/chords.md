# `src/core/chords.js`

[← Übersicht](../README.md)

Akkord-Erkennung und Transposition. Reine Funktionen, kein DOM.

**Benutzt von:** [`core/capo.js`](capo.md), [`core/chord-shapes.js`](chord-shapes.md), [`core/playable.js`](playable.md), [`formats/export-text.js`](../formats/export-text.md), [`formats/file-import.js`](../formats/file-import.md), [`formats/ug-import.js`](../formats/ug-import.md), [`render/song-view.js`](../render/song-view.md), [`ui/capo-help.js`](../ui/capo-help.md), [`ui/chord-tap.js`](../ui/chord-tap.md), [`ui/list.js`](../ui/list.md), [`ui/song.js`](../ui/song.md)

## Exportiert

### `CHORD_RE`

Grundton, Akkordtyp (m, 7, maj7, sus4, add9, m7b5, 6/9 …), optional Bass, optional Stern(e) am Ende:
„Am*“ markiert bei Ultimate Guitar & Co. eine Griff-Variante – der Akkord ist trotzdem Am.

### `parseChord(name)`

Akkord zerlegen: „F#m7/C#“ -> {root: 'F#', quality: 'm7', bass: 'C#', mark: ''}.
mark: Stern(e) am Ende („Am*“ = Variante von Am); zählt nicht zum Akkordtyp, bleibt beim Transponieren.

**Rückgabe:** `{root: string, quality: string, bass: string|null, mark: string} | null` null, wenn es kein Akkord ist

### `isChord(name)`

Ist der Text ein Akkordname (C, Am7, D/F#, Bbsus4 …)?

### `transposeNote(note, steps, useFlats)`

Einen Ton um Halbtöne verschieben.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `note` | `string` | z. B. 'F#' oder 'Bb' |
| `steps` | `number` | Halbtöne (auch negativ) |
| `useFlats` | `boolean` | mit b statt # schreiben |

**Rückgabe:** `string`

### `shouldUseFlats(mode, key, steps)`

Entscheidet, ob ♭ oder # verwendet wird.
mode: 'sharp' | 'flat' | 'auto'. Bei 'auto' zählt die (transponierte) Tonart.

### `transposeChord(name, steps, useFlats)`

Transponiert einen Akkordnamen. Unbekannte Namen bleiben unverändert.

### `noteIndex(note)`

Halbton-Index 0–11 (C = 0) oder undefined.
