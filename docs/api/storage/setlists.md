# `src/storage/setlists.js`

[← Übersicht](../README.md)

Setlisten: geordnete Auswahl von Liedern, z. B. für einen Auftritt.

Datensatz:

```text
{
  id, name,
  items: [{ songId, transpose, note }]   – transpose: null = Transposition des Liedes,
                                            sonst eigene Halbtöne nur für diese Setliste
  createdAt, updatedAt, deletedAt          – wie bei Liedern (weiches Löschen für den Sync)
}
```

**Benutzt:** [`core/text.js`](../core/text.md), [`storage/repository.js`](repository.md)  
**Benutzt von:** [`app.js`](../app.md), [`sync/webdav.js`](../sync/webdav.md), [`ui/abo.js`](../ui/abo.md), [`ui/app-state.js`](../ui/app-state.md), [`ui/files.js`](../ui/files.md)

## Exportiert

### `slimSetlist(r)`

Alle gespeicherten bzw. synchronisierten Felder einer Setliste.

### `class SetlistRepository extends EventTarget`

Ereignisse wie SongRepository: "change" (eigene Änderung), "remote-change" (detail: ids).

#### `new SetlistRepository(store, { now = ()`

#### `async list()`

Alle Setlisten alphabetisch.

#### `async get(id)`

Setliste mit dieser ID (gelöschte nicht).

#### `create(name, items = [])`

Neue Setliste anlegen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `name` | `string` |  |
| `[items]` | `{songId: string}[]` |  |

**Rückgabe:** `Promise<object>`

#### `update(id, changes)`

changes: { name?, items? }

#### `remove(id)`

Setliste löschen (bleibt als Grabstein für den Abgleich).

#### `restore(id)`

Gelöschte Setliste wiederherstellen.

#### `async allRecords()`

Alle Datensätze, auch gelöschte (für Abgleich und Sicherung).

#### `applyRemote(records)`

Setlisten aus dem Abgleich übernehmen – nur, was neuer ist als hier.

**Rückgabe:** `Promise<string[]>` IDs der übernommenen Setlisten

#### `replaceFromAbo(records)`

Setlisten eines Abos übernehmen: Abo-Setlisten werden ersetzt bzw. entfernt; eigene, hier
angelegte Setlisten (ohne Abo-Kennung) bleiben.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `records` | `object[]` | Setlisten aus dem Abo |

#### `async importRecords(records)`

Setlisten aus einer Sicherung übernehmen: neue kommen dazu, vorhandene nur, wenn die
Sicherung neuer ist. Zählt als eigene Änderung (wird also auch abgeglichen).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `defaultId()`
- `cleanItems(items)`
