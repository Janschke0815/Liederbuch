# `src/core/abc-import.js`

[← Übersicht](../README.md)

Fertige Noten ins Lied holen: ABC aus dem Internet (abcnotation.com, Volkslied-Sammlungen …) oder eine MusicXML-Datei. Reine Textlogik: Stücke trennen, Kopf aufräumen, Liedinfo (Titel, Tonart, Takt, Tempo) herauslesen, Notenabschnitt bauen. Der Dialog dazu steht in ui/notes-import.js.

**Benutzt:** [`core/musicxml.js`](musicxml.md)  
**Benutzt von:** [`ui/notes-import.js`](../ui/notes-import.md)

## Exportiert

### `splitAbcTunes(text)`

Text mit einem oder mehreren ABC-Stücken (je ab „X:“) in Stücke zerlegen.
Text ohne „X:“ gilt als ein Stück.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` |  |

**Rückgabe:** `{title: string, text: string}[]`

### `abcForSong(tune)`

Ein ABC-Stück fürs Lied aufbereiten: Titel, Komponist & Co. aus dem Kopf nehmen (stehen in der
Liedinfo), „X:“ weglassen, W:-Strophen unter den Noten weglassen; Takt, Tonart und Tempo merken.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `tune` | `string` |  |

**Rückgabe:** `{abc: string, title: string, composer: string, key: string, time: string, tempo: number|null}`

### `readNotes(text, opts = {})`

Was eingefügt oder geöffnet wurde, als Liste von Stücken fürs Lied: MusicXML (erkannt am Inhalt)
oder ABC (ein oder mehrere Stücke).
@throws {Error} wenn keine Noten darin stehen

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` |  |
| `[opts]` | `{part?: number}` | bei MusicXML: Spur |

**Rückgabe:** `{kind: 'abc'|'musicxml', tunes: ReturnType<typeof abcForSong>[], parts?: string[], part?: number}`

### `looksLikeNotes(text)`

Sieht eingefügter Text nach einem ganzen Notenstück aus (ABC mit Kopf oder MusicXML)?

### `abcSection(abc, label = 'Melodie')`

Notenabschnitt für den Liedtext.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `abc` | `string` |  |
| `[label]` | `string` |  |

**Rückgabe:** `string`

### `placeNotes(text, at, section, meta = [])`

Notenabschnitt in den Liedtext setzen und fehlende Liedinfo ergänzen – als ein Schritt.
Steht die Stelle mitten in einer Zeile wie „{title: …}“, kommen die Noten hinter diese Zeile.
Liedinfo: leere Zeilen wie „{key: }“ werden gefüllt, sonst kommt die Zeile an den Anfang.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` | Liedtext |
| `at` | `number` | Einfügestelle |
| `section` | `string` | Notenabschnitt (abcSection) |
| `[meta]` | `[string, string][]` | z. B. [['key', 'G'], ['time', '3/4']] |

**Rückgabe:** `{text: string, cursor: number}` cursor: hinter dem Notenabschnitt
