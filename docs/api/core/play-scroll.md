# `src/core/play-scroll.js`

[← Übersicht](../README.md)

Rechnungen für den Spielmodus – ohne Bildschirmzugriff, damit sie sich testen lassen. Positionen sind Pixel: einspaltig senkrecht (scrollTop), zweispaltig waagerecht (scrollLeft).

**Benutzt von:** [`play-mode.js`](../play-mode.md)

## Exportiert

### `DEFAULT_SECONDS`

`= 180`

angenommene Liedlänge ohne {duration}

### `durationSeconds(value)`

"3:20" oder "200" -> Sekunden (sonst null).

### `songSeconds(duration)`

Liedlänge in Sekunden ({duration} oder 3 Minuten).

### `pixelsPerSecond(travel, duration)`

Grundgeschwindigkeit beim einspaltigen Scrollen: Der Text läuft in der Liedlänge einmal durch.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `travel` |  | Strecke in Pixeln, die gescrollt werden muss |

### `pageCount(max, w)`

Zweispaltig: Doppelseiten bei 0, w, 2w … – die letzte kann nur halb gefüllt sein und endet bei max.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `max` |  | größte Scroll-Position |
| `w` |  | Breite einer Doppelseite |

### `pageIndex(pos, max, w)`

Welche Doppelseite gerade sichtbar ist (0 = erste).

### `pagePos(i, max, w)`

Scroll-Position der Doppelseite i (begrenzt auf vorhandene Seiten).

### `snapPos(pos, max, w)`

Nächste Doppelseite zu einer beliebigen Position.

### `secondsPerPage(duration, pages, speed)`

Sekunden pro Doppelseite beim automatischen Umblättern.
