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
| N | Nachtmodus (dunkel) |
| Esc | Spielmodus beenden |

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
Dropbox, Nextcloud) lassen sich in `src/sync/` mit `read`/`write` ergänzen.

## Aufbau

    src/core/      reine Logik ohne DOM (Parser, Import, Transposition) – gut testbar
    src/render/    Song-Modell -> HTML (Vorschau und später Druck), CSS mit Variablen
    src/print/     Seitenumbruch, Deckblatt, Inhaltsverzeichnis, Druck-CSS
    src/settings/  Layout-Einstellungen (Werte prüfen, speichern, als CSS-Variablen anwenden)
    src/storage/   IndexedDB hinter einer Schnittstelle
    src/sync/      Abgleich (Sync-Engine) und Cloud-Anbieter (Google Drive)
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
