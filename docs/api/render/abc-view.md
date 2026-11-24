# `src/render/abc-view.js`

[← Übersicht](../README.md)

Notenabschnitte zeichnen und abspielen (abcjs). renderSong legt nur Platzhalter an (<div class="abc-score" data-abc=…>); renderScores füllt sie. abcjs wird erst geladen, wenn ein Lied wirklich Noten hat – sonst kostet es keine Ladezeit.

Jede Notenzeile ist ein eigenes Bild (oneSvgPerLine, Klasse „atomic“): So bricht der Druck (print/paginate.js) zwischen zwei Notenzeilen um, nie mitten durch eine.

**Benutzt von:** [`play-mode.js`](../play-mode.md), [`print/songbook.js`](../print/songbook.md), [`ui/song.js`](../ui/song.md)

## Exportiert

### `stopAbc()`

Laufende Melodie anhalten (Liedwechsel, Spielmodus verlassen).

### `async renderScores(root, { follow = true } = {})`

Alle Notenabschnitte in root zeichnen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `root` | `ParentNode` |  |
| `[opts]` | `{follow?: boolean}` | follow: bei geänderter Breite neu umbrechen (Vorschau, Spielmodus) – im Druck nicht nötig |

**Rückgabe:** `Promise<void>` erfüllt, sobald alles gezeichnet ist (wichtig für den Druck)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `fontOf(family, sizePx, bold = false)` – Schrift für abcjs aus dem CSS (Liedtext- bzw. Akkordschrift der Einstellungen).
- `cssPx(value, fallback)` – CSS-Größe („10.5pt“, „14px“, „1.1em“) in Pixel.
- `draw(abcjs, score)`
- `addPlayButton(abcjs, score)` – ▶ am Abschnittsnamen: Melodie abspielen, die gerade klingende Note markieren.
- `async play(abcjs, score, btn)`
