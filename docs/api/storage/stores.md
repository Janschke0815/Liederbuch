# `src/storage/stores.js`

[← Übersicht](../README.md)

Speicher-Backends. Alle haben dieselbe kleine Schnittstelle:

```text
  getAll() -> Promise<Record[]>
  get(id)  -> Promise<Record|undefined>
  put(record) / putMany(records) / delete(id) / clear()
```

Ein späterer Cloud-Sync setzt auf dieser Schnittstelle bzw. dem Repository auf.

**Benutzt von:** [`sync-ui.js`](../sync-ui.md), [`ui/abo.js`](../ui/abo.md), [`ui/app-state.js`](../ui/app-state.md)

## Exportiert

### `openIdbStore(dbName = 'liederbuch', storeName = 'songs')`

Dauerhafter Speicher im Browser (IndexedDB), ohne Fremdbibliothek.

### `createMemoryStore()`

Flüchtiger Speicher, z. B. für Tests.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `wrapIdb(db, name)`
