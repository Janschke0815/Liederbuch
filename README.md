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

## Wiederholungen

„2×“, „x2“, „(2x)“ oder „2 mal“ am Ende einer Zeile, eines Abschnittsnamens oder bei
`{chorus: 2x}` werden als kleines Abzeichen dargestellt. Im Editor setzt der Knopf **2×**
die Angabe an die Zeile mit dem Cursor (auf `{start_of_…}`/`{end_of_…}`: am Abschnitt);
nochmal klicken zählt hoch.

    {start_of_chorus: Refrain 2×}
    [C]Oh my darling, oh my [G]darling (2×)
    {end_of_chorus}
    {chorus: 2×}

## Cloud-Sync (Google Drive)

Alle Geräte teilen sich die Datei `Liederbuch.json` in deinem Google Drive. Jedes Gerät hat
weiterhin eine vollständige lokale Kopie (offline nutzbar). Pro Lied gewinnt die zuletzt
geänderte Fassung, Löschungen werden mit abgeglichen. Eigene Änderungen werden nach ~1,5 s
hochgeladen, fremde alle ~15 s und beim Zurückwechseln in die App geholt.

Einmalig einrichten (kostenlos):

1. <https://console.cloud.google.com/> → neues Projekt → „APIs & Dienste“ → **Google Drive API** aktivieren.
2. „OAuth-Zustimmungsbildschirm“: Typ *Extern*, App-Name eintragen, dich selbst unter *Testnutzer* hinzufügen.
3. „Anmeldedaten“ → *Anmeldedaten erstellen* → **OAuth-Client-ID** → Typ *Webanwendung*.
   Unter *Autorisierte JavaScript-Quellen* eintragen:
   `https://janschke0815.github.io` und (zum lokalen Testen) `http://localhost:5173`.
4. Die Client-ID in `src/sync/config.js` eintragen (gilt dann für alle Geräte) oder in der App
   unter **Cloud → Einrichtung** einfügen.
5. In der App auf **Cloud → Verbinden** tippen und Google-Zugriff erlauben.

Die App bekommt nur die Berechtigung `drive.file`: Sie sieht ausschließlich ihre eigene Datei.
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
