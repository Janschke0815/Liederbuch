# `src/formats/file-import.js`

[← Übersicht](../README.md)

Erkennt, was in einer geöffneten Datei steckt. Reine Funktionen, kein DOM.

```text
  - Liederbuch-Sicherung (.json)
  - ChordPro (.cho, .chordpro, .pro, .crd …), auch mehrere Lieder mit {new_song}
  - Akkorde-über-Text (.txt aus Ultimate Guitar o. ä.) -> wird umgewandelt
```

**Benutzt:** [`core/chords.js`](../core/chords.md), [`formats/ug-import.js`](ug-import.md)  
**Benutzt von:** [`formats/paste-import.js`](paste-import.md), [`ui/files.js`](../ui/files.md)

## Exportiert

### `looksLikeChordPro(text)`

Ist der Text schon ChordPro (Direktiven wie {title:} oder [Akkorde] im Text)?

### `splitChordProSongs(text)`

Mehrere Lieder in einer Datei trennen (bei jedem neuen {title:} bzw. Linie „---“).

**Rückgabe:** `string[]`

### `parseImportFile(fileName, text)`

Eine geöffnete Datei erkennen: Sicherung (JSON) oder ein bzw. mehrere Lieder (ChordPro oder Akkorde-über-Text).

**Rückgabe:** `{kind: 'backup', data: object} | {kind: 'songs', songs: string[]}`

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `baseName(fileName)`
- `hasTitle(chordpro)`
