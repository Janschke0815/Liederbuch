# `src/sync/invite-box.js`

[← Übersicht](../README.md)

Einladungs-Briefkasten: Wer jemanden zu einem gemeinsamen Liederbuch (Google Drive) einlädt, legt zusätzlich eine kleine Nachricht auf den Vermittlungs-Servern des Live-Modus ab. Die App der eingeladenen Person schaut beim Start für ihre Google-Adresse(n) nach und zeigt die Einladung – ohne Link aus einer E-Mail. (Die Datei einmal in der Google-Auswahl bestätigen muss man trotzdem: Erst dann darf die App sie lesen.)

Thema und Schlüssel kommen aus der E-Mail-Adresse (PBKDF2): Der Server sieht weder Adresse noch Liederbuch. Je Liederbuch ein eigenes Unterthema, aufgehoben mit „retain“; abgeholt wird mit „+“. Wer die Adresse kennt, kann die Nachricht lesen – darin stehen nur Name, Absender und Datei-ID.

```text
  Thema liederbuch/invite/<aus E-Mail>/<aus Datei-ID>
  Nachricht (verschlüsselt) { v: 1, t: 'invite', fileId, name, from, role, at }
```

**Benutzt:** [`live/live-crypto.js`](../live/live-crypto.md), [`live/live.js`](../live/live.md), [`live/mqtt.js`](../live/mqtt.md)  
**Benutzt von:** [`sync-ui.js`](../sync-ui.md)

## Exportiert

### `INVITE_MAX_AGE_MS`

`= 60 * 24 * 3600 * 1000`

Einladungen älter als das werden nicht mehr gezeigt (und weggeräumt).

### `normalizeEmail(email)`

E-Mail-Adresse vereinheitlichen (Groß/Klein, Leerzeichen; bei Gmail ohne Punkte im Namen).

### `async inviteBox(email)`

Briefkasten einer Adresse: Themen-Anfang und Schlüssel.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `email` | `string` |  |

**Rückgabe:** `Promise<{base: string, key: CryptoKey}>`

### `async inviteTopic(base, fileId)`

Unterthema für ein Liederbuch (aus der Datei-ID, damit der Server sie nicht sieht).

### `async withBrokers(fn, { brokers = BROKERS, waitMs = 6000, lingerMs = 400, Client = MqttClient } = {})`

Mit allen Servern verbinden, fn für jede offene Verbindung ausführen, dann trennen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `fn` | `(client: MqttClient) => void` |  |
| `opts` | `{brokers?: string[], waitMs?: number, lingerMs?: number, Client?: typeof MqttClient}` | waitMs: so lange auf Verbindungen warten; lingerMs: danach noch offen bleiben (Nachrichten empfangen) |

**Rückgabe:** `Promise<number>` Anzahl erreichter Server

### `async postInvite({ email, fileId, name, from = '', role = 'writer' }, opts = {})`

Einladung in den Briefkasten der eingeladenen Person legen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `invite` | `{email: string, fileId: string, name: string, from?: string, role?: string}` |  |
| `[opts]` | `object` | wie withBrokers |

**Rückgabe:** `Promise<boolean>` mindestens ein Server hat sie angenommen

### `async clearInvite(email, fileId, opts = {})`

Einladung wegräumen (angenommen, abgelehnt oder zurückgenommen).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `email` | `string` |  |
| `fileId` | `string` |  |
| `[opts]` | `object` | wie withBrokers |

### `async fetchInvites(emails, opts = {})`

Briefkästen nachsehen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `emails` | `string[]` | eigene Google-Adressen auf diesem Gerät |
| `[opts]` | `object` | wie withBrokers (lingerMs: wie lange auf aufgehobene Nachrichten gewartet wird) |

**Rückgabe:** `Promise<{email: string, fileId: string, name: string, from: string, role: string, at: number}[]>` neueste zuerst, je Liederbuch einmal, ohne abgelaufene
