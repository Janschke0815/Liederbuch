# `src/core/chord-shapes.js`

[← Übersicht](../README.md)

Gitarrengriffe (Standardstimmung EADGBE) für Griffbilder und die Capo-Hilfe.

Ein Griff: frets = 6 Werte von tiefer E- bis hoher e-Saite; -1 = nicht anschlagen, 0 = leer. Bekannte offene Griffe stehen in OPEN; alles andere wird aus den verschiebbaren Barré-Formen (E-Form: Grundton auf der 6. Saite, A-Form: auf der 5. Saite) berechnet.

**Benutzt:** [`core/chords.js`](chords.md)  
**Benutzt von:** [`core/capo.js`](capo.md), [`core/playable.js`](playable.md), [`render/chord-diagram.js`](../render/chord-diagram.md)

## Exportiert

### `chordType(quality)`

Akkordtyp vereinheitlichen; null = (noch) kein Griff bekannt.

### `chordShape(name)`

Griff zu einem Akkordnamen (Bass bei Slash-Akkorden wird ignoriert).

**Rückgabe:** `{frets: number[], open: boolean} | null`

### `isEasyChord(name)`

Ist der Griff ohne Barré zu spielen? (Slash-Bass zählt nicht)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `place(shape, r)`
- `span(frets)` – Spannweite eines Griffs in Bünden (gegriffene Saiten).
