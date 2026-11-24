# `src/ui/shortcuts.js`

[← Übersicht](../README.md)

Alle Tastenkürzel an einer Stelle: Daraus entstehen die Tasten-Abfrage (app-keys.js, play-mode.js) und die Übersicht im Dialog „Tastenkürzel“. Wer ein Kürzel ändert, ändert es nur hier (und im README).

keys:  was gedrückt wird – 'Mod+k' (Strg bzw. ⌘), 'Alt+s', 'f', '+', 'PageDown', ' ' (Leertaste) …

```text
       Buchstaben ohne Rücksicht auf Groß-/Kleinschreibung.
```

show:  so steht es in der Übersicht (Tasten durch Leerzeichen getrennt, '/' für „oder“) id:    Name der Aktion; null = wird woanders erledigt und steht nur in der Übersicht song:  nur wenn ein Lied geöffnet ist

**Benutzt von:** [`play-mode.js`](../play-mode.md), [`ui/app-keys.js`](app-keys.md), [`ui/snippets.js`](snippets.md)

## Exportiert

### `SHORTCUTS`

`= {`

### `shortcutLabel(list, id)`

Anzeige des ersten Kürzels zu einer Aktion (z. B. 'Alt+S') oder ''.

### `keyMatches(e, spec)`

Passt der Tastendruck zu 'Mod+k', 'Alt+s', 'f', 'PageDown' …?

### `findShortcut(e, list)`

Erstes Kürzel aus der Liste, das zum Tastendruck passt (oder null).

### `shortcutTable(list)`

Tabelle für die Übersicht (nur Einträge mit show).
