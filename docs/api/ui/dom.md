# `src/ui/dom.js`

[← Übersicht](../README.md)

Kleine Hilfen für die Oberfläche – von allen ui-Modulen gemeinsam genutzt.

**Benutzt von:** [`app.js`](../app.md), [`books-ui.js`](../books-ui.md), [`live-ui.js`](../live-ui.md), [`play-mode.js`](../play-mode.md), [`print-ui.js`](../print-ui.md), [`pwa.js`](../pwa.md), [`setlist-ui.js`](../setlist-ui.md), [`settings-ui.js`](../settings-ui.md), [`sync-ui.js`](../sync-ui.md), [`ui/abo.js`](abo.md), [`ui/add-songs.js`](add-songs.md), [`ui/app-keys.js`](app-keys.md), [`ui/capo-help.js`](capo-help.md), [`ui/chord-filter.js`](chord-filter.md), [`ui/chord-tap.js`](chord-tap.md), [`ui/context-menus.js`](context-menus.md), [`ui/files.js`](files.md), [`ui/harp-from-notes.js`](harp-from-notes.md), [`ui/harp-help.js`](harp-help.md), [`ui/list-select.js`](list-select.md), [`ui/list.js`](list.md), [`ui/modes-ui.js`](modes-ui.md), [`ui/notes-import.js`](notes-import.md), [`ui/paste.js`](paste.md), [`ui/preview-tools.js`](preview-tools.md), [`ui/publish.js`](publish.md), [`ui/selection.js`](selection.md), [`ui/share-with.js`](share-with.md), [`ui/share.js`](share.md), [`ui/snippets.js`](snippets.md), [`ui/song-actions.js`](song-actions.md), [`ui/song.js`](song.md), [`ui/toolbar.js`](toolbar.md), [`ui/trash.js`](trash.md), [`ui/view.js`](view.md)

## Exportiert

### `$(sel, root = document)`

Erstes passendes Element (CSS-Selektor).

### `$$(sel, root = document)`

Alle passenden Elemente als Array.

### `el(tag, props = {}, ...children)`

Element mit Eigenschaften anlegen: el('li', { className: 'x', textContent: 'y' }, kind1, kind2)

### `textButton(text, onclick, className = '')`

Knopf mit Text: textButton('Öffnen', () => …, 'danger')

### `textSpan(className, text, small)`

Text mit optionaler kleiner zweiter Zeile: textSpan('book-name', 'Name', 'Google Drive')

### `isMobile()`

Schmale Ansicht (Handy): dieselbe Grenze wie in den CSS-Dateien.

### `isTyping(node)`

Steht der Cursor in einem Eingabefeld? (Dann keine Ein-Tasten-Kürzel.)

### `anyDialogOpen()`

Liegt etwas über der Hauptansicht (Dialog, Druckvorschau, Spielmodus)?

### `toast(msg, { action, onAction, ms = 3500 } = {})`

Kurze Meldung unten; optional mit Knopf (z. B. "Rückgängig").

### `ask(dialog)`

Dialog öffnen und auf die Antwort warten: den `value` des gedrückten Knopfes
(<button value="…"> in <form method="dialog">), bei Esc/Abbruch 'cancel'.
  const wahl = await ask('#dup-dialog');

### `async askConfirm(title, opts = {})`

Rückfrage im Stil der App (statt confirm()).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `title` | `string` | z. B. „„Band“ entfernen?“ |
| `[opts]` | `{text?: string, ok?: string, danger?: boolean}` | ok: Beschriftung des Knopfs |

**Rückgabe:** `Promise<boolean>`

### `async askText(title, value = '', opts = {})`

Text abfragen im Stil der App (statt prompt()).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `title` | `string` |  |
| `[value]` | `string` | Vorgabe |
| `[opts]` | `{text?: string, ok?: string}` |  |

**Rückgabe:** `Promise<string|null>` null bei Abbrechen

### `primaryButtonFor(node)`

Der Hauptknopf (.primary), der zu einem Element im Dialog gehört: der nächstgelegene sichtbare
und nicht gesperrte – im Cloud-Dialog z. B. „Anlegen“ beim Namensfeld, sonst „Verbinden“ unten.

### `closeOnBackdrop(...dialogs)`

Klick auf den abgedunkelten Rand neben dem Dialog schließt ihn.

### `download(name, data, type = 'text/plain')`

Datei herunterladen (Text oder Blob).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `askDialog({ title, text = '', ok = 'OK', input = null })` – Gemeinsamer kleiner Dialog für askConfirm/askText vorbereiten und auf die Antwort warten.
