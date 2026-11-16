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

**Sichern** lädt eine ZIP-Datei herunter (`Liederbuch-2026-11-16.zip`), die auch **ohne die App
lesbar** ist – Windows öffnet sie per Doppelklick wie einen Ordner:

    Lieder/<Titel - Interpret>.cho     jedes Lied als ChordPro-Datei (wie unter „Bearbeiten“,
                                       Transposition/Notiz als {transpose: …} / {x_notiz: …})
    Setlisten/<Name>.txt               eine Zeile pro Lied (Dateiname)
    liederbuch-sicherung.json          vollständig inkl. Papierkorb und Änderungszeiten
    LIESMICH.txt

Zum Wiederherstellen die ZIP-Datei mit „Datei öffnen …“ wählen: Die App nimmt die JSON-Datei
(Lieder, Setlisten, Papierkorb; vorhandene Lieder nur, wenn die Sicherung neuer ist). Fehlt sie,
werden die `.cho`- und `.txt`-Dateien übernommen – so lassen sich auch Lieder aus anderen
ChordPro-Programmen als ZIP einlesen. Ältere Sicherungen (`.json`) lassen sich weiter öffnen.

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

## ChordPro-Syntax (Kurzüberblick)

Die vollständige Übersicht öffnet der Knopf **?** über dem Editor. Die Knöpfe daneben
(Akkord, Strophe, Refrain, Bridge, **Tab**, Refrain-Verweis, 2×, Hinweis) fügen das Meiste ein.

    {title: Clementine}          {artist: …}   {key: C}   {capo: 2}   {time: 3/4}   {tempo: 96}
    In a [C]cavern, [G]canyon    Akkord vor der Silbe; [*Riff] = Anmerkung; [-4] = Mundharmonika
    {start_of_verse: Strophe 1} … {end_of_verse}     ebenso chorus, bridge, part, tab, grid
    {chorus}                     Refrain hier wiederholen
    Zeile (2×)   {start_of_chorus: Refrain 2×}   {start_of_repeat: 3×} … {end_of_repeat}
    {comment: leise}   {new_page}   {column_break}   # Notiz (nur im Editor)

Der Knopf **Tab** rahmt markierten Text als Gitarren-Tab ein; ohne Markierung fügt er ein leeres
Griffbrett ein, das schon markiert ist – ein kopierter Tab ersetzt es direkt mit Strg+V.

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

### Lesezeichen „Ins Liederbuch“

Noch schneller: Im Einfügen-Dialog **„Direkt von Ultimate Guitar übernehmen …“** zeigt einen
Knopf, den man in die Lesezeichenleiste zieht (am Handy: „Code kopieren“ und als Adresse eines
Lesezeichens einfügen). Auf einer Liedseite von Ultimate Guitar angeklickt, öffnet es das
Liederbuch mit dem fertig ausgefüllten Einfügen-Dialog – **Titel, Interpret, Capo, Tonart, Tempo**
und Stimmung (wenn nicht Standard) inklusive. Angelegt wird erst nach dem Bestätigen.

- Es liest nur die Seite, die man gerade selbst ansieht – kein automatischer Abruf, kein Server.
  Die Daten stehen kurz hinter `#ug=` in der Adresse und gehen nicht ins Netz.
- Ein **Takt** kommt nur mit, wenn er im Liedtext steht; Ultimate Guitar speichert ihn nicht.
- Auf anderen Seiten: Liedtext markieren, dann das Lesezeichen anklicken.
- In der Ultimate-Guitar-App geht es nicht – das Lied im Browser öffnen.
- Das Lesezeichen öffnet die Adresse, von der aus es eingerichtet wurde – also am besten in der
  Online-Version (GitHub Pages) einrichten, nicht unter `localhost`.
- Ändert Ultimate Guitar den Aufbau seiner Seiten, nimmt das Lesezeichen den markierten bzw.
  sichtbaren Liedtext; die Umwandlung steckt in der App (`src/core/ug-bookmarklet.js`), das
  Lesezeichen muss für Verbesserungen nicht neu angelegt werden.

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

## Titel & Interpret gestalten

Unter **Einstellungen → Titel & Interpret**:

- **Ausrichtung** des Liedkopfs: links oder mittig (Titel, Interpret, Infozeile und Griffbilder)
- **Titel:** Schriftart (oder „wie Liedtext“), Größe, fett, Großbuchstaben, Farbe
- **Interpret:** anzeigen ja/nein, Größe, kursiv, Farbe – gilt auch für den Untertitel

Das Muster im Dialog zeigt jede Änderung sofort. Die Einstellungen gelten für Vorschau,
Spielmodus und Druck; die Standardwerte entsprechen dem bisherigen Aussehen.

## Druck: Optionen und Schnellwahl

Im Druckdialog bzw. in der Druckvorschau unter **Optionen …** stehen alle Einstellungen für den
Druck: Deckblatt, Inhaltsverzeichnis, gespeicherte Transposition, Papier, Spalten, Rand,
**Seitenzahlen** sowie **Schriftart und -größe für Text und Akkorde**. Die Schrift gilt nur für
den Druck – am Bildschirm bleibt alles, wie es unter Einstellungen steht; **Wie Einstellungen**
stellt sie zurück. Papier, Spalten, Rand und Seitenzahlen sind dieselben wie unter
*Einstellungen → Druck*.

**Schnellwahl:** Jede Option hat ein 📌. Angeheftete Optionen stehen direkt in der Leiste neben
**Optionen …** (am Handy in einer Zeile darunter) – zum Beispiel Papier, Seitenzahlen oder die
Schriftgröße. Eine Änderung dort setzt die Seiten sofort neu (Seitenzahl oben), die Vorschau bleibt
an derselben Stelle. Voreingestellt angeheftet: Seitenzahlen, Textgröße, Akkordgröße. Praktisch, um
ein Liederbuch kleiner zu setzen, bis jedes Lied auf eine Seite passt.

Beim Drucken eines einzelnen Liedes oder einer Setliste gelten eigene Vorgaben (z. B. ohne
Deckblatt); ändert man sie per Schnellwahl, gilt das nur für diese Vorschau.

Ohne **Seitenzahlen** bleibt der Seitenumbruch gleich, das Inhaltsverzeichnis nennt die Seiten
weiterhin.

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
Text automatisch erkannt – auch zusammen mit einer Akkordzeile darüber oder darunter:

          C                         G
          6        6      6     5   -4
    Oh my darling, oh my darling, oh my darling Clementine

**Eine oder zwei Zeilen:** Unter *Einstellungen → Akkorde → Akkorde und Harp-Tabs* (oder per
Rechtsklick auf die Vorschau → *Anzeigen → Harp-Tabs in eigener Zeile*) wählst du, ob Akkord und
Ton nebeneinander stehen oder untereinander – Akkorde oben, Tabs direkt über dem Text. Das gilt
für Vorschau, Spielmodus und Druck, und **Lied teilen → als Text** schreibt die Tabs dann ebenfalls
in eine eigene Zeile (die sich wieder einfügen lässt).

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
eintragen und **Verbinden**. Fehlt der Ordner, wird er angelegt.

Gespeichert wird wie beim Programm ChordPro selbst – **nur Textdateien, keine Datenbank-Datei**:

    Liederbuch/
      Lieder/
        Clementine - Percy Montrose.cho    ein Lied pro Datei, genau wie unter „Bearbeiten“
        Kein schöner Land.cho
      Setlisten/
        Lagerfeuer Samstag.txt             eine Zeile pro Lied (Dateiname)
      Liederbuch.json                      nur ein Hinweis ohne Daten (hält alte App-Versionen ab)

Einstellungen eines Liedes stehen als Direktiven in seiner Datei, gleich hinter dem Liedkopf –
und nur, wenn sie gesetzt sind:

    {title: Clementine}
    {artist: Percy Montrose}
    {transpose: 2}                 Transposition (offizielles ChordPro)
    {x_accidentals: flat}          Schreibweise ♯/♭ (nur Liederbuch)
    {x_notiz: Capo 2, alle singen mit}

Andere Programme ignorieren `x_`-Direktiven, so sieht es ChordPro vor. Eine Setliste sieht so aus:

    # Setliste „Lagerfeuer Samstag“ – eine Zeile pro Lied (Datei im Ordner Lieder)
    Kein schöner Land.cho
    Clementine - Percy Montrose.cho
      Transposition: 2
      Notiz: Capo 2, alle singen mit

Alles lässt sich auch **direkt auf dem Server** bearbeiten (z. B. im Editor über die
Netzwerkfreigabe der NAS): Geänderte Dateien übernimmt der nächste Abgleich, **neue `.cho`-Dateien**
werden neue Lieder (ohne `{title:}` gilt der Dateiname als Titel), **gelöschte Dateien** landen in
der App im Papierkorb – außer das Lied wurde auf einem Gerät inzwischen geändert, dann wird es
wieder hochgeladen. Ändert sich der Titel, wird die Datei umbenannt; andere Geräte erkennen das am
gleichen Liedtext. Dazu merkt sich jedes Gerät, welche Dateien es beim letzten Abgleich gesehen hat.
Ältere Ablagen (alles in einer `Liederbuch.json` oder Verzeichnis + Liedtexte) werden beim ersten
Abgleich automatisch umgestellt; ältere App-Versionen melden danach „bitte App neu laden“, statt
etwas zu überschreiben.

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
    Access-Control-Allow-Methods:  GET, HEAD, PUT, DELETE, MKCOL, PROPFIND, OPTIONS
    Access-Control-Allow-Headers:  Authorization, Content-Type, Depth, If-Match, If-None-Match
    Access-Control-Expose-Headers: ETag

Nextcloud sendet sie von sich aus nicht. Bei einem eigenen Server lassen sie sich im Webserver
(Apache/nginx) eintragen oder über eine Nextcloud-App wie *WebAppPassword*. Bei fertigen
Speicherangeboten, deren Server man nicht selbst verwaltet, geht das meist nicht (z. B. GMX
Mediacenter: verlangt schon für die Vorabfrage ein Passwort) – dort meldet die App „Server nicht
erreichbar … (CORS)“.

**QNAP-NAS:** Schritt-für-Schritt-Anleitung mit einem kleinen Caddy-Container, der die Freigabe
ergänzt und automatisch ein Zertifikat holt: [docs/webdav-qnap.md](docs/webdav-qnap.md). Das
Caddyfile dort passt mit anderen Adressen auch für andere NAS oder Server.

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
10. ✅ Harp-Tabs importieren (auch Akkord- und Harp-Zeile übereinander); Akkorde und Harp-Tabs wahlweise in einer oder zwei Zeilen
11. ✅ Dateien passend für Windows: Sync-Datei, Sicherung und geteilte Lieder eingerückt und mit CR LF
12. ✅ WebDAV: reine ChordPro-Ablage – eine `.cho`-Datei pro Lied (Einstellungen als Direktiven), Setlisten als `.txt`, keine Daten-JSON; alles auch direkt auf dem Server bearbeitbar
13. ✅ Versionsanzeige: in den Einstellungen und am App-Namen (`src/version.js`)
