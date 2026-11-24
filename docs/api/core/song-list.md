# `src/core/song-list.js`

[← Übersicht](../README.md)

Liederliste: Sortierung und Erkennen doppelter Lieder.

**Benutzt:** [`core/text.js`](text.md)  
**Benutzt von:** [`core/song-copy.js`](song-copy.md), [`ui/add-songs.js`](../ui/add-songs.md), [`ui/list.js`](../ui/list.md)

## Exportiert

### `SORT_MODES`

`= {`

### `sortSongs(songs, mode = 'title', played = {}, reverse = false)`

Lieder sortieren (neues Array).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` |  | Liste aus repo.list() |
| `mode` |  | title \| artist \| updated \| played |
| `played` |  | Lied-ID -> Zeitpunkt (ISO oder ms) des letzten Spielens |
| `reverse` |  | umgekehrt (Z–A bzw. älteste zuerst); Lieder ohne Titel/Interpret bzw. nie gespielte bleiben am Ende |

### `sortDirectionLabel(mode, reverse = false)`

Beschriftung der Sortierrichtung: „A–Z“/„Z–A“ (Titel, Interpret) bzw. „neueste zuerst“/„älteste zuerst“.

**Rückgabe:** `string`

### `letterOf(text)`

Anfangsbuchstabe für Zwischenüberschriften der Liste ("#" für Ziffern, Zeichen, leer).

### `songKey(text)`

Titel/Interpret vergleichbar machen: klein, ohne Akzente, Satzzeichen und Klammerzusätze.

### `findDuplicates(songs, { title, artist })`

Vorhandene Lieder mit gleichem Titel (und, falls beide einen haben, gleichem Interpreten).

**Rückgabe:** `object[]` Treffer aus songs

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `sortForward(songs, mode, played)`
