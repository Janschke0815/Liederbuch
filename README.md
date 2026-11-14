# Liederbuch (PWA)

Persönliches Gitarren-Liederbuch. Lieder werden als ChordPro gespeichert.

## Starten

Kein Build-Schritt nötig, nur ein einfacher Webserver:

    python tools/serve.py

- App: http://localhost:5173/
- Tests: http://localhost:5173/tests/
- Druck-Demo mit Beispielliedern: http://localhost:5173/tests/print-demo.html (`?columns=2&paper=A5&chorus=indent`)

## Installieren und offline nutzen

Die App ist eine PWA: Nach dem ersten Öffnen funktioniert sie komplett ohne Internet.
Lieder liegen lokal im Browser (IndexedDB), App-Dateien im Cache des Service Workers.

- **Windows/Mac (Chrome, Edge):** Knopf „App installieren“ in der Werkzeugleiste
  oder das Installieren-Symbol in der Adressleiste.
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone/iPad (Safari):** Teilen → „Zum Home-Bildschirm“.

Für Handy und Tablet muss die App über **HTTPS** erreichbar sein (localhost geht nur am
selben Rechner). Da es keinen Build-Schritt gibt, reicht es, diesen Ordner auf einen
beliebigen statischen Webspace zu legen, z. B. GitHub Pages oder Netlify (Ordner per
Drag & Drop hochladen). Der Ordner `tests/` und `tools/` werden dafür nicht gebraucht.

Jedes Gerät hat sein eigenes Liederbuch. Übertragen: auf Gerät A „Sichern“, auf Gerät B
„Datei öffnen …“ (wird zusammengeführt, neuere Fassung gewinnt).

Updates: Der Service Worker lädt bei Verbindung immer die aktuelle Version („Netz zuerst“)
und fällt nur offline oder bei sehr langsamem Netz (> 3,5 s) auf den Cache zurück.

## Bedienung

- **Rechtsklick** (Handy/Tablet: **lange drücken**) öffnet überall passende Optionen:
  - Lied in der Liste: Öffnen, Bearbeiten, Spielen, zur Setliste hinzufügen (auch neue),
    Duplizieren, Teilen, Drucken/PDF, Löschen
  - Vorschau: Transponieren, Originaltonart, Schreibweise, Capo-Hilfe, Spielen, Griffbilder,
    Größe, zur Setliste, Teilen, Drucken
  - Setliste: Öffnen, Spielen, Duplizieren, Löschen; Eintrag: Ab hier spielen, Verschieben,
    Notiz & Transposition, Entfernen
  - Menüs lassen sich auch mit der Tastatur bedienen (Menütaste / Umschalt+F10, Pfeile, Enter, Esc).
- **Doppelklick** auf ein Lied startet den Spielmodus, **Entf** löscht das markierte Lied (mit Rückgängig).
- **Editor ein-/ausblenden** (Symbol links über der Vorschau): nur Liste und Lied, z. B. zum Spielen.
- **Bausteine** über dem Editor: Akkord, Strophe, Refrain, Bridge, Refrain wiederholen, Hinweis. Markierter Text wird eingeschlossen.
- **Dateien** einfach ins Fenster ziehen, um sie zu importieren.
- **Löschen** lässt sich in der Meldung unten rückgängig machen.

| Taste | Wirkung |
|---|---|
| Strg+K | Suchen |
| ↑ / ↓ in der Liste | vorheriges / nächstes Lied |
| + / − | Halbton höher / tiefer (außerhalb des Editors) |
| Strg+E | Editor ein-/ausblenden |
| Strg+S | sofort speichern (sonst automatisch) |
| Strg+P | Drucken |
| F | Spielmodus |
| M | Metronom an/aus |

## Einfügen aus Ultimate Guitar & Co.

Text einfach mit **Strg+V** irgendwo in die App einfügen (oder Menü → Text einfügen). Erkannt
werden:

- **Titel und Interpret** aus der Kopfzeile: „Wonderwall Chords by Oasis“, „Oasis – Wonderwall“,
  „Title: … / Artist: …“ oder zwei kurze Zeilen über dem Lied. Die Felder im Dialog
  überschreiben die Erkennung.
- **Füllwerk** der Webseite („Difficulty: …“, „Author …“) fällt weg; Capo, Tonart, Takt, Tempo
  werden übernommen.
- **Mehrere Lieder auf einmal**: getrennt durch eine Linie `---` oder eine neue
  „… Chords by …“-Zeile – der Dialog zeigt alle und legt sie zusammen an.
- **ChordPro** wird erkannt und unverändert übernommen (mehrere Lieder mit `{new_song}`).

## Spielmodus

Knopf **Spielen** über der Vorschau (oder Taste **F**): Vollbild nur mit dem Lied, der
Bildschirm bleibt an. **Automatisch scrollen** läuft so, dass das Lied in seiner Dauer
(`{duration: 3:20}`, sonst 3 Minuten) einmal durchläuft; mit − / + schneller oder langsamer,
die Geschwindigkeit wird pro Lied gemerkt. Tippen aufs Lied blendet die Leiste ein/aus.

| Taste / Pedal | Wirkung |
|---|---|
| Bild↓ / ↓ | eine Seite weiter, am Ende: nächstes Lied |
| Bild↑ / ↑ | eine Seite zurück, am Anfang: voriges Lied |
| → / ← | nächstes / voriges Lied |
| Leertaste / Enter | automatisches Scrollen an/aus |
| + / − | Schrift größer / kleiner |
| > / < | schneller / langsamer scrollen |
| S | zwei Spalten nebeneinander (seitenweise) |
| G | Griffbilder ein/aus |
| H | Mundharmonika-Tabs ein/aus (nur bei Liedern mit solchen Tabs) |
| T | Gitarren-Tabs ein/aus (nur bei Liedern mit Tab-Abschnitt) |
| M | Metronom |
| N | Nachtmodus (dunkel) |
| Esc | Spielmodus beenden |

**Zwei Spalten** (Symbol in der Leiste oder Taste S), ideal für Tablets im Querformat: Das Lied
fließt in Spalten von Bildschirmhöhe, je zwei nebeneinander; Blättern schiebt um eine
Doppelseite weiter, automatisch im Liedtempo. **Griffbilder** lassen sich hier direkt ein- und
ausschalten (gleiche Einstellung wie unter Einstellungen → Akkorde).

Bluetooth-Fußpedale („Page Turner“) senden meist Bild↑/↓ oder Pfeiltasten und funktionieren
damit ohne Einrichtung. Geblättert wird in der Reihenfolge der Liederliste (ggf. gefiltert).

## Setlisten

Reiter **Setlisten** in der linken Spalte: Lieder in fester Reihenfolge, z. B. für einen
Auftritt. Lieder über „Lied hinzufügen …“ suchen und anklicken; Reihenfolge per Ziehen oder
über **⋯** (nach oben/unten). Unter **⋯** gibt es pro Eintrag eine **Notiz** (z. B. „Capo 2“,
erscheint im Spielmodus) und eine **eigene Transposition** nur für diese Setliste.
**Spielen** startet den Spielmodus in Setlisten-Reihenfolge, **Drucken** druckt genau diese
Lieder in dieser Reihenfolge. Setlisten werden mit synchronisiert – in gemeinsamen
Liederbüchern sieht die ganze Band dieselben Setlisten.

## Liedinfo: Capo, Takt, Tempo

Über dem Editor gibt es das Feld **Liedinfo** (einklappbar) mit Titel, Interpret, Tonart,
Capo, Takt und Tempo. Es schreibt die üblichen ChordPro-Angaben in den Kopf des Liedes
(`{capo: 2}`, `{time: 3/4}`, `{tempo: 96}`) und zeigt umgekehrt an, was im Text steht.
Capo und Takt erscheinen im Liedkopf (auch im Druck) und als Kennzeichen über der Vorschau;
beim Import aus Ultimate Guitar werden „Capo“, „Time“ und „Tempo“ erkannt.

## Tags, Notizen, Papierkorb

- **Tags** (Liedinfo → Tags, mit Komma trennen) werden als ChordPro-Standard `{tag: Advent}`
  gespeichert. Über der Liederliste erscheinen sie als Filter; die Suche findet sie auch.
- **Notiz** (Liedinfo → Notiz): privater Hinweis zum Lied, sichtbar in Vorschau und Spielmodus,
  nicht im Druck; wird mit gesichert und synchronisiert.
- **Papierkorb** (Menü): gelöschte Lieder wiederherstellen oder endgültig löschen.

## Druckvorschau: Schrift nur für den Druck

In der Druckvorschau stehen unter der Leiste **Schriftart und -größe für Text und Akkorde**.
Sie gelten nur für den Druck – am Bildschirm bleibt alles, wie es unter Einstellungen steht.
Die Vorschau setzt die Seiten sofort neu (Seitenzahl oben), bleibt dabei an derselben Stelle und
merkt sich die Werte fürs nächste Mal. Praktisch, um ein Liederbuch kleiner zu setzen, bis jedes
Lied auf eine Seite passt. **Wie Einstellungen** stellt die Druckschrift zurück.

## Zoom, Metronom, Lied teilen

- **Zoom:** unten rechts in der Vorschau − / 100 % / + (nur Bildschirm, nicht der Druck).
- **Metronom:** Klick auf Takt/Tempo über der Vorschau, im Spielmodus das Metronom-Symbol oder
  Taste **M** – im Tempo des Liedes (`{tempo:}`, sonst 100 bpm), Betonung auf der Eins nach
  Taktart (6/8 und 12/8 in Gruppen zu drei Achteln).
- **Lied teilen** (Menü): in der aktuellen Transposition als ChordPro-Datei, über das
  Teilen-Menü des Handys (WhatsApp, Mail …), als Text „Akkorde über dem Text“ oder als PDF.

## Was kann ich spielen?

Über der Liederliste: **🎸 Was kann ich spielen?** – Griffe eingeben, die du kannst
(z. B. `G C D Em Am`). Die Liste zeigt nur noch Lieder, die ausschließlich aus diesen Griffen
bestehen (mit der gespeicherten Transposition; Slash-Bass zählt nicht). Mit **„auch mit Capo“**
kommen Lieder dazu, die mit Kapodaster passen – der Bund steht dann in der Liste.
Der Spielmodus blättert in dieser gefilterten Liste.

## Griffbilder und Capo-Hilfe

Im Liedkopf erscheinen **Griffbilder** aller vorkommenden Akkorde – in der gespielten, also
transponierten Form (abschaltbar unter Einstellungen → Akkorde). Bekannte offene Griffe kommen
aus einer Tabelle, alle anderen werden aus den verschiebbaren E- und A-Barré-Formen berechnet;
ein Test prüft jeden Griff (12 Grundtöne × 17 Akkordtypen) gegen die Akkordtöne.
Slash-Akkorde (G/B) zeigen den Grundgriff.

**Capo-Hilfe** (unter „Liedinfo“): schlägt Capo-Lagen vor, in denen möglichst viele Akkorde
ohne Barré greifbar sind – z. B. ein Lied in B-Dur mit Capo 3 und G-Griffen. Ein Klick setzt
Capo und Transposition so, dass der Klang gleich bleibt.

## Mundharmonika- und Gitarren-Tabs

Mundharmonika-Töne stehen wie Akkorde in eckigen Klammern über der Silbe und erscheinen in Grün:

    I [C][4]come from [5]Ala[6]bama with my [G][-5]banjo
    [4] [-4] [5] [6] [6] [-6] [6] [5]

`4` blasen, `-4` ziehen (`+4` geht auch), `-3'` `-3''` oder `-3b` Bending, `6o` Overblow,
`[4 -4 5]` mehrere Töne an einer Stelle; Kanäle 1–16. Sie werden nie transponiert und zählen
nicht als Akkorde (keine Griffbilder). Beim **Einfügen** wird eine Zeile wie `4  -4  5` über dem
Text automatisch erkannt.

Gitarren-Tabs stehen wie bisher in `{start_of_tab}` … `{end_of_tab}`.

Beide lassen sich getrennt ausblenden – unter **Einstellungen** (Akkorde bzw. Abschnitte), per
Rechtsklick auf die Vorschau → *Anzeigen* oder im Spielmodus mit **Harp** / **Tab** (H / T).
Das gilt auch für den Druck. Ein Abschnitt, der nur aus Mundharmonika-Tönen besteht (z. B. ein
Solo), verschwindet dann ganz.

## Wiederholungen

Eine Klammer rechts zeigt, **worauf** sich die Anzahl bezieht – sie umfasst genau den
wiederholten Teil:

| Schreibweise | Klammer um |
|---|---|
| `[C]Oh my darling (2×)` – „2×“, „x2“, „(2x)“, „2 mal“ am Zeilenende | diese eine Zeile |
| `{start_of_repeat: 2×}` … `{end_of_repeat}` | die Zeilen dazwischen |
| `{start_of_chorus: Refrain 2×}` (bei jedem Abschnitt) | den ganzen Abschnitt |
| `{chorus: 3×}` | – („→ Refrain 3×“) |

Im Editor setzt der Knopf **2×** die Angabe passend: an die Zeile mit dem Cursor, um mehrere
markierte Zeilen, oder – auf der Abschnittszeile – an den ganzen Abschnitt. Nochmal klicken
zählt hoch. Beim Import aus Ultimate Guitar werden „[Chorus x2]“ und „x2“ am Zeilenende erkannt.

## Cloud-Sync und gemeinsame Liederbücher (Google Drive)

Jedes Liederbuch ist eine Datei in Google Drive; jedes Gerät hat zusätzlich eine vollständige
lokale Kopie (offline nutzbar). Pro Lied gewinnt die zuletzt geänderte Fassung, Löschungen
werden mit abgeglichen. Eigene Änderungen werden nach ~1,5 s hochgeladen, fremde alle ~15 s
und beim Zurückwechseln in die App geholt.

- **Mein Liederbuch** – `Liederbuch.json` im eigenen Drive, für alle eigenen Geräte.
- **Gemeinsame Liederbücher** (z. B. „Band“) – `Liederbuch – Band.json`, per Drive geteilt.
  Unter **Cloud** anlegen (optional mit den eigenen Liedern), dann Mitglieder per E-Mail
  einladen. Eingeladene öffnen die App, verbinden sich und tippen auf **„Einladung öffnen …“**.
  Alle Mitglieder können bearbeiten; der Besitzer kann Mitglieder entfernen. Gewechselt wird
  oben links in der Kopfleiste.

Sicherheit: Die App ist öffentlich, die Lieder nicht. Zugriff auf ein Drive gibt es nur über
die Google-Anmeldung des jeweiligen Kontos, und die App bekommt nur die Berechtigung
`drive.file` (ausschließlich ihre eigenen bzw. ausdrücklich ausgewählten Dateien).

### Einmalig einrichten (kostenlos)

1. <https://console.cloud.google.com/> → neues Projekt → **Google Drive API** und
   **Google Picker API** aktivieren.
2. „Google Auth Platform“ (früher „OAuth-Zustimmungsbildschirm“): Typ *Extern*, App-Name eintragen.
   Unter *Zielgruppe* entweder alle Nutzer (dich und alle Mitglieder) als **Testnutzer** eintragen
   (max. 100), oder die App **veröffentlichen** – mit der Berechtigung `drive.file` ist dafür
   keine Google-Prüfung nötig, und jeder erreicht trotzdem nur sein eigenes Drive bzw. die mit
   ihm geteilten Liederbücher.
3. *Clients* → **Client erstellen** → Typ *Webanwendung*, *Autorisierte JavaScript-Quellen*:
   `https://janschke0815.github.io` und `http://localhost:5173`.
4. *APIs & Dienste → Anmeldedaten* → **API-Schlüssel erstellen**; einschränken auf
   *Websites* (`https://janschke0815.github.io/*`, `http://localhost:5173/*`) und die *Google Picker API*.
5. **Projektnummer** steht im Dashboard des Projekts (nur Ziffern).
6. Client-ID, API-Schlüssel und Projektnummer in `src/sync/config.js` eintragen (gilt dann für
   alle Geräte und Mitglieder) oder in der App unter **Cloud → Einrichtung**.

Keiner dieser Werte ist geheim (sie stehen bei jeder Web-App sichtbar im Code); Google nimmt sie
nur von den eingetragenen Adressen an. Das *Client-Secret* wird nicht gebraucht – nicht weitergeben.

Google meldet Browser-Apps nach etwa einer Stunde ab; dann zeigt der Cloud-Knopf „Anmelden“,
ein Tipp darauf genügt (bis dahin wird lokal weitergespeichert). Weitere Anbieter (z. B.
Dropbox) lassen sich in `src/sync/` mit `read`/`write` ergänzen.

### WebDAV (Nextcloud, ownCloud, Synology …)

Statt Google Drive kann das persönliche Liederbuch auch auf einem eigenen WebDAV-Server liegen:
**Cloud → Speicherort „WebDAV / Nextcloud“**, dann Ordner-Adresse, Benutzername und Passwort
eintragen und **Verbinden**. Die App legt dort `Liederbuch.json` an (fehlt der Ordner, wird er
angelegt). Gleichzeitige Änderungen erkennt sie über das ETag der Datei.

- **Adresse** bei Nextcloud: `https://<server>/remote.php/dav/files/<benutzer>/Liederbuch/`
  (steht in Nextcloud unten links unter *Dateien-Einstellungen → WebDAV*).
- **App-Passwort** nehmen (Nextcloud: *Persönliche Einstellungen → Sicherheit → Neues App-Passwort*),
  nicht das Hauptpasswort – es wird auf dem Gerät gespeichert. „Trennen“ löscht es wieder.
- **Nur https** (außer `localhost`), damit das Passwort nicht unverschlüsselt übertragen wird.
- **Mehrere Personen:** den Ordner in der Nextcloud teilen; alle tragen dieselbe Adresse ein.
  Gemeinsame Liederbücher mit Einladung per E-Mail gibt es nur über Google Drive.

**Wichtig – CORS:** Die App läuft im Browser und spricht den Server direkt an. Das erlaubt der
Browser nur, wenn der Server Zugriffe von der Adresse der App zulässt. Nötig sind diese Antwort-Köpfe
(auch auf `OPTIONS`-Anfragen):

    Access-Control-Allow-Origin:   https://janschke0815.github.io
    Access-Control-Allow-Methods:  GET, PUT, MKCOL, OPTIONS
    Access-Control-Allow-Headers:  Authorization, Content-Type, If-Match, If-None-Match
    Access-Control-Expose-Headers: ETag

Nextcloud sendet sie von sich aus nicht. Bei einem eigenen Server lassen sie sich im Webserver
(Apache/nginx) eintragen oder über eine Nextcloud-App wie *WebAppPassword*. Bei fertigen
Speicherangeboten, deren Server man nicht selbst verwaltet, geht das meist nicht – dort meldet
die App „Server nicht erreichbar … (CORS)“.

## Aufbau

    src/core/      reine Logik ohne DOM (Parser, Import, Transposition) – gut testbar
    src/render/    Song-Modell -> HTML (Vorschau und später Druck), CSS mit Variablen
    src/print/     Seitenumbruch, Deckblatt, Inhaltsverzeichnis, Druck-CSS
    src/settings/  Layout-Einstellungen (Werte prüfen, speichern, als CSS-Variablen anwenden)
    src/storage/   IndexedDB hinter einer Schnittstelle
    src/sync/      Abgleich (Sync-Engine) und Cloud-Anbieter (Google Drive, WebDAV)
    src/app.js     Oberfläche
    src/pwa.js     Service Worker anmelden, Offline-Hinweis, Installieren
    sw.js          Service Worker (Cache „Netz zuerst“)
    icons/         App-Icons (icon.svg ist die Vorlage)
    tests/         Browser-Tests (index.html öffnen)

## Fahrplan

1. ✅ Import-Parser (Akkorde über Text -> ChordPro), ChordPro-Parser, Vorschau, Transponieren
2. ✅ Speicherung: IndexedDB, Liederliste, Suche, Transposition pro Lied, Sichern/Öffnen (JSON-Sicherung, ChordPro-, Textdateien)
3. ✅ PWA: Manifest, Icons, Service Worker (offline), „App installieren“, Dateien öffnen mit der App
4. ✅ Einstellungen: Schrift und Größe für Text und Akkorde, Akkordfarbe, fett, Zeilenabstand,
   Refrain-Stil (Balken, eingerückt, fett, Rahmen), Abschnittsnamen, Papier, Spalten, Ränder
5. ✅ Druck: Auswahl, Deckblatt, Inhaltsverzeichnis mit Seitenzahlen, jedes Lied auf neuer Seite,
   ein-/zweispaltig, A4/A5/Letter, Ränder – eigener Seitenumbruch (src/print/paginate.js), kein Paged.js nötig
6. ✅ Cloud-Sync über Google Drive (weitere Anbieter optional)
7. ✅ Liederbuch über WebDAV synchronisieren (Nextcloud u. a., Server muss CORS erlauben)
8. ✅ Mundharmonika-Tabs ([-4] …) und Gitarren-Tabs getrennt ein-/ausblendbar
9. ✅ Schriftart und -größe in der Druckvorschau einstellbar (nur für den Druck)
