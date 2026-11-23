# Liederbuch (PWA)

Persönliches Gitarren-Liederbuch. Lieder werden als ChordPro gespeichert.

Was sich in welcher Version geändert hat: [CHANGELOG.md](CHANGELOG.md).
Wie die App aufgebaut ist: [docs/architektur.md](docs/architektur.md), alle Module und Funktionen: [docs/api/](docs/api/README.md).

## Starten

Einmalig [Node.js](https://nodejs.org) (LTS) installieren, dann im Projektordner:

    npm install        # einmalig: holt Vite
    npm run dev        # Entwicklungsserver, lädt bei Änderungen automatisch neu

- App: http://localhost:5173/
- Tests: http://localhost:5173/tests/ – oder ohne Browserfenster `npm test` (braucht Chrome oder Edge;
  prüft zusätzlich, dass die Kopfleiste auf Handy-Breite nicht über den Rand ragt)
- Druck-Demo mit Beispielliedern: http://localhost:5173/tests/print-demo.html (`?columns=2&paper=A5&chorus=indent`)

## Installieren und offline nutzen

Die App ist eine PWA: Nach dem ersten Öffnen funktioniert sie komplett ohne Internet.
Lieder liegen lokal im Browser (IndexedDB), App-Dateien im Cache des Service Workers.

- **Windows/Mac (Chrome, Edge):** Knopf „App installieren“ in der Werkzeugleiste
  oder das Installieren-Symbol in der Adressleiste.
- **Android (Chrome):** Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone/iPad (Safari):** unten ••• → „Teilen“ (ältere iOS: gleich das Teilen-Symbol) → nach unten
  wischen → „Zum Home-Bildschirm“. Fehlt der Eintrag: „Aktionen bearbeiten …“. Nur in Safari bzw. Chrome,
  nicht im eingebauten Browser anderer Apps (Link aus WhatsApp, Mail …).
- In der App zeigt **⋯ → Installieren** die passenden Schritte für das Gerät, wenn der Browser die
  Installation nicht selbst anbietet (immer auf iPhone/iPad).

Für Handy und Tablet muss die App über **HTTPS** erreichbar sein (localhost geht nur am
selben Rechner). `npm run build` legt die fertige App in den Ordner `dist/` – dessen Inhalt
passt auf jeden statischen Webspace (NAS, Netlify per Drag & Drop …), die Adresse ist egal.
Ausprobieren vor dem Hochladen: `npm run preview` (http://localhost:4173/).
**GitHub Pages** baut und veröffentlicht nach jedem Push auf `main` von selbst
(`.github/workflows/deploy.yml`; einmalig unter *Settings → Pages → Source* „GitHub Actions“ wählen).

**Fertige App zum Herunterladen:** Jeder Push auf `main` legt die gebaute App als `liederbuch.zip`
in ein [Release](https://github.com/Janschke0815/Liederbuch/releases) (`v<Version>`, Beschreibung
aus dem Changelog). Die neueste liegt immer unter

    https://github.com/Janschke0815/Liederbuch/releases/latest/download/liederbuch.zip

Eine NAS kann sich damit selbst aktuell halten: `tools/nas-update.sh` holt die ZIP regelmäßig und
entpackt sie in den Web-Ordner (Einrichtung: [docs/webdav-qnap.md](docs/webdav-qnap.md#app-automatisch-aktuell-halten)).

Jedes Gerät hat sein eigenes Liederbuch. Übertragen: auf Gerät A „Sichern“, auf Gerät B
„Datei öffnen …“ (wird zusammengeführt, neuere Fassung gewinnt).

**Sichern** lädt eine ZIP-Datei herunter (`Liederbuch-2026-11-16.zip`), die auch **ohne die App
lesbar** ist – Windows öffnet sie per Doppelklick wie einen Ordner:

    Lieder/<Titel - Interpret>.cho     jedes Lied als ChordPro-Datei (wie unter „Bearbeiten“,
                                       Transposition/Notiz als {transpose: …} / {x_notiz: …})
    Setlisten/<Name>.txt               eine Zeile pro Lied (Dateiname)
    liederbuch-sicherung.json          vollständig inkl. Papierkorb und Änderungszeiten
    LIESMICH.txt

Zum Wiederherstellen die ZIP-Datei mit „Datei öffnen …“ wählen:

1. Die App übernimmt die JSON-Datei (Lieder, Setlisten, Papierkorb; vorhandene Lieder nur, wenn
   die Sicherung neuer ist).
2. Dann gleicht sie die `.cho`- und `.txt`-Dateien ab – mit der JSON bzw., wenn keine darin ist, mit
   dem aktuellen Liederbuch. **Von Hand geänderte Dateien gewinnen** (Liedtext, `{transpose}`,
   `{x_notiz}` … bzw. Setlisten), **neue `.cho`-Dateien** werden neue Lieder, gleichnamige werden
   aktualisiert. Gelöschte Dateien löschen nichts; dieselbe ZIP zweimal zu öffnen erzeugt keine
   Doppel.

So lässt sich eine Sicherung entpacken, im Editor bearbeiten, wieder packen und öffnen – oder es
lassen sich Lieder aus anderen ChordPro-Programmen als ZIP einlesen. Ältere Sicherungen (`.json`)
lassen sich weiter öffnen.

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
- **Kopfleiste:** oben rechts stehen *Einfügen*, *Drucken* und *Live* beschriftet, alles Weitere im Menü
  **⋯** (Datei öffnen, Lied teilen, Sichern, Papierkorb, Einstellungen …) – am Handy steht alles im Menü.
  **Anpassen:** ⋯ → *Leiste anpassen …* (Häkchen = in der Leiste, ↑/↓ = Reihenfolge) oder Rechtsklick auf
  einen Menüeintrag bzw. Knopf (*An die Leiste anheften*, *Nach links/rechts*). Wird es eng, zeigt die Leiste
  nur Symbole, dann rutschen die letzten Knöpfe zurück ins Menü.
- **Doppelklick** auf ein Lied startet den Spielmodus, **Entf** löscht das markierte Lied (mit Rückgängig).
- **Editor ein-/ausblenden** (Symbol links über der Vorschau): nur Liste und Lied, z. B. zum Spielen.
- **Spaltenbreiten** (breiter Bildschirm): die Trennlinie rechts neben der Liederliste bzw. dem Editor
  ziehen; Doppelklick stellt die Standardbreite wieder her, mit Tab angewählt geht es auch mit ← / →.
  Die Breiten bleiben auf dem Gerät gespeichert.
- **Bausteine** über dem Editor: Akkord, Strophe, Refrain, Bridge, Refrain wiederholen, Hinweis. Markierter Text wird eingeschlossen.
- **Dateien** einfach ins Fenster ziehen, um sie zu importieren.
- **Löschen** lässt sich in der Meldung unten rückgängig machen.
- **Kopf der Liste** (Suche, „Was kann ich spielen?“, Tags) gleitet beim Runterscrollen weg und beim
  Hochscrollen sofort wieder herein – ohne dass die Liste nach oben springt.
- **Sortieren** (über der Liste): nach Titel, Interpret, zuletzt geändert oder zuletzt gespielt; der Knopf
  daneben zeigt und dreht die Richtung (*A–Z* / *Z–A* bzw. *neueste zuerst* / *älteste zuerst*).
- **Doppelte Lieder**: Beim Einfügen, über das Lesezeichen und beim Öffnen von Dateien fragt die App
  nach, wenn es Titel und Interpret schon gibt – überspringen, vorhandenes ersetzen oder als Kopie anlegen.
- **ZIP öffnen** zeigt danach, welche Lieder und Setlisten geändert oder neu angelegt wurden.
- **Tastenkürzel**: Taste **?** oder Menü → Tastenkürzel zeigt alle auf einen Blick.

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
| ? | Übersicht der Tastenkürzel |
| Enter | im Dialog: bestätigen (roter Knopf); in großen Textfeldern Strg+Enter |

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
Geschwindigkeit und Schriftgröße werden pro Lied gemerkt. Tippen aufs Lied blendet die Leiste
ein/aus. Am Handy stehen nur Schließen, Liedwechsel, Titel und Start/Stopp in der Leiste, alles
Weitere unter **⋯**. Bei einer Setliste steht unter dem Titel die Position und das nächste Lied
(„3 / 12 · Nächstes: …“).

| Taste / Pedal | Wirkung |
|---|---|
| Bild↓ / ↓ | eine Seite weiter, am Ende: nächstes Lied |
| Bild↑ / ↑ | eine Seite zurück, am Anfang: voriges Lied |
| → / ← | nächstes / voriges Lied – zweispaltig: eine Doppelseite weiter / zurück |
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
Doppelseite weiter, automatisch im Liedtempo. **Von Hand umblättern:** rechts bzw. links ins Lied
tippen, waagerecht wischen (nach links = weiter), die Pfeile ‹ › an den Rändern, Mausrad/Touchpad
oder die Tasten Bild↓/Bild↑, ↓/↑ und →/← (auch per Bluetooth-Pedal); nach der letzten Seite
geht es zum nächsten Lied. **Griffbilder** lassen sich hier direkt ein- und
ausschalten (gleiche Einstellung wie unter Einstellungen → Anzeigen), ebenso die Gitarren-Akkorde
(**Akk.** bzw. Taste A).

Bluetooth-Fußpedale („Page Turner“) senden meist Bild↑/↓ oder Pfeiltasten und funktionieren
damit ohne Einrichtung. Sendet ein Pedal →/←, wechselt es einspaltig das Lied und blättert zweispaltig um. Geblättert wird in der Reihenfolge der Liederliste (ggf. gefiltert).

## Live-Modus (Lagerfeuer)

Einer singt vor und wählt die Lieder – alle anderen sehen sie sofort auf ihrem Handy, mit Akkorden in der
richtigen Tonart. Menü **⋯ → Live-Modus**.

- **Vorsingen:** *Live starten* zeigt einen **QR-Code** und einen Code (z. B. `K7MQ-2XPA`); *Link kopieren*
  bzw. *Teilen* schickt den Beitritts-Link z. B. in den Gruppen-Chat. Danach geht jedes Lied, das du öffnest
  oder im Spielmodus zeigst, an alle – auch Änderungen am Text und die Tonart (bei Setlisten deren Tonart).
  Oben zeigt **LIVE · 3**, dass es läuft und wie viele mitsingen; ein Tipp darauf öffnet Code und QR-Code
  wieder. Lädt man die Seite neu, läuft der Raum mit demselben Code weiter.
- **Mitsingen:** QR-Code mit der Handy-Kamera scannen (öffnet die App und tritt bei) oder den Code unter
  ⋯ → Live-Modus eingeben. Ein eigenes Liederbuch oder Konto braucht man nicht – das Lied wird mitgeschickt
  und erscheint im Spielmodus. Dort: **−/+** transponiert zusätzlich nur für dich (z. B. mit Capo),
  **Übernehmen** legt das Lied in dein eigenes Liederbuch. Spielmodus schließen = Live-Modus verlassen.
- **Technik:** Alle Geräte brauchen Internet (mobile Daten reichen). Die Lieder gehen Ende-zu-Ende
  verschlüsselt (AES-GCM, Schlüssel aus dem Raum-Code) über zwei öffentliche MQTT-Server (HiveMQ, EMQX)
  parallel; die sehen nur verschlüsselte Daten und IP-Adressen. Das letzte Lied heben sie auf, damit
  Nachzügler es sofort sehen. Kein eigener Server, kein Konto. Code: `src/live/` und `src/live-ui.js`.

## Setlisten

Reiter **Setlisten** in der linken Spalte: Lieder in fester Reihenfolge, z. B. für einen
Auftritt. Lieder über „Lied hinzufügen …“ suchen und anklicken; Reihenfolge per Ziehen oder
über **⋯** (nach oben/unten). Unter **⋯** gibt es pro Eintrag eine **Notiz** (z. B. „Capo 2“,
erscheint im Spielmodus) und eine **eigene Transposition** nur für diese Setliste.
**Spielen** startet den Spielmodus in Setlisten-Reihenfolge, **Drucken** druckt genau diese
Lieder in dieser Reihenfolge. Setlisten werden mit synchronisiert – in gemeinsamen
Liederbüchern sieht die ganze Band dieselben Setlisten.

## Akkorde per Antippen

- **Handy:** *Bearbeiten* → **Text | Akkorde** (kleiner Umschalter hinter dem „?“ in der Knopfleiste). Unter *Akkorde* steht das Lied wie in der Vorschau;
  die antippbaren Zeilen sind leicht unterstrichen. Die App merkt sich, was zuletzt gewählt war.
- **PC:** Knopf **[A] Akkorde** in der Leiste über der Vorschau; oben erscheint der Hinweis mit **Fertig**.

Ein Tipp auf ein Wort setzt den Akkord **vor das Wort** (bei „Gas-o-line“ vor die getippte Silbe); steht im
Wort schon ein Akkord, wird dieser ausgewählt. Ein roter Strich zeigt die Einfügestelle, mit **◀ ▶** rückt
sie um einen Buchstaben. Die Auswahl bietet die **Akkorde des Liedes**, **anderer Akkord …** (z. B. `Em7`,
`D/F#`) und – wenn dort einer steht – **entfernen**. Der Akkord kommt als `[G]` in den Text; „Rückgängig“
in der Meldung macht es ungeschehen. Transponiert wählt man in der angezeigten Tonart, geschrieben wird
zurücktransponiert. Nicht in Nur-Lesen-Büchern. Logik: `src/core/chord-place.js`.

## Liedinfo: Capo, Takt, Tempo, Dauer

Über dem Editor gibt es das Feld **Liedinfo** (einklappbar) mit Titel, Interpret, Tonart,
Capo, Takt, Tempo und Dauer. Es schreibt die üblichen ChordPro-Angaben in den Kopf des Liedes
(`{capo: 2}`, `{time: 3/4}`, `{tempo: 96}`, `{duration: 3:20}`) und zeigt umgekehrt an, was im Text steht.
Die **Dauer** bestimmt, wie schnell der Spielmodus scrollt (ohne Angabe: 3 Minuten).
Capo und Takt erscheinen im Liedkopf (auch im Druck) und als Kennzeichen über der Vorschau;
beim Import aus Ultimate Guitar werden „Capo“, „Time“ und „Tempo“ erkannt.

**Spalten pro Lied:** Unter *Spalten* lässt sich je Lied **einspaltig** oder **zweispaltig**
wählen (ChordPro `{columns: 1}` bzw. `{columns: 2}`). Das geht im Druck vor der allgemeinen
Einstellung *Einstellungen → Druck → Spalten*, auch auf den Folgeseiten eines langen Liedes;
„wie Einstellung“ entfernt die Angabe wieder. Dasselbe geht direkt in der **Druck-Vorschau**: Rechtsklick
bzw. lang drücken auf eine Seite des Liedes → *wie eingestellt / einspaltig / zweispaltig* – die Vorschau
setzt sofort neu. Deckblatt und Inhaltsverzeichnis bleiben einspaltig.
Bei zweispaltigen Liedern steht der Liedkopf (Titel, Interpret, Infozeile, Griffbilder) über
beiden Spalten – beide Spalten beginnen erst darunter.

## Tags, Notizen, Papierkorb

- **Tags** (Liedinfo → Tags, mit Komma trennen) werden als ChordPro-Standard `{tag: Advent}`
  gespeichert. Über der Liederliste erscheinen sie als Filter; die Suche findet sie auch.
- **Notiz** (Liedinfo → Notiz): privater Hinweis zum Lied, sichtbar in Vorschau und Spielmodus,
  nicht im Druck; wird mit gesichert und synchronisiert.
- **Papierkorb** (Menü): gelöschte Lieder wiederherstellen oder endgültig löschen.

## Einstellungen

Die Einstellungen sind nach Fragen gegliedert; links springt man zu einem Bereich, jeder Bereich
lässt sich einklappen:

| Bereich | Inhalt |
|---|---|
| **Anzeigen** | was im Lied zu sehen ist: Gitarren-Akkorde, Griffbilder, Mundharmonika-Tabs (eine oder zwei Zeilen), Gitarren-Tabs, Abschnittsnamen, Interpret |
| **Liedtext** | Schrift, Größe, Zeilenabstand, wie der Refrain hervorgehoben wird |
| **Akkorde & Harp-Tabs** | Schrift und Größe, Farbe der Akkorde, fett, Farbe der Harp-Tabs |
| **Titel & Interpret** | Ausrichtung, Titel und Interpret gestalten |
| **Druck** | Papier, Spalten, Seitenrand, Seitenzahlen |
| **App** | dauerhaft speichern, Version |

Optionen, die gerade nicht wirken, sind ausgegraut – z. B. „Griffbilder“, wenn die Gitarren-Akkorde
aus sind. **Gitarren-Akkorde aus** zeigt nur Text (und ggf. Mundharmonika-Tabs): Akkorde,
reine Akkordzeilen wie `| C | G |`, Akkordraster und Griffbilder verschwinden – in Vorschau,
Spielmodus und Druck. Auch per Rechtsklick auf die Vorschau → *Anzeigen*.

## Titel & Interpret gestalten

Unter **Einstellungen → Titel & Interpret**:

- **Ausrichtung** des Liedkopfs: links oder mittig (Titel, Interpret, Infozeile und Griffbilder)
- **Titel:** Schriftart (oder „wie Liedtext“), Größe, fett, Großbuchstaben, Farbe
- **Interpret:** (anzeigen unter *Anzeigen*) **neben dem Titel** („Titel – Interpret“ in einer Zeile) oder
  darunter, Größe, kursiv, Farbe – Größe/kursiv/Farbe gelten auch für den Untertitel

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
Über der Liste steht dann **„Gefiltert: 12 von 40 Liedern – aufheben“**; *aufheben* zeigt wieder alle
(die Griffe bleiben gemerkt). Das Eingabefeld lässt sich **einklappen** (Pfeil am Knopf oder Enter) – der Filter
bleibt dabei aktiv, der Knopf zeigt dann kurz deine Griffe („🎸 G C D Em“). Der Spielmodus blättert in dieser gefilterten Liste.

## Griffbilder und Capo-Hilfe

Im Liedkopf erscheinen **Griffbilder** aller vorkommenden Akkorde – in der gespielten, also
transponierten Form (abschaltbar unter Einstellungen → Anzeigen). Bekannte offene Griffe kommen
aus einer Tabelle, alle anderen werden aus den verschiebbaren E- und A-Barré-Formen berechnet;
ein Test prüft jeden Griff (12 Grundtöne × 17 Akkordtypen) gegen die Akkordtöne.
Slash-Akkorde (G/B) zeigen den Grundgriff.

**Capo-Hilfe** (unter „Liedinfo“): schlägt Capo-Lagen vor, in denen möglichst viele Akkorde
ohne Barré greifbar sind – z. B. ein Lied in B-Dur mit Capo 3 und G-Griffen. Ein Klick setzt
Capo und Transposition so, dass der Klang gleich bleibt.

## Mundharmonika- und Gitarren-Tabs

Mundharmonika-Töne stehen wie Akkorde in eckigen Klammern über der Silbe und erscheinen in einer
eigenen Farbe – Standard Blau, das sich auch bei Rot-Grün-Schwäche gut von roten Akkorden abhebt
(einstellbar unter *Einstellungen → Akkorde & Harp-Tabs*):

    I [C][4]come from [5]Ala[6]bama with my [G][-5]banjo
    [4] [-4] [5] [6] [6] [-6] [6] [5]

`4` blasen, `-4` ziehen (`+4` geht auch), `-3'` `-3''` oder `-3b` Bending, `6o` Overblow,
`[7 8]` (auch `[(7 8)]`, `[7,8]`, `[7+8]`) mehrere Löcher gleichzeitig – angezeigt als **(7 8)**;
Kanäle 1–16. Sie werden nie transponiert und zählen
nicht als Akkorde (keine Griffbilder). Beim **Einfügen** wird eine Zeile wie `4  -4  5` über dem
Text automatisch erkannt – auch zusammen mit einer Akkordzeile darüber oder darunter:

          C                         G
          6        6      6     5   -4
    Oh my darling, oh my darling, oh my darling Clementine

Auch die Schreibweise von **harptabs.com** wird verstanden: `-6-6` (Töne ohne Leerzeichen),
`7,8`, `4+5` oder `(7 8)` (zwei Löcher zugleich) und `-3"` (ganzer Ton gebogen -> `[-3'']`).
Dort stehen die Zahlen oft eine Spalte neben dem Silbenanfang – sie rücken auf den Wortanfang;
bei Wörtern mit Bindestrich („Gas-o-line“) auf den Silbenanfang. Ein „Intro:“ oder „Solo:“ endet
an der Leerzeile, wenn danach Liedtext kommt; „Key: C Major (… Harp)“ wird ein Hinweis. Das
Lesezeichen „Ins Liederbuch“ übernimmt auf harptabs.com auch Titel und Interpret.

**Eine oder zwei Zeilen:** Unter *Einstellungen → Anzeigen → Akkorde und Harp-Tabs* (oder per
Rechtsklick auf die Vorschau → *Anzeigen → Harp-Tabs in eigener Zeile*) wählst du, ob Akkord und
Ton nebeneinander stehen oder untereinander – Akkorde oben, Tabs direkt über dem Text. Das gilt
für Vorschau, Spielmodus und Druck, und **Lied teilen → als Text** schreibt die Tabs dann ebenfalls
in eine eigene Zeile (die sich wieder einfügen lässt).

Gitarren-Tabs stehen wie bisher in `{start_of_tab}` … `{end_of_tab}`.

Beide lassen sich getrennt ausblenden – unter **Einstellungen → Anzeigen**, per
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

## Mit anderen teilen – welcher Weg?

**⋯ → Mit anderen teilen …** (auch im Cloud-Dialog, Karte *Mit anderen teilen*) fragt zuerst, was die anderen können sollen:

- **Mitbearbeiten – gemeinsames Liederbuch:** Alle ändern mit, jeder braucht ein Google-Konto. Liegt das Buch
  schon in Google Drive, geht es direkt zu *Mitglieder* (E-Mail eingeben, einladen). Sonst bietet die App an,
  das Buch auf Google Drive umzustellen oder ein neues gemeinsames Liederbuch anzulegen und die Lieder zu
  übernehmen. Bei WebDAV: den Ordner auf dem Server teilen (siehe unten).
- **Nur lesen – Abo:** führt zu *Veröffentlichen …* (siehe nächster Abschnitt); die anderen brauchen kein Konto.
- Außerdem: **ein einzelnes Lied schicken** (Datei, Text, PDF) oder **gemeinsam singen** (Live-Modus).

## Liederbücher abonnieren (private Gruppen)

Eine Person pflegt ein Liederbuch, die anderen **abonnieren** es: Sie sehen es als eigenes
Liederbuch, **nur zum Lesen**, und bekommen Änderungen automatisch (beim Öffnen und alle
30 Minuten). Gedacht für einen **privaten Kreis** – Band, Familie, Freunde.

**Veröffentlichen** (⋯ → *Mit anderen teilen …* → *Nur lesen – Abo*, oder Cloud → *Mit anderen teilen* → *Abo veröffentlichen …*):
alle Lieder, Lieder mit einem Tag oder eine Setliste. Die App legt die Abo-Datei in euren
**Sync-Ordner** (WebDAV, Unterordner `Abo/`; nur, wenn die App gerade darüber abgleicht) – Abonnenten
melden sich dort mit ihrem eigenen Benutzer an –
oder bietet sie zum **Herunterladen** an (dann selbst in einen geschützten Ordner legen; der
vorgeschlagene Name enthält einen Zufallsteil). Danach gibt es einen **Einladungslink** zum
Weitergeben. Erneut veröffentlichen ersetzt die Datei, der Link bleibt gleich. Transposition und
♯/♭-Schreibweise gehen mit (Abonnenten können selbst umstellen, bis du sie änderst), Notizen nicht. Mit **„Automatisch aktualisieren“** veröffentlicht die App Änderungen
an diesen Liedern (auch solche, die über den Sync-Ordner von anderen Geräten kommen) etwa 20 Sekunden
später von selbst – solange sie auf deinem Gerät geöffnet ist.

**Abonnieren:** Einladungslink öffnen – oder Cloud → *Abo hinzufügen …* und den Link einfügen.
Verlangt der Ordner eine Anmeldung, fragt die App nach Benutzername und Passwort (bleiben auf
diesem Gerät). Im Abo kann man transponieren, eigene Notizen schreiben, spielen und drucken;
**Rechtsklick → In „Mein Liederbuch“ kopieren** macht aus einem Lied eine eigene, bearbeitbare
Fassung. Die Leiste über der Liste zeigt den Stand, führt zurück zu **„Mein Liederbuch“**, aktualisiert auf
Knopfdruck und beendet das Abo. Zwischen den Liederbüchern wechselt man auch oben über den Namen.
Unter **Liederbücher** (oben links in der Liederbuch-Auswahl → *Liederbücher verwalten …*) steht bei
jedem Abo die Adresse (zum Kopieren), der Stand und „Abo beenden“.

**Urheberrecht:** Liedtexte und Melodien (auch Harp-Tabs) sind meist geschützt (bis 70 Jahre nach
dem Tod der Urheber). Weitergeben an einen privaten Kreis ist erlaubt, öffentlich bereitstellen
nicht. Die Abo-Datei ist **nicht verschlüsselt** – geschützt ist sie nur durch den Ort: Sie gehört
in einen Ordner mit Anmeldung, nicht unter eine offene Adresse (z. B. GitHub Pages). Frei öffentlich
geteilt werden dürfen nur gemeinfreie Lieder (z. B. Volkslieder), eigene Lieder und Lieder unter
freier Lizenz. (Keine Rechtsberatung.)

Die Datei ist lesbares JSON (`format: "liederbuch-abo"`, siehe `src/formats/abo.js`).

## Mehrere Liederbücher

Oben links in der Liederbuch-Auswahl **＋ Neues Liederbuch …** legt man beliebig viele eigene
Liederbücher an – jedes mit eigener Datenbank auf dem Gerät und **eigenem Speicherort**: nur auf diesem
Gerät, Google Drive, Dropbox oder WebDAV. Auch das **Konto** ist pro Buch frei: Das Band-Liederbuch
kann im Drive des Band-Kontos liegen, das private in der eigenen Dropbox. Bei der ersten Anmeldung
fragt Google bzw. Dropbox nach dem Konto (auch bei „Mein Liederbuch“); der Cloud-Dialog zeigt, welches
Google-Konto das geöffnete Buch nutzt. Ein anderes Konto: *Trennen*, dann neu verbinden. Optional werden
die Lieder des geöffneten Buchs übernommen.

- Gewechselt wird oben links in der Kopfleiste; abgeglichen wird immer das **geöffnete** Buch (die
  anderen beim Öffnen).
- **Rechtsklick** (am Handy: lang drücken) auf ein Buch in der Auswahl zeigt seine Optionen: Öffnen,
  Umbenennen, Entfernen bzw. Verlassen/Abo beenden, beim geöffneten Buch auch die Cloud-Einstellungen.
  Rechtsklick auf den Namen oben öffnet die Optionen des geöffneten Buchs.
- **Der Name gleicht mit ab:** Umbenennen auf einem Gerät gilt nach dem nächsten Abgleich auf allen (bei
  gemeinsamen Büchern für alle Mitglieder); bei Widerspruch gewinnt die neueste Umbenennung, ein selbst
  gewählter Name immer gegen den Standardnamen „Mein Liederbuch“. In Google Drive heißt die Datei mit
  („Liederbuch – DPSG Liederbuch.json“); das persönliche Buch erkennt die App an einer unsichtbaren Kennung,
  nicht am Dateinamen. Bei WebDAV steht der Name in `Liederbuch.json`, bei Dropbox in der Liederbuch-Datei.
  Alle Geräte brauchen dafür Version 2.3.10 oder neuer.
- **Google Drive / Dropbox:** Datei `Liederbuch – <Name>.json` (im Drive bzw. App-Ordner).
  **WebDAV:** eigener Ordner, vorbelegt neben dem Ordner des geöffneten Buchs.
- **Liederbücher verwalten …** (ebenfalls in der Auswahl oben, oder im Cloud-Dialog unten
  *Liederbücher …*) zeigt alle Bücher mit ihrem Speicherort; dort auch Abos und Einladungen.
  Abgleich, Mitglieder und Veröffentlichen des geöffneten Buchs stehen unter **Cloud**.
- **Umbenennen** (auch „Mein Liederbuch“) ändert nur den Namen in der App, die Datei behält ihren
  Namen. **Entfernen** löscht das Buch auf diesem Gerät; was in der Cloud liegt, bleibt.
- **Umziehen** zu einem anderen Speicherort: unter **Cloud** *Trennen*, anderen Speicherort wählen,
  *Verbinden* – das Gerät hat alle Lieder und lädt sie dort hoch (liegen dort schon welche, wird
  zusammengeführt). Die alte Datei bleibt, wo sie war.
- „Mein Liederbuch“ behält seine Einstellungen (`Liederbuch.json`); geteilte Bücher (Einladung)
  laufen immer über Google Drive. Neue Bücher starten leer (ohne Beispiellied).

## Cloud-Sync und gemeinsame Liederbücher (Google Drive)

Jedes Liederbuch ist eine Datei in Google Drive; jedes Gerät hat zusätzlich eine vollständige
lokale Kopie (offline nutzbar). Pro Lied gewinnt die zuletzt geänderte Fassung, Löschungen
werden mit abgeglichen. Eigene Änderungen werden nach ~1,5 s hochgeladen, fremde alle ~15 s
und beim Zurückwechseln in die App geholt. Ein veralteter Stand überschreibt nie einen neueren:
Geschrieben wird nur, wenn die Datei noch die zuletzt gelesene Fassung ist, sonst wird erst
zusammengeführt.

Anmelden: **Cloud → Mit Google anmelden** – mehr ist auf keinem Gerät einzutragen (OAuth 2 im
Browser, ohne eigenen Server; auf iPhone/iPad per Weiterleitung). Google meldet nach etwa einer
Stunde ab; dann zeigt der Cloud-Knopf „Anmelden“, ein Tipp genügt (bis dahin wird lokal
weitergespeichert).

- **Mein Liederbuch** – `Liederbuch.json` im eigenen Drive, für alle eigenen Geräte.
- **Teilen per E-Mail-Einladung** – unter **Cloud → Mitglieder** E-Mail-Adresse eintragen und Rechte
  wählen: **nur lesen** (Abonnenten) oder **darf bearbeiten**. Google schickt eine Mail mit einem
  Link zur App (`#drive=<Datei-ID>`); wer ihn öffnet, meldet sich an, bestätigt die vorgewählte Datei
  in der Google-Auswahl und hat das Liederbuch. Leserechte setzt Google selbst durch; die App sperrt
  dann das Bearbeiten und holt nur ab. Rechte lassen sich jederzeit ändern oder entziehen.
- **Weitere Liederbücher** (z. B. „Band“) – siehe „Mehrere Liederbücher“: Mit Speicherort Google Drive
  wird daraus `Liederbuch – Band.json`, eine eigene Datei, die sich ebenso teilen lässt.

Sicherheit: Die App ist öffentlich, die Lieder nicht. Zugriff auf ein Drive gibt es nur über
die Google-Anmeldung des jeweiligen Kontos, und die App bekommt nur die Berechtigung
`drive.file` (ausschließlich ihre eigenen bzw. ausdrücklich ausgewählten Dateien).

**Einrichtung** (einmalig, Google-Cloud-Projekt, OAuth-Client, API-Schlüssel):
[docs/google-einrichtung.md](docs/google-einrichtung.md). Die Werte kommen fest in
`src/sync/config.js` und gelten dann für alle.

### Dropbox

Jedes Liederbuch kann in Dropbox liegen: **Cloud → Abgleich → Speicherort „Dropbox“**, dann
**Verbinden**. Die Seite führt kurz zu Dropbox (dort anmelden und erlauben) und kommt zurück.
Danach bleibt die Verbindung bestehen – anders als bei Google ist kein erneutes Anmelden nötig.
Die Daten liegen als `Liederbuch.json` (weitere Bücher `Liederbuch – <Name>.json`) im App-Ordner
(*Dropbox → Apps → <Name der App>*); die App sieht nur diesen Ordner. Jedes Buch kann ein eigenes
Dropbox-Konto haben. Gemeinsame Liederbücher mit Einladung gibt es weiterhin über Google Drive.

Einmalig einrichten (kostenlos):

1. <https://www.dropbox.com/developers/apps> → **Create app** → *Scoped access* → **App folder** →
   Namen vergeben (muss bei Dropbox einmalig sein, z. B. „Liederbuch-Janosch“).
2. Reiter *Permissions*: **files.content.read** und **files.content.write** ankreuzen → *Submit*.
3. Reiter *Settings* → *OAuth 2 Redirect URIs*: genau die Adresse der App eintragen, z. B.
   `https://janschke0815.github.io/Liederbuch/` und `http://localhost:5173/` (die App zeigt die
   passende Adresse unter „Dropbox-Einrichtung“ an). *Allow public clients (PKCE)* muss erlaubt sein.
4. Den **App key** in `src/sync/config.js` (`DROPBOX_APP_KEY`) eintragen oder in der App unter
   **Cloud → Abgleich → Dropbox-Einrichtung**. Das *App secret* wird nicht gebraucht – nicht weitergeben.

Eine Dropbox-App im Entwicklungsstatus können auch andere (z. B. Bandmitglieder) mit ihrem eigenen
Dropbox-Konto nutzen; jeder hat dann seine eigene Datei im eigenen App-Ordner.

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

Reines JavaScript (ES-Module) ohne Framework. [Vite](https://vite.dev) dient als Entwicklungsserver
und fasst beim Bauen alles zu wenigen Dateien in `dist/` zusammen. Abhängigkeiten zeigen nur nach unten –
`core` kennt nichts, `formats` kennt `core`, `storage`/`sync` kennen beide, die Oberfläche kennt alles.

    src/core/       reine Musik- und Textlogik ohne Bildschirm: ChordPro-Parser, Akkorde, Capo,
                    Harp-Tabs, Wiederholungen, Liedinfo bearbeiten, Sortierung, Spielmodus-Rechnungen,
                    Textfunktionen (text.js)
    src/formats/    Dateiformate: .cho-Dateien und Dateinamen, ZIP, Sicherung, Text-/UG-Import,
                    Lesezeichen „Ins Liederbuch“, Export als Text
    src/render/     Lied -> HTML (Vorschau, Spielmodus, Druck), Griffbilder
    src/print/      Seitenumbruch, Deckblatt, Inhaltsverzeichnis, Druck-CSS, Druckschriften
    src/settings/   Darstellungs-Einstellungen (prüfen, speichern, als CSS-Variablen anwenden)
    src/storage/    IndexedDB hinter einer Schnittstelle: Lieder, Setlisten
    src/sync/       Abgleich (sync-engine.js), Google Drive, Dropbox, WebDAV (webdav.js: Lieder <-> Dateien,
                    webdav-client.js: HTTP)
    src/ui/         Hauptansicht, ein Modul pro Aufgabe:
                      app-state.js   Liederbuch, Datenbanken, geöffnetes Lied
                      dom.js         kleine Hilfen: $, toast, ask(dialog) …
                      song.js        Lied öffnen/speichern, Vorschau, Transponieren, Liedinfo
                      list.js        Liederliste (Suche, Filter, Sortierung)
                      view.js        Handy-Reiter, Editor ausblenden, Menü
                      song-actions.js, snippets.js, preview-tools.js, paste.js, add-songs.js,
                      files.js, trash.js, share.js, capo-help.js, context-menus.js,
                      abo.js (abonnieren, nur lesen), publish.js (für eine Gruppe veröffentlichen)
                      shortcuts.js   alle Tastenkürzel (daraus auch die Übersicht „?“)
                      app-keys.js    was die Kürzel der Hauptansicht tun
    src/styles/     CSS, eine Datei pro Bereich; Reihenfolge der <link> in index.html zählt
    src/app.js      Einstieg: steckt alles zusammen, öffnet das erste Lied
    src/prefs.js    alles, was pro Gerät gemerkt wird (localStorage), mit Standardwerten
    src/types.js    Beschreibung der Datensätze (nur für den Editor)
    src/play-mode.js, print-ui.js, setlist-ui.js, settings-ui.js, sync-ui.js   größere Bereiche
    src/pwa.js      Service Worker anmelden, Offline-Hinweis, Installieren
    public/         wird unverändert nach dist/ kopiert:
                      sw.js                 Service Worker (Cache „Netz zuerst“)
                      manifest.webmanifest  App-Name, Icons, Dateitypen
                      icons/                App-Icons (icon.svg ist die Vorlage)
    tests/          Browser-Tests (tests/index.html öffnen oder `npm test`, siehe tools/run-tests.mjs)
    tools/          make-docs.py (API-Dokumentation erzeugen), nas-update.sh (NAS holt neue Fassung),
                    css-snapshot.js (CSS-Umbauten vorher/nachher vergleichen)
    docs/           architektur.md, api/ (erzeugt), Anleitung QNAP

Neue gespeicherte Werte gehören in `src/prefs.js`, neue Tastenkürzel in `src/ui/shortcuts.js`.
Einheitliche Schreibweise: `.editorconfig` und `.prettierrc.json` (z. B. `npx prettier --write src`).

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
14. ✅ Bedienbarkeit (1.22): Handy-Ansicht (Liedinfo, Bausteine, Spielmodus-Leiste, größere Knöpfe),
    Sortierung, Warnung bei doppelten Liedern, Tastenkürzel-Übersicht, nächstes Lied im Spielmodus,
    Schriftgröße pro Lied, klarere Cloud-Fehler, „Drucken / PDF“ direkt aus dem Druckdialog, Import-Bericht
15. ✅ Wartbarkeit (1.23): `app.js` in Module unter `src/ui/` aufgeteilt, Dateiformate in `src/formats/`,
    gemeinsame Hilfen (`ui/dom.js`, `core/text.js`), gespeicherte Werte zentral (`prefs.js`), Tastenkürzel
    aus einer Tabelle, CSS nach Bereichen (`src/styles/`), Spielmodus-Rechnungen und WebDAV-HTTP getrennt
16. ✅ Einfügen von harptabs.com (1.24): Akkord-, Harp- und Textzeile werden eine Zeile; Schreibweisen
    `-6-6`, `7,8`, `-3"` erkannt; Intro/Solo endet vor dem Liedtext
17. ✅ Einstellungen übersichtlicher (1.25): Bereiche nach Fragen (Anzeigen, Liedtext, Akkorde,
    Titel & Interpret, Druck, App), abhängige Optionen ausgegraut; Gitarren-Akkorde ausblendbar
18. ✅ Liederbücher abonnieren (1.26): für private Gruppen veröffentlichen (WebDAV-Ordner oder Datei),
    per Einladungslink abonnieren, nur lesen, automatisch aktualisieren, Lieder ins eigene Buch kopieren
19. ✅ Cloud-Dialog übersichtlicher (1.27): Bereiche „Liederbücher auf diesem Gerät“, „Abgleich zwischen
    Geräten“, „Mitglieder“, „Für eine Gruppe veröffentlichen“; Abo-Adresse und „Abo beenden“ dort
20. ✅ Dropbox als Speicherort (1.28): Anmeldung per PKCE ohne eigenen Server, bleibt verbunden,
    Datei im App-Ordner
21. ✅ Umstellung auf Vite (2.0): Entwicklungsserver mit automatischem Neuladen, gebaute App in `dist/`,
    GitHub Pages baut selbst; Grundlage für fertige Bibliotheken (z. B. Google-Anmeldung, Live-Modus)
22. ✅ Google Drive neu (2.1): nur noch „Mit Google anmelden“ (OAuth 2 im Browser, iPhone per Weiterleitung),
    Einladung per E-Mail als Leser oder Bearbeiter mit Link, Leserechte setzt Google durch;
    Abo liefert Transposition mit
23. ✅ Mehrere Liederbücher (2.2): beliebig viele eigene Liederbücher, jedes mit eigenem Speicherort
    (Gerät, Google Drive, Dropbox, WebDAV) und eigenem Konto; umbenennen, entfernen
24. ✅ Live-Modus fürs Lagerfeuer (2.3): ein Gerät wählt das Lied, alle anderen sehen es sofort; Beitritt
    per QR-Code/Link ohne Konto, Lied wird verschlüsselt über öffentliche MQTT-Server mitgeschickt
    (statt Peer-to-Peer: das scheitert im Mobilfunk oft); Mitsinger transponieren zusätzlich für sich
25. Mehrsprachigkeit: alle Texte der Oberfläche in Sprachdateien (`src/i18n/de.js`, Zugriff über `t('schlüssel')`),
    zuerst Englisch; Sprache folgt dem Browser und ist unter Einstellungen → App umstellbar. Schrittweise nach
    Bereichen umbauen (Kopfleiste, Liste, Menü → Dialoge → Hilfetexte); ein Test meldet fehlende Übersetzungen
