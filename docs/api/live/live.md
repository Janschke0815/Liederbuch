# `src/live/live.js`

[← Übersicht](../README.md)

Live-Raum: Der Vorsinger schickt das aktuelle Lied (Text + Tonart), alle Mitsinger bekommen es.

Transport: öffentliche MQTT-Server (zwei parallel, falls einer ausfällt). Die letzte Lied-Nachricht wird dort aufgehoben („retain“), so sehen später Dazukommende sofort das aktuelle Lied. Alles ist mit dem Schlüssel aus dem Raum-Code verschlüsselt (live-crypto.js).

Nachrichten (verschlüsselt):

```text
  Thema <topic>     { v: 1, t: 'song', from, seq, song: { chordpro }, transpose, accidentals }
                    { v: 1, t: 'end', from, seq }
  Thema <topic>/p   { v: 1, t: 'here', from }   Mitsinger melden sich alle 20 s (Zähler beim Vorsinger)
```

**Benutzt:** [`live/live-crypto.js`](live-crypto.md), [`live/mqtt.js`](mqtt.md)  
**Benutzt von:** [`live-ui.js`](../live-ui.md)

## Exportiert

### `BROKERS`

`= ['wss:`

Öffentliche Vermittlungs-Server (WebSocket über TLS).

### `isNewer(last, msg)`

Ist msg neuer als die zuletzt angenommene Nachricht? (Beide Server liefern jede Nachricht.)
Gleicher Absender: höhere Nummer. Anderer Absender (Vorsinger hat neu geladen): späterer Zeitpunkt.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `last` | `{from: string, seq: number} \| null` |  |

### `class LiveRoom extends EventTarget`

Raum betreten. role 'lead': senden; 'follow': empfangen.
Ereignisse: 'status' (detail: 'connecting' | 'online' | 'offline'), 'song' (detail: Nachricht),
            'end', 'listeners' (detail: Anzahl Mitsinger, nur beim Vorsinger)

#### `new LiveRoom(code, role, { brokers = BROKERS } = {})`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `code` | `string` | Raum-Code (normalisiert) |

#### `async start()`

Verbinden.

#### `async sendSong({ chordpro, transpose = 0, accidentals = 'auto' })`

Vorsinger: Lied an alle schicken (wird auf den Servern für Nachzügler aufgehoben).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `s` | `{chordpro: string, transpose?: number, accidentals?: string}` |  |

#### `async stop()`

Raum verlassen; der Vorsinger beendet ihn für alle.
