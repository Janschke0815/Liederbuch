# Architektur

Wie das Liederbuch aufgebaut ist und wie die Teile zusammenspielen. Die Beschreibung jeder einzelnen
Funktion steht in der [API-Dokumentation](api/README.md), die aus den Kommentaren im Quelltext erzeugt wird.

## Grundsätze

- **Einfacher Aufbau.** Reines JavaScript (ES-Module) ohne Framework. [Vite](https://vite.dev) ist
  Entwicklungsserver (`npm run dev`) und baut die App für die Veröffentlichung (`npm run build` → `dist/`).
  Bibliotheken nur, wo sie echte Arbeit sparen.
- **Offline zuerst.** Alle Lieder liegen im Browser (IndexedDB). Die Cloud ist ein Abgleich, kein Muss.
- **Lesbare Dateien.** Lieder sind ChordPro-Text – in der App, auf dem WebDAV-Server und in der Sicherung.
- **Logik ohne Bildschirm.** Alles, was rechnet (Parser, Transponieren, Dateiformate, Abgleich), kommt ohne
  DOM aus und ist mit Tests abgesichert (`tests/`).

## Schichten

Abhängigkeiten zeigen nur nach unten. Ein Modul darf alles darunter benutzen, nie etwas darüber.

```mermaid
flowchart TD
  ui["Oberfläche<br>src/app.js · src/ui/ · *-ui.js · play-mode.js"]
  render["Darstellung<br>src/render/ · src/print/ · src/settings/"]
  sync["Abgleich<br>src/sync/"]
  storage["Speicher<br>src/storage/"]
  formats["Dateiformate<br>src/formats/"]
  core["Logik<br>src/core/"]
  ui --> render & sync & storage & formats & core
  render --> core
  sync --> storage & formats & core
  storage --> core
  formats --> core
```

| Schicht | Ordner | Aufgabe |
|---|---|---|
| Logik | `src/core/` | ChordPro lesen, Akkorde transponieren, Capo, Harp-Tabs, Wiederholungen, Liedinfo im Text ändern, Sortieren, Spielmodus-Rechnungen, Textfunktionen |
| Dateiformate | `src/formats/` | `.cho`-Dateien und Dateinamen, ZIP, Sicherung, Import von Text und Ultimate Guitar, Export als Text |
| Speicher | `src/storage/` | Lieder und Setlisten in IndexedDB; weiches Löschen (Papierkorb), Export/Import |
| Abgleich | `src/sync/` | Sync-Engine (zusammenführen), Anbieter Google Drive, Dropbox und WebDAV, Google-Anmeldung |
| Live-Modus | `src/live/`, `src/live-ui.js` | kleiner MQTT-Client (WebSocket), Raum-Code und AES-GCM-Verschlüsselung, Live-Raum über zwei öffentliche Server; Dialog und Mitsinger-Ansicht im Spielmodus |
| Darstellung | `src/render/`, `src/print/`, `src/settings/` | Lied -> HTML, Griffbilder, Seitenumbruch für den Druck, Darstellungs-Einstellungen |
| Oberfläche | `src/app.js`, `src/ui/`, `src/*-ui.js`, `src/play-mode.js` | alles, was man sieht und anklickt |

## Datenmodell

**Lied** (IndexedDB, Speicher `songs`) – Beschreibung aller Felder in [`types.js`](api/types.md):

```js
{ id, chordpro,                 // der Liedtext – die einzige „Wahrheit“
  title, artist, sortTitle, tags, // daraus abgeleitet (für Liste und Suche)
  transpose, accidentals, note,  // Ansicht und private Notiz
  createdAt, updatedAt, deletedAt }
```

**Setliste** (Speicher `setlists`): `{ id, name, items: [{ songId, transpose, note }], createdAt, updatedAt, deletedAt }`.

Gelöscht wird **weich**: `deletedAt` wird gesetzt, der Datensatz bleibt als „Grabstein“, damit der Abgleich die
Löschung an andere Geräte weitergeben kann. Im Papierkorb lässt er sich wiederherstellen.

**Song-Modell** (Ergebnis von `parseChordPro`, Aufbau im Kopf von [`core/chordpro.js`](api/core/chordpro.md)):
`meta` (Titel, Interpret, Tonart …) und `blocks` (Abschnitte mit Zeilen aus Akkord-/Text-Segmenten).

## Ein Lied bearbeiten – was passiert

```mermaid
sequenceDiagram
  participant E as Editor (ui/song.js)
  participant R as SongRepository
  participant L as Liste (ui/list.js)
  participant S as SyncEngine
  E->>E: Tippen: Vorschau sofort neu (renderPreview)
  E->>R: 0,5 s nach der letzten Taste: update(id, {chordpro})
  R-->>L: Ereignis „change“ -> Liste neu zeichnen
  R-->>S: Ereignis „change“ -> Abgleich in Kürze
  S->>S: lesen, zusammenführen (neuestes updatedAt gewinnt), schreiben
  S-->>R: applyRemote(Änderungen anderer Geräte)
  R-->>E: Ereignis „remote-change“ -> geöffnetes Lied auffrischen
```

## Abgleich

Die **Sync-Engine** (`sync/sync-engine.js`) kennt nur zwei Dinge vom Anbieter: `read()` und `write()`.
Sie liest den Stand in der Cloud, führt ihn mit dem eigenen zusammen (pro Datensatz gewinnt das neuere
`updatedAt`, Löschungen sind Grabsteine) und schreibt das Ergebnis zurück. Hat sich die Cloud inzwischen
geändert (`ConflictError`), liest sie neu und versucht es noch einmal.

| Anbieter | Ablage | Besonderheit |
|---|---|---|
| Google Drive (`google-drive.js`, Anmeldung `google-auth.js`) | eine JSON-Datei pro Liederbuch | Teilen über Drive-Freigaben (lesen/bearbeiten); Google setzt die Rechte durch, mit Leserechten gleicht die Engine nur ab (`readOnly`) |
| WebDAV (`webdav.js`, `webdav-client.js`) | `Lieder/*.cho`, `Setlisten/*.txt`, `Liederbuch.json` nur als Hinweis | Dateien auch direkt auf dem Server bearbeitbar; jedes Gerät merkt sich, welche Dateien es gesehen hat, und erkennt so Umbenennen und Löschen |

## Mehrere Liederbücher

`books.js` führt die Liederbücher eines Geräts: das persönliche (`PERSONAL`), eigene (`own`, ab 2.2),
geteilte (`shared`, Drive-Datei eines anderen) und Abos. Jedes hat eine eigene IndexedDB (`dbName`);
`ui/app-state.js` öffnet nur die des aktiven Buchs, ein Wechsel lädt die Seite neu. Das persönliche
lässt sich umbenennen (`personalName`, `personalBookName()`). Oberfläche: Dialog `#books-dialog`
(Liste, anlegen, Einladung, Abo) in `books-ui.js` und `#sync-dialog` (Abgleich des geöffneten Buchs) in
`sync-ui.js`; `setupSync` richtet beide ein und reicht dem Liederbuch-Teil nur, was er von der Cloud braucht. Speicherort,
Zugangsdaten und Anmeldung liegen je Buch unter `bookKey(book, 'webdav.url')` usw. (gelesen über
`sync/book-settings.js`) – für das
persönliche und vor 2.2 geteilte Bücher sind das die alten, globalen Schlüssel (keine Umstellung),
sonst `…:<Buch-ID>`. `GoogleAuth` (`tokenKey`, `accountKey`, `login_hint`), `DropboxProvider`
(`tokenKey`, `path`) und `GoogleDriveProvider` (`fileName`, `fileIdKey`) bekommen diese Schlüssel von
`sync-ui.js`; so hat jedes Buch sein eigenes Konto.

## Abos (private Gruppen)

Ein abonniertes Liederbuch ist ein eigenes Liederbuch (`books.js`: `abo: { url, … }`, eigene Datenbank)
mit `readOnly` (`ui/app-state.js`). Es wird nie mit der Cloud abgeglichen, sondern über die Abo-Datei:
`sync/abo-client.js` lädt sie (Anmeldung, ETag), `SongRepository.replaceFromAbo` übernimmt den Stand
(die eigene Notiz bleibt; Transposition und Schreibweise kommen vom Herausgeber, sobald er sie ändert). Veröffentlichen (`ui/publish.js`) schreibt die Datei
(`formats/abo.js`, lesbares JSON) in den WebDAV-Ordner oder zum Herunterladen.

## Oberfläche

`src/app.js` steckt nur zusammen. Gemeinsamer Zustand liegt in [`ui/app-state.js`](api/ui/app-state.md):
Liederbuch, Datenbanken (`repo`, `sets`), das geöffnete Lied (`state.current`) und die größeren Bereiche
(`services.printer`, `services.play`, `services.setlists`).

Module verständigen sich über **Ereignisse** statt sich gegenseitig zu importieren:

| Ereignis | Wo | Bedeutung |
|---|---|---|
| `songopened` | `window` | ein anderes Lied ist geöffnet (Liste markiert es, Setlisten passen sich an) |
| `change` | `repo`, `sets` | Lieder/Setlisten geändert (Liste neu zeichnen, Abgleich anstoßen) |
| `remote-change` | `repo`, `sets` | Änderungen von anderen Geräten angekommen |
| `settingschange` | `window` | Darstellungs-Einstellungen gespeichert |
| `metronome-beat` | `window` | Schlag des Metronoms (Anzeige blinkt) |

Gespeicherte Werte pro Gerät (localStorage) laufen über [`prefs.js`](api/prefs.md), Tastenkürzel über
[`ui/shortcuts.js`](api/ui/shortcuts.md) – beides jeweils an einer Stelle mit Standardwerten bzw. Tabelle.

## Gestaltung (CSS)

- `src/render/song-view.css` – das Lied selbst; alle Werte als CSS-Variablen (Schrift, Farben, Abstände),
  die `settings/settings.js` setzt.
- `src/styles/*.css` – die Oberfläche, eine Datei pro Bereich. Die Reihenfolge der `<link>` in `index.html`
  zählt: Grundlagen zuerst, Bereiche danach.
- `src/print/print.css` – nur für den Druck.

Vor und nach CSS-Umbauten mit [`tools/css-snapshot.js`](../tools/css-snapshot.js) vergleichen.

## Offline und Installation

`src/pwa.js` meldet den Service Worker (`public/sw.js`) an – nur in der gebauten App; beim Entwickeln
wird er abgemeldet, damit keine alten Dateien aus dem Cache kommen. Strategie „Netz zuerst, sonst Cache“: Mit Verbindung
kommt immer die neueste Version, ohne Verbindung die zuletzt geladene. Es gibt keine Dateiliste zu pflegen.

## Tests und Dokumentation

| Was | Wie |
|---|---|
| Tests | `npm run dev`, dann http://localhost:5173/tests/ öffnen |
| API-Dokumentation | `python tools/make-docs.py` erzeugt `docs/api/` aus den Kommentaren |
| Fehlende Kommentare finden | `python tools/make-docs.py --check` |

## Kommentare schreiben

Über jede exportierte Funktion, Klasse und öffentliche Methode gehört ein JSDoc-Kommentar (ähnlich Doxygen):

```js
/**
 * Einen Ton um Halbtöne verschieben.
 * @param {string} note      z. B. 'F#' oder 'Bb'
 * @param {number} steps     Halbtöne (auch negativ)
 * @param {boolean} useFlats mit b statt # schreiben
 * @returns {string}
 */
export function transposeNote(note, steps, useFlats) { … }
```

Oben in jeder Datei erklären ein paar `//`-Zeilen, wofür das Modul da ist – daraus entsteht die Übersicht.

## Noten (ABC-Notation)

Noten stehen als Abschnitt `{start_of_abc}` … `{end_of_abc}` im ChordPro-Text. Der Parser behandelt ihn
wie einen Tab-Abschnitt: Blocktyp `abc`, Zeilen `{type: 'abc', text}` unverändert. `core/abc.js` ist reine
Textlogik ohne Bildschirm: fehlende Kopfzeilen ergänzen (`completeAbc`: `X:1`, Takt und Tonart aus der
Liedinfo), Akkorde finden (`abcChords`), Tempo (`abcTempo`), Gerüst für den Baustein (`abcSkeleton`).

`renderSong` legt nur einen Platzhalter an (`.abc-score` mit `data-abc`, `data-transpose`, `data-chords`,
`data-tempo`). `render/abc-view.js` füllt ihn mit `renderScores(root)`: lädt abcjs per `import()` (eigener
Baustein, nur bei Bedarf), zeichnet je Notenzeile ein SVG (`oneSvgPerLine`, Klasse `atomic`, damit
`print/paginate.js` zwischen Notenzeilen umbricht) und benennt die Akkorde über den Noten wie im Liedtext
(`chordNamer`, also mit derselben Transposition und ♯/♭-Wahl). abcjs misst beim Zeichnen; das geht nur
im Dokument, deshalb wird unsichtbar außerhalb des Bildschirms gezeichnet und dann umgehängt. Ein
`ResizeObserver` bricht bei geänderter Breite neu um; unveränderte Abschnitte übernehmen beim Tippen
ihr fertiges Bild. Aufrufer: Vorschau (`ui/song.js`), Spielmodus (wartet vor dem Messen der Spalten),
Druck (zeichnet in der Spaltenbreite, bevor der Seitenumbruch misst).

Abspielen: abcjs-Synth mit Klavier-Samples aus `public/soundfont/` (kein fremder Server), nur Melodie
(`chordsOff`), Markierung der klingenden Note über `TimingCallbacks`; `stopAbc()` beim Liedwechsel und
beim Verlassen des Spielmodus. Offline: `vite.config.js` schreibt beim Bauen `lazy-files.json` (alle per
`import()` geladenen Bausteine), `pwa.js` meldet sie dem Service Worker mit – so liegt abcjs nach dem
ersten Besuch bereit, auch wenn noch nie Noten gezeigt wurden. Die Samples landen beim ersten ▶ im Cache.

Export: `transposeChordPro` lässt Tab- und Notenabschnitte unverändert; Noten ohne eigenes `K:` bekommen
beim Transponieren die ursprüngliche Tonart ausdrücklich (sonst läsen sie sich mit der neuen `{key}`
falsch). Der Text-Export („Akkorde über dem Text“) lässt Noten weg.

Melodie → Harp-Tabs: `core/harp-melody.js` liest Töne (MIDI) und Silben aus dem ABC-Text (eigener kleiner
Leser: Tonart und Versetzungszeichen je Takt, Bindebögen, Akkorde aus Noten, Verzierungen und Vorschläge
überspringen), ordnet jedem Ton einen Kanal der Richter-Harp zu (Tabelle der C-Harp, andere Tonarten um
−5…+6 Halbtöne verschoben; blasen/ziehen vor Bending vor Overblow), verschiebt die Melodie bei Bedarf um
Oktaven und bewertet alle 12 Harp-Tonarten (`rankHarpKeys`). `ui/harp-from-notes.js` hängt den Knopf
„Harp“ an jeden Notenabschnitt der Vorschau, zeigt Auswahl und Ergebnis und fügt es über `insertText`
(snippets.js) hinter `{end_of_abc}` ein – so bleibt Rückgängig im Editor möglich.

Noten holen (2.5): `core/musicxml.js` wandelt MusicXML (score-partwise) ohne fremde Bibliothek in ABC um –
`DOMParser`, eine Spur (die mit Liedtext), davon Stimme 1 und Notensystem 1; Längen relativ zu `L:1/8`,
Versetzungszeichen gegen Tonart und Takt gerechnet (MusicXML gibt die klingende Tonhöhe an), Akkordsymbole
aus `<harmony>`, Silben aus `<lyric number="1">` (gebundene Folgenoten ohne Silbe, wie beim Harp-Leser),
Balken aus `<beam>`, Zeilen nach `<print new-system>` oder je 4 Takte. `.mxl` packt `readMxl` aus (ZIP-
Verzeichnis lesen, `DecompressionStream('deflate-raw')`). `core/abc-import.js` trennt ABC-Stücke, räumt
den Kopf auf (`abcForSong`), erkennt Notentext (`looksLikeNotes`) und setzt den Abschnitt samt fehlender
Liedinfo in einem Schritt in den Text (`placeNotes`). `ui/notes-import.js` ist der Dialog; er ersetzt den
ganzen Editortext über `insertText`, damit ein Strg+Z alles zurücknimmt.

