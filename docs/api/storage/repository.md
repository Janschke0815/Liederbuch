# `src/storage/repository.js`

[← Übersicht](../README.md)

Lieder verwalten: anlegen, ändern, löschen, suchen, Export/Import. Kennt nur die Store-Schnittstelle (siehe stores.js), nicht IndexedDB selbst.

Datensatz:

```text
{
  id, chordpro,
  title, artist, sortTitle,          – aus dem ChordPro-Text abgeleitet (für Liste/Suche)
  transpose, accidentals,            – gespeicherte Ansicht pro Lied
  createdAt, updatedAt, deletedAt    – ISO-Zeitstempel; deletedAt = gelöscht (für späteren Sync)
}
```

**Benutzt:** [`core/chordpro.js`](../core/chordpro.md), [`core/text.js`](../core/text.md)  
**Benutzt von:** [`print-ui.js`](../print-ui.md), [`storage/setlists.js`](setlists.md), [`sync-ui.js`](../sync-ui.md), [`sync/sync-engine.js`](../sync/sync-engine.md), [`sync/webdav.js`](../sync/webdav.md), [`ui/abo.js`](../ui/abo.md), [`ui/add-songs.js`](../ui/add-songs.md), [`ui/app-state.js`](../ui/app-state.md), [`ui/files.js`](../ui/files.md)

## Exportiert

### `EXPORT_FORMAT`

`= 'liederbuch'`

### `EXPORT_VERSION`

`= 2`

2: zusätzlich Papierkorb (trash); Setlisten stehen in der Sicherungsdatei der App

### `normalize`

`= foldText`

Für die Suche vereinfachen (siehe core/text.js) – alter Name, bleibt für bestehende Aufrufer.

### `deriveSummary(chordpro)`

Titel, Interpret, Sortiertitel und Tags aus dem ChordPro-Text ableiten (für Liste und Suche).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `chordpro` | `string` |  |

**Rückgabe:** `{title: string, artist: string, sortTitle: string, tags: string[]}`

### `SYNC_FIELDS`

`= ['id', 'chordpro', 'transpose', 'accidentals', 'note', 'createdAt', 'updatedAt', 'deletedA`

note: private Notiz zum Lied (nicht im Druck)

### `slimRecord(r)`

Nur die Felder, die abgeglichen und gesichert werden (SYNC_FIELDS).

### `fullRecord(r)`

Vollständiger Datensatz aus einem schlanken (z. B. aus der Cloud).

### `isNewer(a, b, slim = slimRecord)`

Welche Fassung gewinnt? Die mit dem späteren updatedAt; bei Gleichstand entscheidet der
Inhalt, damit alle Geräte zum selben Ergebnis kommen.

### `class SongRepository extends EventTarget`

Ereignisse: "change" bei eigenen Änderungen, "remote-change" (detail: ids) wenn
Änderungen von anderen Geräten übernommen wurden.

#### `new SongRepository(store, { now = ()`

#### `async tags()`

Alle verwendeten Tags mit Anzahl, alphabetisch.

#### `async trash()`

Gelöschte Lieder (Papierkorb), zuletzt gelöschte zuerst.

#### `purge(id)`

Endgültig leeren: Inhalt entfernen. Der Grabstein bleibt (ohne Text), damit andere
Geräte beim Abgleich die Löschung weiter kennen.

#### `static sort(songs)`

Lieder nach Sortiertitel, dann Interpret sortieren (ändert das Array).

#### `async list({ query = '', tag = '' } = {})`

Alle Lieder alphabetisch; optional gefiltert (Titel/Interpret, sonst Liedtext).

#### `async get(id)`

Lied mit dieser ID (gelöschte nicht).

**Rückgabe:** `Promise<object|undefined>`

#### `create(chordpro = '', extra = {})`

Neues Lied anlegen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `chordpro` | `string` | Liedtext |
| `[extra]` | `object` | weitere Felder, z. B. {transpose, accidentals, note} |

**Rückgabe:** `Promise<object>` der neue Datensatz

#### `update(id, changes)`

Ändert chordpro, transpose und/oder accidentals.

#### `remove(id)`

Löscht weich: Datensatz bleibt als Grabstein für einen späteren Sync erhalten.

#### `restore(id)`

Holt ein (weich) gelöschtes Lied zurück – für "Rückgängig".

#### `async allRecords()`

Alle Datensätze einschließlich gelöschter (Grabsteine) – für den Sync.

#### `applyRemote(records)`

Übernimmt Fassungen von anderen Geräten, aber nur, wenn sie neuer sind als die lokale
(falls hier inzwischen weiter bearbeitet wurde, bleibt die lokale Fassung).

**Rückgabe:** `Promise<string[]>` geänderte IDs

#### `replaceFromAbo(records)`

Stand eines Abos übernehmen: Was im Abo steht, gilt; was fehlt, wird entfernt (endgültig – ein
Abo hat keinen Papierkorb). Eigene Ansicht bleibt: Transposition, Schreibweise, Notiz.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `records` | `{id: string, chordpro: string, createdAt?: string, updatedAt?: string}[]` |  |

**Rückgabe:** `Promise<{added: number, changed: number, removed: number}>`

#### `async exportData()`

Alle Lieder und den Papierkorb als Sicherung ({format, version, songs, trash}).

#### `importData(data)`

Führt eine Sicherung zusammen: neue Lieder kommen dazu, vorhandene werden nur
überschrieben, wenn die Sicherung neuer ist.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `defaultId()`
- `lyricsText(chordpro)` – Nur Zeichen aus dem Liedtext, ohne Akkorde und Direktiven – für die Volltextsuche.
