# `src/live/live-crypto.js`

[← Übersicht](../README.md)

Raum-Code und Verschlüsselung für den Live-Modus.

Der Raum-Code (8 Zeichen, z. B. „K7MQ-2XPA“) ist zugleich das Geheimnis: Aus ihm werden das Thema auf dem Vermittlungs-Server und der AES-Schlüssel abgeleitet. Der Server sieht nur ein zufällig wirkendes Thema und verschlüsselte Bytes – weder Code noch Lied.

**Benutzt von:** [`live-ui.js`](../live-ui.md), [`live/live.js`](live.md), [`sync/invite-box.js`](../sync/invite-box.md)

## Exportiert

### `newCode()`

Neuer zufälliger Raum-Code (8 Zeichen, ~40 Bit).

### `normalizeCode(input)`

Eingabe säubern („k7mq 2xpa“, „K7MQ-2XPA“ → „K7MQ2XPA“); null, wenn es kein gültiger Code ist.

### `formatCode(code)`

„K7MQ2XPA“ → „K7MQ-2XPA“

### `async deriveRoom(code)`

Thema und Schlüssel zu einem Raum-Code.

**Rückgabe:** `Promise<{topic: string, key: CryptoKey}>`

### `async seal(key, obj)`

Objekt verschlüsseln → Bytes (12 Byte Zufallswert + AES-GCM).

### `async unseal(key, bytes)`

Bytes entschlüsseln → Objekt; wirft bei falschem Schlüssel oder veränderten Daten.
