# `src/core/abc.js`

[← Übersicht](../README.md)

Noten als ABC-Notation im ChordPro-Text ({start_of_abc} … {end_of_abc}, Kurzform {soa}/{eoa}). Reine Textlogik ohne Bildschirm: fehlende Kopfzeilen ergänzen, Akkorde finden. Gezeichnet und abgespielt wird in render/abc-view.js (abcjs, nur bei Bedarf geladen).

**Benutzt von:** [`formats/export-text.js`](../formats/export-text.md), [`render/song-view.js`](../render/song-view.md), [`ui/harp-from-notes.js`](../ui/harp-from-notes.md), [`ui/snippets.js`](../ui/snippets.md)

## Exportiert

### `abcKey(key)`

ChordPro-Tonart („F#m“, „Bb“, „C“) als ABC-Tonart. Unbekanntes ergibt „C“.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[key]` | `string` |  |

**Rückgabe:** `string`

### `completeAbc(text, meta = {})`

ABC-Text eines Abschnitts vollständig machen, damit er sich immer zeichnen lässt:
X: fehlt → „X:1“ an den Anfang; K: fehlt → Tonart aus {key} (sonst C) als letzte Kopfzeile;
M: (aus {time}) und L:1/8 nur, wenn K: ergänzt werden muss. Vorhandenes bleibt unverändert.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` | Inhalt zwischen {start_of_abc} und {end_of_abc} |
| `[meta]` | `{key?: string, time?: string}` | Liedinfo |

**Rückgabe:** `string`

### `abcChords(text)`

Akkorde über den Noten („G“, "Am7") in Reihenfolge des Auftretens. Anmerkungen ("^Text", "_Text",
"<…", ">…", "@…") zählen nicht; Kommentare (%) und Liedtextzeilen (w:) werden übersprungen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` |  |

**Rückgabe:** `string[]`

### `abcTempo(meta = {})`

Tempo aus der Liedinfo ({tempo: 96} oder „♩ = 96“), sonst 100 Schläge pro Minute.

### `abcSkeleton(meta = {})`

Gerüst für den Baustein „Noten“ im Editor.
