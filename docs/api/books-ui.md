# `src/books-ui.js`

[← Übersicht](README.md)

Liederbücher: Auswahl in der Kopfleiste (mit Optionen per Rechtsklick), Dialog „Liederbücher“ (Liste, Umbenennen, Entfernen, Abo-Angaben) und „Neues Liederbuch“. Der Abgleich mit der Cloud steht in sync-ui.js – das richtet diesen Teil ein und reicht über `cloud` herein, was es dafür braucht.

**Benutzt:** [`books.js`](books.md), [`context-menu.js`](context-menu.md), [`prefs.js`](prefs.md), [`storage/repository.js`](storage/repository.md), [`storage/stores.js`](storage/stores.md), [`sync/book-name.js`](sync/book-name.md), [`sync/book-settings.js`](sync/book-settings.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`sync-ui.js`](sync-ui.md)

## Exportiert

### `setupBooks({ book, repo, toast, beforeSync, beforeSwitch, leaveAbo, refreshAbo, cloud })`

Liederbuch-Auswahl und -Verwaltung einrichten.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `opts` | `object` |  |
| `opts.book` | `object` | das geöffnete Liederbuch |
| `opts.repo` | `object` | seine Lieder (für „Lieder übernehmen“) |
| `opts.toast` | `Function` |  |
| `[opts.beforeSync]` | `() => Promise<void>` | Ungespeichertes sichern (vor „Neues Liederbuch“) |
| `[opts.beforeSwitch]` | `() => Promise<void>` | Ungespeichertes sichern (vor dem Wechsel) |
| `[opts.leaveAbo]` | `(b: object) => boolean` | Abo beenden (ui/abo.js) |
| `[opts.refreshAbo]` | `(o: {quiet: boolean}) => Promise<void>` | Abo aktualisieren (ui/abo.js) |
| `{{openDialog: Function, leaveBook: Function, renamed: (name: string) => void, stop: Function,` |  | join: (fileId?: string) => void, pendingJoin: () => string\|null, googleReady: () => boolean}} opts.cloud Cloud-Teil (sync-ui.js): Dialog öffnen, gemeinsames Buch verlassen, Umbenennung abgleichen, Abgleich anhalten, Einladung öffnen, offene Einladung, Google eingerichtet? |

**Rückgabe:** `{open: (o?: {create?: boolean}) => void, openNew: (o?: {where?: string, copy?: boolean}) => void` refresh: () => void, switchTo: (id: string) => Promise<void>}}

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `whereOf(b)` – Wo ein Liederbuch abgeglichen wird, kurz (für die Liste).
- `webdavFolderFor(baseUrl, name)` – WebDAV-Ordner für ein neues Buch: neben dem Ordner des Vorbilds, benannt nach dem Buch.
