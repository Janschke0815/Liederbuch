# `src/types.js`

[← Übersicht](README.md)

Beschreibung der wichtigsten Datensätze – nur für Editoren wie VS Code (Autovervollständigung, Hinweise bei Tippfehlern). Enthält keinen Code. In einer Datei nutzen mit:

```text
  /** @typedef {import('./types.js').Song} Song */
```

## Datentypen

### `Song`

### `Song`

Ein Lied, wie es in IndexedDB liegt (storage/repository.js).

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | `string` |  |
| `chordpro` | `string` | der Liedtext im ChordPro-Format |
| `title` | `string` | aus {title: …} abgeleitet |
| `artist` | `string` | aus {artist: …} abgeleitet (mehrere mit Komma) |
| `sortTitle` | `string` | aus {sorttitle: …} oder dem Titel |
| `tags` | `string[]` | aus {tag: …} |
| `transpose` | `number` | gespeicherte Transposition in Halbtönen (-6 … +5) |
| `accidentals` | `'auto'\|'sharp'\|'flat'` | Schreibweise der Akkorde |
| `[note]` | `string` | private Notiz (nicht im Druck) |
| `createdAt` | `string` | ISO-Zeitpunkt |
| `updatedAt` | `string` | ISO-Zeitpunkt der letzten Änderung (entscheidet beim Abgleich) |
| `deletedAt` | `string\|null` | gesetzt = im Papierkorb |

### `SetlistItem`

Ein Eintrag einer Setliste.

| Feld | Typ | Bedeutung |
|---|---|---|
| `songId` | `string` |  |
| `transpose` | `number\|null` | null = Transposition des Liedes |
| `note` | `string` |  |

### `Setlist`

Eine Setliste (storage/setlists.js).

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | `string` |  |
| `name` | `string` |  |
| `items` | `SetlistItem[]` |  |
| `createdAt` | `string` |  |
| `updatedAt` | `string` |  |
| `deletedAt` | `string\|null` |  |

### `ParsedSong`

Ein geparstes Lied (core/chordpro.js).

| Feld | Typ | Bedeutung |
|---|---|---|
| `meta` | `Record<string, any>` | title, artist[], key, capo, time, tempo, duration, tag[] … |
| `blocks` | `object[]` | Abschnitte mit Zeilen |

### `Settings`

Darstellungs-Einstellungen (settings/settings.js, DEFAULT_SETTINGS).

| Feld | Typ | Bedeutung |
|---|---|---|
| `lyricFont` | `string` |  |
| `lyricSize` | `number` |  |
| `chordFont` | `string` |  |
| `chordSize` | `number` |  |
| `chordColor` | `string` |  |
| `showChords` | `boolean` |  |
| `showDiagrams` | `boolean` |  |
| `showHarp` | `boolean` |  |
| `harpLayout` | `'inline'\|'split'` |  |
| `showTabs` | `boolean` |  |
| `showAbc` | `boolean` |  |
| `abcSize` | `number` | Prozent |
| `abcLyrics` | `boolean` |  |
| `abcChords` | `boolean` |  |
| `abcTempo` | `number` | Schläge pro Minute |
| `paper` | `'A4'\|'A5'\|'Letter'` |  |
| `columns` | `1\|2` |  |
| `margin` | `number` |  |
| `pageNumbers` | `boolean` |  |

## Exportiert

### ``

Weitergereicht (für bestehende Aufrufer).
