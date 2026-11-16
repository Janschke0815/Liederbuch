# `src/setlist-ui.js`

[← Übersicht](README.md)

Setlisten in der linken Spalte: Übersicht, Bearbeiten (Reihenfolge, Notiz, eigene Transposition), Spielen und Drucken in Setlisten-Reihenfolge.

**Benutzt:** [`context-menu.js`](context-menu.md), [`prefs.js`](prefs.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupSetlists({ repo, sets, getCurrentId, openSong, play, printSongs, toast })`

Setlisten-Reiter in der Liste einrichten (Übersicht, Bearbeiten, Spielen, Drucken).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `{{repo, sets, getCurrentId: () => string\|null, openSong: (id) => Promise<void>,` |  | play, printSongs: (songs, options) => Promise<void>, toast: Function}} opts |
