// Beschreibung der wichtigsten Datensätze – nur für Editoren wie VS Code (Autovervollständigung,
// Hinweise bei Tippfehlern). Enthält keinen Code. In einer Datei nutzen mit:
//   /** @typedef {import('./types.js').Song} Song */

/**
 * Ein Lied, wie es in IndexedDB liegt (storage/repository.js).
 * @typedef {object} Song
 * @property {string} id
 * @property {string} chordpro        der Liedtext im ChordPro-Format
 * @property {string} title           aus {title: …} abgeleitet
 * @property {string} artist          aus {artist: …} abgeleitet (mehrere mit Komma)
 * @property {string} sortTitle       aus {sorttitle: …} oder dem Titel
 * @property {string[]} tags          aus {tag: …}
 * @property {number} transpose       gespeicherte Transposition in Halbtönen (-6 … +5)
 * @property {'auto'|'sharp'|'flat'} accidentals  Schreibweise der Akkorde
 * @property {string} [note]          private Notiz (nicht im Druck)
 * @property {string} createdAt       ISO-Zeitpunkt
 * @property {string} updatedAt       ISO-Zeitpunkt der letzten Änderung (entscheidet beim Abgleich)
 * @property {string|null} deletedAt  gesetzt = im Papierkorb
 */

/**
 * Ein Eintrag einer Setliste.
 * @typedef {object} SetlistItem
 * @property {string} songId
 * @property {number|null} transpose  null = Transposition des Liedes
 * @property {string} note
 */

/**
 * Eine Setliste (storage/setlists.js).
 * @typedef {object} Setlist
 * @property {string} id
 * @property {string} name
 * @property {SetlistItem[]} items
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} deletedAt
 */

/**
 * Ein geparstes Lied (core/chordpro.js).
 * @typedef {object} ParsedSong
 * @property {Record<string, any>} meta   title, artist[], key, capo, time, tempo, duration, tag[] …
 * @property {object[]} blocks            Abschnitte mit Zeilen
 */

/**
 * Darstellungs-Einstellungen (settings/settings.js, DEFAULT_SETTINGS).
 * @typedef {object} Settings
 * @property {string} lyricFont
 * @property {number} lyricSize
 * @property {string} chordFont
 * @property {number} chordSize
 * @property {string} chordColor
 * @property {boolean} showChords
 * @property {boolean} showDiagrams
 * @property {boolean} showHarp
 * @property {'inline'|'split'} harpLayout
 * @property {boolean} showTabs
 * @property {'A4'|'A5'|'Letter'} paper
 * @property {1|2} columns
 * @property {number} margin
 * @property {boolean} pageNumbers
 */

export {};
