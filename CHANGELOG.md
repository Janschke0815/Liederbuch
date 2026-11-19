# Änderungen

Alle Versionen des Liederbuchs, die neueste zuerst. Versionsnummern: **Hauptversion.Fahrplan-Punkt.Korrektur**
(siehe „Fahrplan“ im README). Welche Version läuft, steht in der App unter Einstellungen → Version.

Die Versionsanzeige gibt es seit 1.13.0 – die Nummern davor sind nachträglich nach den Fahrplan-Punkten vergeben.

---

## 1.26.0 – 19.11.2026 · Liederbücher abonnieren (private Gruppen)

- **Für eine Gruppe veröffentlichen** (Cloud → Liederbücher): alle Lieder, Lieder mit einem Tag oder eine
  Setliste. Die Datei kommt in den WebDAV-Ordner (Unterordner „Abo“, Abonnenten melden sich dort an)
  oder zum Herunterladen. Danach gibt es einen Einladungslink; erneut veröffentlichen ersetzt die Datei,
  der Link bleibt. Notizen und eigene Transpositionen gehen nicht mit.
- **Abonnieren** per Einladungslink oder „Abo hinzufügen …“. Das Abo ist ein eigenes Liederbuch, **nur zum
  Lesen**, und aktualisiert sich beim Öffnen und alle 30 Minuten („3 neu, 1 geändert“). Transponieren,
  eigene Notizen, Spielen und Drucken gehen; eigene Transposition und Notiz bleiben bei Aktualisierungen.
- **In „Mein Liederbuch“ kopieren** (Rechtsklick) macht aus einem abonnierten Lied eine eigene,
  bearbeitbare Fassung.
- Leiste über der Liste mit Stand, „Aktualisieren“ und „Beenden“. Abos werden nie mit der eigenen Cloud
  abgeglichen.
- Hinweis zum **Urheberrecht** beim Veröffentlichen (nur privater Kreis) und im README. Die Datei ist
  lesbares JSON und nicht verschlüsselt – geschützt durch den Ordner mit Anmeldung.

## 1.25.1 – 18.11.2026 · Harp-Tabs in Blau, Farbe einstellbar

- **Harp-Tabs jetzt blau statt türkis-grün:** Bei Rot-Grün-Schwäche waren sie kaum vom Rot der Akkorde zu
  unterscheiden (Farbabstand bei Rot-Schwäche 28, jetzt 84; bei Grün-Schwäche 52, jetzt 111).
- **Farbe der Harp-Tabs einstellbar** unter Einstellungen → *Akkorde & Harp-Tabs* (Blau, Lila, Schwarz, Grau,
  das bisherige Türkis oder eine eigene Farbe) – z. B. falls die Akkorde selbst blau sind.

## 1.25.0 – 18.11.2026 · Einstellungen übersichtlicher, Akkorde ausblendbar

- **Gitarren-Akkorde ausblenden:** neuer Schalter unter Einstellungen → Anzeigen. Aus: nur Text (und
  Mundharmonika-Tabs) – Akkorde, reine Akkordzeilen wie `| C | G |`, Akkordraster und Griffbilder
  verschwinden in Vorschau, Spielmodus und Druck. Auch per Rechtsklick auf die Vorschau und im
  Spielmodus (Knopf **Akk.**, Taste **A**).
- **Einstellungen neu gegliedert** – nach Fragen statt nach Technik:
  **Anzeigen** (alle Ein/Aus-Schalter zum Inhalt an einer Stelle), **Liedtext**, **Akkorde**,
  **Titel & Interpret** (mit Unterüberschriften „Titel“ und „Interpret“), **Druck**, **App**
  (Speicher und Version zusammen).
- Optionen, die gerade nicht wirken, sind **ausgegraut** – z. B. „Griffbilder“ ohne Akkorde oder die
  Interpret-Gestaltung, wenn der Interpret ausgeblendet ist. Unteroptionen sind eingerückt.
- **Bereiche klar abgegrenzt:** Jeder Bereich hat eine farbige Kopfleiste mit demselben Symbol wie in der
  Navigation, eine rote Kante links und mehr Abstand zum nächsten; Unterüberschriften („Titel“,
  „Interpret“) sind eine Stufe kleiner.

## 1.24.1 – 17.11.2026 · harptabs.com genauer, Doppeltöne, Enter in Dialogen

- **Töne an der richtigen Silbe:** Auf harptabs.com stehen die Zahlen oft eine Spalte neben dem Silbenanfang
  (das Minuszeichen belegt eine Spalte). Beim Einfügen rücken sie jetzt auf den Wortanfang – aus
  `I[4]'ve` wird `[4]I've`. Bei Wörtern mit Bindestrich („Gas-o-line“) auf den Silbenanfang. Genau gesetzte
  Tabs (z. B. `Su[-4]sanna`) bleiben, wie sie sind.
- **Harp-Zeile mit wenigen Tönen** (z. B. nur `4    4`) zwischen Akkordzeile und Text wird jetzt erkannt.
- **„Key: C Major (… on a C Harp)“** wird ein Hinweis statt Liedtext.
- **Lesezeichen „Ins Liederbuch“** übernimmt auf harptabs.com auch Titel und Interpret (Lesezeichen dafür
  einmal neu anlegen).
- **Mehrere Löcher gleichzeitig** werden als **(7 8)** angezeigt – in Vorschau, Spielmodus, Druck und beim
  Teilen als Text. Im Editor gehen `[7 8]`, `[(7 8)]`, `[7,8]` und `[7+8]`.
- **Enter bestätigt Dialoge:** Enter drückt den roten Knopf (z. B. „Speichern“, „Als neues Lied anlegen“).
  Vorher löste Enter „Abbrechen“ aus, weil das der erste Knopf ist. In großen Textfeldern bestätigt Strg+Enter.

## 1.24.0 – 17.11.2026 · Einfügen von harptabs.com

- **Akkorde, Harp-Tabs und Text in einer Zeile:** Steht über dem Liedtext eine Zeile mit Gitarren-Akkorden
  und eine mit Mundharmonika-Tönen (wie oft auf harptabs.com), wird beim Einfügen alles in eine Zeile
  geschrieben – z. B. `[Em][4]Ich geh hinaus`. Die Reihenfolge der beiden Zeilen ist egal.
- **Schreibweisen von harptabs.com:** `-6-6` (Töne ohne Leerzeichen) behält jeden Ton an seiner Stelle,
  `7,8` bzw. `4+5` (zwei Löcher zugleich) wird `[7 8]`, `-3"` (ganzer Ton gebogen) wird `[-3'']`.
- **Intro, Solo & Co.:** Ein Abschnitt wie „INTRO:“ oder „SOLO 1:“ endet an der Leerzeile, wenn danach
  gesungen wird – vorher galt sonst das ganze restliche Lied als Intro.

## 1.23.1 – 16.11.2026 · Dokumentation

- **Architektur-Beschreibung** [`docs/architektur.md`](docs/architektur.md): Schichten, Datenmodell, was beim
  Bearbeiten und Abgleichen passiert, Ereignisse zwischen den Modulen, Diagramme.
- **API-Dokumentation** [`docs/api/`](docs/api/README.md): eine Seite pro Modul mit allen Funktionen, Parametern,
  Rückgabewerten, Klassen und Methoden sowie „Benutzt“ / „Benutzt von“ – erzeugt aus den JSDoc-Kommentaren
  (ähnlich Doxygen) mit `python tools/make-docs.py`, ohne zusätzliche Programme.
- Alle exportierten Funktionen und Methoden haben jetzt einen Kommentar (77 ergänzt);
  `python tools/make-docs.py --check` meldet künftig fehlende.
- Zeichenklasse für Akzente in `core/text.js` wieder lesbar geschrieben.

## 1.23.0 – 16.11.2026 · Wartbarkeit

Keine neuen Funktionen, das Aussehen ist unverändert – der Code ist für Menschen leichter zu pflegen.

- **`app.js` aufgeteilt:** aus 1 414 Zeilen wurden 120; der Rest steckt in kleinen Modulen unter `src/ui/`
  (Liste, Lied öffnen/speichern, Einfügen, Dateien, Teilen, Papierkorb, Kontextmenüs …).
- **Gemeinsame Hilfen** (`ui/dom.js`): `$`, `toast`, `ask(dialog)`, `download` nur noch einmal statt in sieben Kopien.
- **Ordner `src/formats/`:** alles rund um Dateien (.cho, ZIP, Sicherung, Ultimate-Guitar-Import) an einem Ort.
- **`core/text.js`:** Sortieren, Suchtext vereinfachen und Zeilenenden vereinheitlichen gibt es nur noch einmal.
- **`prefs.js`:** alle Werte, die sich ein Gerät merkt, mit Schlüssel und Standardwert an einer Stelle.
- **Tastenkürzel aus einer Tabelle** (`ui/shortcuts.js`): daraus entstehen die Tastenabfrage und die Übersicht „?“.
- **CSS nach Bereichen** in `src/styles/` statt einer großen `app.css`.
- Spielmodus-Rechnungen (`core/play-scroll.js`) und der HTTP-Teil von WebDAV (`sync/webdav-client.js`) getrennt.
- Typbeschreibungen für den Editor (`types.js`, `jsconfig.json`), `.editorconfig`, `.prettierrc.json`,
  Werkzeug `tools/css-snapshot.js` zum Vergleichen von CSS-Änderungen. 15 neue Tests (insgesamt 248).

## 1.22.0 – 16.11.2026 · Bedienbarkeit

- **Handy:** Liedinfo anfangs eingeklappt und höchstens halb so hoch wie der Bildschirm; die Bausteine über dem
  Editor brechen um statt abgeschnitten zu werden; die Lupe verdeckt die Suche nicht mehr; Knöpfe auf
  Touch-Geräten mindestens 44 px groß.
- **Spielmodus:** am Handy nur eine Leiste (Schließen, Liedwechsel, Titel, Start/Stopp), der Rest unter „⋯“;
  bei Setlisten „3 / 12 · Nächstes: …“ unter dem Titel; Schriftgröße wird pro Lied gemerkt.
- **Liste sortierbar** nach Titel, Interpret, zuletzt geändert oder zuletzt gespielt.
- **Doppelte Lieder:** Beim Einfügen, über das Lesezeichen und beim Öffnen von Dateien fragt die App nach –
  überspringen, vorhandenes ersetzen oder als Kopie anlegen.
- **Tastenkürzel-Übersicht** mit Taste **?** oder im Menü.
- Einstellungen: Muster einklappbar. Cloud: Verbindungsfehler bleiben mit Tipp im Dialog stehen, das betroffene
  Feld wird markiert. Druckdialog: „Drucken / PDF“ direkt neben „Vorschau“.
- **ZIP öffnen** zeigt danach, welche Lieder und Setlisten geändert oder neu sind.

## 1.21.0 – 16.11.2026 · ZIP öffnen gleicht Dateien ab

- Beim Öffnen einer Sicherung werden die `.cho`- und `.txt`-Dateien mit der JSON verglichen: **von Hand
  geänderte Dateien gewinnen**, neue Dateien werden neue Lieder bzw. Setlisten. Fehlende Dateien löschen nichts.
- Ohne JSON in der ZIP werden die Dateien mit dem aktuellen Liederbuch abgeglichen.

## 1.20.2 – 16.11.2026

- Einstellungen: Die Bereiche lassen sich einklappen; der Zustand bleibt gespeichert.

## 1.20.0 – 16.11.2026 · Liedkopf

- Interpret wahlweise **in einer Zeile neben dem Titel** („Titel – Interpret“).
- Bei zweispaltigen Liedern steht der Liedkopf über beiden Spalten; die zweite Spalte beginnt erst darunter.

## 1.19.0 – 16.11.2026

- **Spalten pro Lied:** In der Liedinfo lässt sich ein Lied ein- oder zweispaltig setzen (`{columns: 2}`), das geht
  der allgemeinen Einstellung vor.

## 1.18.0 – 16.11.2026

- **Titel & Interpret gestaltbar:** Schrift, Größe, fett, Großbuchstaben, Farbe, kursiv, Ausrichtung.

## 1.17.0 – 16.11.2026

- Druck: Schrift und Seitenzahlen sind in „Optionen …“ eingezogen. Jede Option lässt sich mit 📌 als
  **Schnellwahl** in die Leiste über der Druckvorschau heften.

## 1.16.0 – 16.11.2026

- Druck: **Seitenzahlen** in den Einstellungen abschaltbar.

## 1.15.0 – 16.11.2026 · Sichern als ZIP

- „Sichern“ erzeugt eine ZIP-Datei mit lesbaren `.cho`-Liedern, Setlisten als `.txt`, einer vollständigen
  JSON-Sicherung (inkl. Papierkorb) und einer LIESMICH-Datei. Die ZIP lässt sich mit „Datei öffnen“ wieder einlesen.

## 1.14.0 – 16.11.2026

- **WebDAV-Ablage rein im ChordPro-Format:** nur noch Textdateien (`Lieder/*.cho`, `Setlisten/*.txt`), keine
  Daten-JSON mehr. Transposition und Notiz stehen als Direktiven im Lied. Ältere Ablagen werden umgestellt.

## 1.13.1 – 16.11.2026

- Einstellungen: Die Version steht als eigener Bereich nach „Speicher“.

## 1.13.0 – 16.11.2026 · Versionsanzeige

- Die App zeigt ihre Version in den Einstellungen und als Hinweis am App-Namen.
- Anleitung „Liederbuch auf einer QNAP-NAS per WebDAV“ (`docs/webdav-qnap.md`).

## 1.12 – 16.11.2026

- **WebDAV mit einer `.cho`-Datei pro Lied:** auf dem Server lesbar und auch direkt bearbeitbar; Umbenennen und
  Löschen auf dem Server werden erkannt.

## 1.11 – 16.11.2026

- Dateien passend für Windows: Sync-Datei, Sicherung und geteilte Lieder eingerückt und mit Windows-Zeilenenden
  (CR LF), damit sie im Editor sauber aussehen.

## 1.10 – 15.11.2026

- **Harp-Tabs importieren**, auch Akkord- und Harp-Zeile übereinander. Akkorde und Harp-Tabs wahlweise in
  **einer oder zwei Zeilen**.
- **Lesezeichen „Ins Liederbuch“:** Lieder direkt von Ultimate Guitar übernehmen, mit Titel, Interpret, Capo,
  Tonart und Tempo.
- Editor: Knopf **„Tab“** für Gitarren-Tabs und eine **Übersicht der ChordPro-Syntax** („?“).

## 1.9 – 14.11.2026

- Schriftart und -größe in der Druckvorschau einstellbar – nur für den Druck.

## 1.8 – 14.11.2026

- **Mundharmonika-Tabs** (`[4] [-4] [-3']`); Mundharmonika- und Gitarren-Tabs getrennt ausblendbar.

## 1.7 – 14.11.2026

- Liederbuch über **WebDAV** abgleichen (Nextcloud, QNAP u. a.).

## 1.0 – 1.6 – 14.11.2026 · Grundversion

- **Liederbuch als PWA:** ChordPro-Editor mit Vorschau, Transponieren, Import von Akkorden-über-Text,
  Speicherung im Browser, offline nutzbar, als App installierbar.
- **Oberfläche:** neues Design, Dunkelmodus, Handy-Ansicht, Kontextmenüs per Rechtsklick und langem Drücken.
- **Liedinfo-Formular:** Titel, Interpret, Tonart, Capo, Takt, Tempo; Tags, private Notizen, Papierkorb.
- **Wiederholungen** (`2×`) mit Klammer für Zeile, Zeilengruppe oder Abschnitt.
- **Spielmodus:** Vollbild, automatisches Scrollen, Fußpedal, Nachtmodus, zwei Spalten mit seitenweisem Blättern.
- **Setlisten:** Reihenfolge, Notiz und Transposition pro Eintrag, spielen, drucken, abgleichen.
- **Griffbilder und Capo-Hilfe**, Filter „Was kann ich spielen?“, Zoom der Vorschau, Metronom, Lied teilen.
- **Einfügen:** Titel/Interpret erkennen, mehrere Lieder auf einmal, Strg+V überall.
- **Druck:** Auswahl, Deckblatt, Inhaltsverzeichnis, ein-/zweispaltig, A4/A5/Letter.
- **Cloud-Sync über Google Drive** und gemeinsame Liederbücher; Bitte an den Browser, die Lieder dauerhaft zu speichern.
