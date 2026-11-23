# `src/print-ui.js`

[← Übersicht](README.md)

Druckdialog (Auswahl + Optionen) und Druckvorschau.

Alle Optionen stehen im Dialog „Optionen …“. Mit 📌 lässt sich jede davon als Schnellwahl in die Leiste über der Vorschau heften (siehe print/print-quick.js); Änderungen dort setzen die Vorschau sofort neu.

**Benutzt:** [`context-menu.js`](context-menu.md), [`core/meta-edit.js`](core/meta-edit.md), [`print/print-fonts.js`](print/print-fonts.md), [`print/print-quick.js`](print/print-quick.md), [`print/songbook.js`](print/songbook.md), [`settings/settings.js`](settings/settings.md), [`storage/repository.js`](storage/repository.md), [`ui/app-state.js`](ui/app-state.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupPrint({ repo, beforeOpen })`

Druckdialog und Druckvorschau einrichten.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `opts` | `{repo: object, beforeOpen?: () => Promise<void>}` | beforeOpen: z. B. Ungespeichertes sichern |

**Rückgabe:** `{printSongs: (list: object[], opts?: object) => Promise<void>}` feste Auswahl direkt in die Vorschau

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `loadOwn()`
- `loadOptions()` – Papier, Spalten und Rand kommen aus den gemeinsamen Einstellungen,
