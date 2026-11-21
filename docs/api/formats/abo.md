# `src/formats/abo.js`

[← Übersicht](../README.md)

Abo-Datei: ein Liederbuch, das jemand für einen privaten Kreis veröffentlicht. Andere abonnieren es (nur lesen) und bekommen Änderungen automatisch.

Die Datei ist nicht verschlüsselt – geschützt wird sie durch den Ort: Sie gehört in einen Ordner, an den nur die Gruppe herankommt (z. B. WebDAV-Ordner der NAS mit Anmeldung). Liegt sie unter einer offenen Adresse, kann jeder sie lesen, der die Adresse kennt – das wäre bei geschützten Liedern eine öffentliche Zugänglichmachung (§ 19a UrhG).

Einladungslink:  <App>#abo=<Adresse der Datei>

Datei (JSON, lesbar):

```text
  { format: 'liederbuch-abo', version: 1, name, publisher, description, rights: 'privat',
    publishedAt, songs: [{ id, chordpro, transpose, accidentals, createdAt, updatedAt }],
    setlists: [{ id, name, items, … }] }
  transpose/accidentals (seit 2.1): Transposition und ♯/♭-Schreibweise des Herausgebers. Ältere
  Abo-Dateien haben sie nicht; ältere App-Fassungen lesen neue Dateien weiter (Felder werden übergangen).
```

Reine Funktionen, kein DOM.

**Benutzt:** [`formats/file-format.js`](file-format.md)  
**Benutzt von:** [`sync/abo-client.js`](../sync/abo-client.md), [`ui/abo.js`](../ui/abo.md), [`ui/publish.js`](../ui/publish.md)

## Exportiert

### `ABO_FORMAT`

`= 'liederbuch-abo'`

### `ABO_VERSION`

`= 1`

### `ABO_EXT`

`= '.json'`

### `buildAboPayload(songs, setlists, meta, now = new Date()`

Inhalt eines Abos zusammenstellen (was Abonnenten brauchen: Lieder mit Transposition und
Schreibweise – aber keine Notizen).

| Parameter | Typ | Bedeutung |
|---|---|---|
| `songs` | `object[]` | Lieder (Datensätze aus dem Repository) |
| `setlists` | `object[]` | Setlisten, die mitgehen (Einträge auf nicht enthaltene Lieder fallen weg) |
| `meta` | `{name: string, publisher?: string, description?: string}` |  |
| `[now]` | `string` |  |

### `aboToText(payload)`

Inhalt -> Text der Abo-Datei (eingerückt, Windows-Zeilenenden, wie die übrigen Dateien).

### `parseAbo(text)`

Text einer Abo-Datei lesen und prüfen.
@throws {Error} verständliche Meldung (keine Abo-Datei, neuere Version, beschädigt)

| Parameter | Typ | Bedeutung |
|---|---|---|
| `text` | `string` |  |

**Rückgabe:** `object` Inhalt wie buildAboPayload

### `randomFilePart()`

Zufälliger, nicht erratbarer Teil für Dateinamen (falls die Datei unter einer offenen Adresse liegt).

### `aboLink(appUrl, fileUrl)`

Einladungslink: <App>#abo=<Adresse>

### `parseAboLink(text)`

Einladungslink bzw. dessen Teil hinter „#“ lesen – oder eine nackte Adresse der Datei.

**Rückgabe:** `string | null` Adresse der Abo-Datei
