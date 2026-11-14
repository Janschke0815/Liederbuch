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

## Aufbau

    src/core/      reine Logik ohne DOM (Parser, Import, Transposition) – gut testbar
    src/render/    Song-Modell -> HTML (Vorschau und später Druck), CSS mit Variablen
    src/print/     Seitenumbruch, Deckblatt, Inhaltsverzeichnis, Druck-CSS
    src/settings/  Layout-Einstellungen (Werte prüfen, speichern, als CSS-Variablen anwenden)
    src/storage/   IndexedDB hinter einer Schnittstelle, später austauschbar gegen Cloud-Sync
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
6. Optional: Cloud-Sync
