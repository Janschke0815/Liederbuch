// Alles, was sich die App pro Gerät im Browser merkt (localStorage) – an einer Stelle.
//
// Jeder Eintrag hat einen Namen, den Schlüssel im Speicher und einen Standardwert. Der Typ des
// Standardwerts bestimmt, wie gelesen wird:
//   Text -> wie gespeichert    Zahl -> Number    true/false -> '1' bzw. ''    Objekt/Array -> JSON
// So gibt es keine Tippfehler bei Schlüsseln, und man sieht auf einen Blick, was gespeichert wird.
//
// Nicht hier, weil die Module ihren Speicher selbst verwalten (und dafür Tests haben):
//   settings          Schrift, Farben, Druck            src/settings/settings.js
//   printOptions, printFonts, printPins                src/print-ui.js, src/print/*.js
//   books, activeBook gemeinsame Liederbücher           src/books.js
//   sync.*, webdav.*  Cloud-Verbindung, Zugangsdaten    src/sync-ui.js, src/sync/*.js
//   liveLead          Raum-Code des Vorsingers (sessionStorage, nur bis der Tab zu ist)   src/live-ui.js

export const PREFS = {
  // Liste
  lastSong: { key: 'lastSong', def: '' }, // zuletzt geöffnetes Lied
  listSort: { key: 'listSort', def: 'title' }, // title | artist | updated | played
  activeTag: { key: 'activeTag', def: '' },
  chordFilterOpen: { key: 'cfOpen', def: false }, // „Was kann ich spielen?“
  chordFilterChords: { key: 'cfChords', def: '' },
  chordFilterCapo: { key: 'cfCapo', def: false },
  welcomeHidden: { key: 'welcomeHidden', def: false }, // „So geht's los“ ausgeblendet
  listTab: { key: 'listTab', def: 'songs' }, // songs | sets
  openSetlist: { key: 'openSetlist', def: '' },
  // Editor und Vorschau
  focusMode: { key: 'focusMode', def: false }, // Editor ausgeblendet
  toolbarPins: { key: 'toolbarPins', def: ['btn-import', 'btn-print', 'btn-live'] }, // beschriftet in der Leiste, in dieser Reihenfolge
  listWidth: { key: 'listWidth', def: 0 }, // Breite der Liederliste in px (0 = Standard)
  editorShare: { key: 'editorShare', def: 0 }, // Anteil des Editors an Editor + Vorschau (0 = halb/halb)
  songMetaOpen: { key: 'songMetaOpen', def: true }, // Liedinfo aufgeklappt (breiter Bildschirm)
  songMetaOpenMobile: { key: 'songMetaOpenMobile', def: false }, // … am Handy
  viewZoom: { key: 'viewZoom', def: 1 },
  draft: { key: 'draft', def: '' }, // Entwurf aus der allerersten Version der App
  // Spielmodus
  playZoom: { key: 'playZoom', def: 0 }, // 0 = Standardgröße
  playZoomSong: { key: 'playZoomSong', def: {} }, // Lied-ID -> Schriftgröße
  playSpeed: { key: 'playSpeed', def: {} }, // Lied-ID -> Scroll-Geschwindigkeit
  playedAt: { key: 'playedAt', def: {} }, // Lied-ID -> zuletzt gespielt (ISO)
  playColumns: { key: 'playColumns', def: '1' }, // '1' | '2'
  playNight: { key: 'playNight', def: false },
  // Abos
  aboState: { key: 'aboState', def: {} }, // Liederbuch-ID -> { etag, checkedAt, publishedAt, count }
  aboPublished: { key: 'aboPublished', def: {} }, // Liederbuch-ID -> was zuletzt veröffentlicht wurde (inkl. Schlüssel)
  // Einstellungsdialog
  settingsCollapsed: { key: 'settingsCollapsed', def: [] }, // eingeklappte Bereiche
  settingsSampleHidden: { key: 'settingsSampleHidden', def: false },
};

/**
 * Zugriff auf die Werte aus PREFS.
 * @param {Storage} storage  für Tests austauschbar
 */
export function createPrefs(storage = globalThis.localStorage) {
  const entry = (name) => {
    const e = PREFS[name];
    if (!e) throw new Error(`Unbekannte Einstellung „${name}“ – bitte in src/prefs.js eintragen`);
    return e;
  };
  return {
    get(name) {
      const { key, def } = entry(name);
      const raw = storage.getItem(key);
      if (raw === null) return structuredClone(def);
      if (typeof def === 'boolean') return raw === '1';
      if (typeof def === 'number') return Number.isFinite(Number(raw)) ? Number(raw) : def;
      if (typeof def === 'object') {
        try {
          const v = JSON.parse(raw);
          return v && typeof v === 'object' ? v : structuredClone(def);
        } catch {
          return structuredClone(def);
        }
      }
      return raw;
    },
    set(name, value) {
      const { key, def } = entry(name);
      if (typeof def === 'boolean') storage.setItem(key, value ? '1' : '');
      else if (typeof def === 'object') storage.setItem(key, JSON.stringify(value));
      else storage.setItem(key, String(value));
    },
    remove(name) {
      storage.removeItem(entry(name).key);
    },
    /** Eintrag in einer gespeicherten Zuordnung (z. B. playSpeed[liedId]) setzen. */
    setIn(name, id, value) {
      const map = this.get(name);
      map[id] = value;
      this.set(name, map);
    },
  };
}

export const prefs = createPrefs();
