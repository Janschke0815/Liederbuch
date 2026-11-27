# `src/play-mode.js`

[← Übersicht](README.md)

Spielmodus: Vollbild nur mit dem Lied, automatisches Scrollen, Bildschirm bleibt an, Blättern per Tastatur oder Bluetooth-Fußpedal (die senden Bild-/Pfeiltasten).

Tasten: siehe SHORTCUTS.play in ui/shortcuts.js. Rechnungen (Tempo, Doppelseiten) in core/play-scroll.js, gemerkte Werte (Schrift, Tempo pro Lied …) über prefs.js.

**Benutzt:** [`core/chordpro.js`](core/chordpro.md), [`core/harp-transpose.js`](core/harp-transpose.md), [`core/play-scroll.js`](core/play-scroll.md), [`metronome.js`](metronome.md), [`prefs.js`](prefs.md), [`render/abc-view.js`](render/abc-view.md), [`render/song-view.js`](render/song-view.md), [`settings/settings.js`](settings/settings.md), [`ui/dom.js`](ui/dom.md), [`ui/shortcuts.js`](ui/shortcuts.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupPlayMode({ repo, getSongIds, onClose })`

Spielmodus einrichten (Vollbild, automatisches Scrollen, Pedal).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `opts` | `{repo, getSongIds: () => Promise<string[]>, onClose: (id: string) => void}` | getSongIds: Reihenfolge zum Blättern (aktuelle Liste bzw. später Setliste) |

### `durationSeconds`

Weitergereicht (für bestehende Aufrufer).
