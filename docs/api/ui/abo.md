# `src/ui/abo.js`

[← Übersicht](../README.md)

Abonnierte Liederbücher: per Einladungslink abonnieren, regelmäßig aktualisieren, beenden – und einzelne Lieder ins eigene Liederbuch kopieren. Ein Abo ist ein eigenes Liederbuch (eigene Datenbank), nur zum Lesen (siehe readOnly in app-state.js).

**Benutzt:** [`books.js`](../books.md), [`core/song-list.js`](../core/song-list.md), [`formats/abo.js`](../formats/abo.md), [`prefs.js`](../prefs.md), [`storage/repository.js`](../storage/repository.md), [`storage/setlists.js`](../storage/setlists.md), [`storage/stores.js`](../storage/stores.md), [`sync/abo-client.js`](../sync/abo-client.md), [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md)  
**Benutzt von:** [`app.js`](../app.md), [`ui/context-menus.js`](context-menus.md)

## Exportiert

### `openSubscribe(link = '')`

Dialog „Liederbuch abonnieren“ öffnen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[link]` | `string` | Einladungslink (sonst trägt man ihn ein) |

### `refreshAbo({ quiet = true } = {})`

Neuen Stand holen (nur, wenn sich die Datei geändert hat).

### `leaveAbo(entry = book)`

Abo auf diesem Gerät beenden (nach Rückfrage): Eintrag, Stand und Lieder löschen. War es geöffnet,
geht es zurück zu „Mein Liederbuch“.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `[entry]` | `object` | Liederbuch-Eintrag aus books.js (sonst das geöffnete Abo) |

**Rückgabe:** `boolean` beendet?

### `startAbo()`

Beim Start: Einladungslink prüfen und – in einem Abo – den neuesten Stand holen.

### `async copyToPersonal(songs)`

Lieder aus dem Abo nach „Mein Liederbuch“ kopieren (dort bearbeitbar). Schon vorhandene
(gleicher Titel und Interpret) werden übersprungen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` | `object[]` | Datensätze aus dem Abo |

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async storeAbo(songRepo, setRepo, data)` – Stand eines Abos in seine Datenbank schreiben.
- `setStatus(text, warn = false)`
- `async check()` – Vorschau: laden und anzeigen, was abonniert würde.
- `async checkAboHash()` – Einladungslink geöffnet: <App>#abo=…
- `renderBar()`
