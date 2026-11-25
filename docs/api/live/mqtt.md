# `src/live/mqtt.js`

[← Übersicht](../README.md)

Kleiner MQTT-3.1.1-Client über WebSocket – genau so viel, wie der Live-Modus braucht: verbinden, abonnieren, senden (QoS 0, optional „retain“ = Server hebt die letzte Nachricht auf), Lebenszeichen und automatisches Neuverbinden. Eine fertige Bibliothek wäre rund zehnmal so groß.

Die Paket-Funktionen (encode…/parse…) sind rein und getestet (tests/live.test.js).

**Benutzt von:** [`live/live.js`](live.md), [`sync/invite-box.js`](../sync/invite-box.md)

## Exportiert

### `encodeLength(n)`

Restlänge als MQTT-Zahl (7 Bit je Byte, oberstes Bit = es folgt noch eins).

### `decodeLength(bytes, offset)`

Restlänge lesen; null, wenn die Bytes dafür noch nicht da sind.

### `encodeConnect(clientId, keepAlive = 60)`

CONNECT mit „clean session“.

### `encodeSubscribe(packetId, topic)`

SUBSCRIBE auf ein Thema (QoS 0).

### `encodePublish(topic, payload, retain = false)`

PUBLISH (QoS 0); payload: Uint8Array. Leere Nutzlast mit retain löscht die aufgehobene Nachricht.

### `PINGREQ`

`= new Uint8Array([TYPE.PINGREQ << 4, 0])`

### `DISCONNECT`

`= new Uint8Array([TYPE.DISCONNECT << 4, 0])`

### `parsePackets(buf)`

Vollständige Pakete aus einem Puffer lösen (ein WebSocket-Rahmen kann mehrere oder halbe enthalten).

**Rückgabe:** `{packets: {type: number, flags: number, body: Uint8Array}[], rest: Uint8Array}`

### `parsePublish(flags, body)`

PUBLISH-Inhalt (QoS 0 oder 1/2 – die Paket-ID wird übersprungen).

### `class MqttClient extends EventTarget`

Verbindung zu einem MQTT-Server über WebSocket, verbindet sich bei Abbruch selbst neu.
Ereignisse: 'state' (detail: 'connecting' | 'open' | 'closed'), 'message' (detail: {topic, payload, retain}).

#### `new MqttClient(url, { clientId = `lb-${Math.random()`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `url` | `string` | z. B. wss://broker.example.org:8884/mqtt |

#### `connect()`

Verbinden (und bei Abbruch selbst wieder verbinden, bis close()).

#### `retryNow()`

Abgebrochene Verbindung sofort neu versuchen (z. B. Handy wieder wach, Netz wieder da).

#### `subscribe(topic)`

Thema abonnieren (gilt auch nach jedem Neuverbinden).

#### `publish(topic, payload, { retain = false } = {})`

Senden; ohne Verbindung wird nichts gepuffert (false).

#### `close()`

Verbindung beenden (kein Neuverbinden mehr).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `packet(first, body)`
