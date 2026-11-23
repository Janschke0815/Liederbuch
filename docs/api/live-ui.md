# `src/live-ui.js`

[← Übersicht](README.md)

Live-Modus: Dialog (Vorsingen / Mitsingen), „LIVE“-Anzeige in der Kopfleiste, Mitsinger-Ansicht im Spielmodus. Verbindung und Verschlüsselung: live/live.js, live/live-crypto.js.

Vorsinger: Jedes Lied, das er öffnet oder im Spielmodus zeigt (auch Änderungen und Tonart), geht an alle. Der Raum-Code bleibt beim Neuladen erhalten (sessionStorage 'liveLead'). Mitsinger: Beitritt per Link „…#live=CODE“ (QR-Code) oder Code-Eingabe; das Lied erscheint im Spielmodus, mit eigener Zusatz-Tonart und „Übernehmen“ ins eigene Liederbuch.

**Benutzt:** [`core/chordpro.js`](core/chordpro.md), [`live/live-crypto.js`](live/live-crypto.md), [`live/live.js`](live/live.md), [`ui/app-state.js`](ui/app-state.md), [`ui/dom.js`](ui/dom.md)  
**Benutzt von:** [`app.js`](app.md)

## Exportiert

### `setupLive()`

Live-Modus einrichten (nach setupPlayMode, braucht services.play).
