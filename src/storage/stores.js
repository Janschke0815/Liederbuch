// Speicher-Backends. Alle haben dieselbe kleine Schnittstelle:
//   getAll() -> Promise<Record[]>
//   get(id)  -> Promise<Record|undefined>
//   put(record) / putMany(records) / delete(id) / clear()
// Ein späterer Cloud-Sync setzt auf dieser Schnittstelle bzw. dem Repository auf.

const STORES = ['songs', 'setlists'];

/** Dauerhafter Speicher im Browser (IndexedDB), ohne Fremdbibliothek. */
export function openIdbStore(dbName = 'liederbuch', storeName = 'songs') {
  return new Promise((resolve, reject) => {
    // Version 2: zusätzlich "setlists"
    const req = indexedDB.open(dbName, 2);
    req.onupgradeneeded = () => {
      for (const name of new Set([...STORES, storeName])) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(wrapIdb(req.result, storeName));
    req.onerror = () => reject(req.error);
  });
}

function wrapIdb(db, name) {
  // Andere Tabs mit neuerer Version nicht blockieren
  db.onversionchange = () => db.close();
  const tx = (mode, fn) =>
    new Promise((resolve, reject) => {
      const t = db.transaction(name, mode);
      const r = fn(t.objectStore(name));
      t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  return {
    getAll: () => tx('readonly', (s) => s.getAll()),
    get: (id) => tx('readonly', (s) => s.get(id)),
    put: (rec) => tx('readwrite', (s) => { s.put(rec); }),
    putMany: (recs) => tx('readwrite', (s) => { for (const r of recs) s.put(r); }),
    delete: (id) => tx('readwrite', (s) => { s.delete(id); }),
    clear: () => tx('readwrite', (s) => { s.clear(); }),
    close: () => db.close(),
  };
}

/** Flüchtiger Speicher, z. B. für Tests. */
export function createMemoryStore() {
  const map = new Map();
  const copy = (r) => (r === undefined ? undefined : structuredClone(r));
  return {
    getAll: async () => [...map.values()].map(copy),
    get: async (id) => copy(map.get(id)),
    put: async (rec) => { map.set(rec.id, copy(rec)); },
    putMany: async (recs) => { for (const r of recs) map.set(r.id, copy(r)); },
    delete: async (id) => { map.delete(id); },
    clear: async () => { map.clear(); },
    close: () => {},
  };
}
