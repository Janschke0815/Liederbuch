# Änderungen

Alle Versionen des Liederbuchs, die neueste zuerst. Versionsnummern: **Hauptversion.Fahrplan-Punkt.Korrektur**
(siehe „Fahrplan“ im README). Welche Version läuft, steht in der App unter Einstellungen → Version.

Die Versionsanzeige gibt es seit 1.13.0 – die Nummern davor sind nachträglich nach den Fahrplan-Punkten vergeben.
Ab 2.0 (Umstellung auf Vite) zählt der mittlere Teil die Fahrplan-Punkte seit 2.0: Punkt 22 wird 2.1, Punkt 23 wird 2.2 usw.

---

## 2.3.1 – 23.11.2026 · Aufgeräumte Kopfleiste am PC

- **Kopfleiste am PC:** Statt acht unbeschrifteter Symbole stehen oben rechts nur noch **Einfügen**, **Drucken**
  und **Live** – mit Beschriftung. Alles Weitere (Datei öffnen, Lied teilen, Sichern, Papierkorb, Einstellungen,
  Tastenkürzel) steht im Menü **⋯**, in Gruppen geordnet – dieselbe Liste wie am Handy.
- **Leiste anpassen:** Jede Aktion lässt sich an die Leiste anheften, z. B. Einstellungen oder Sichern, und die
  Reihenfolge ändern – unter ⋯ → *Leiste anpassen …* oder per Rechtsklick auf einen Eintrag bzw. Knopf.
  Bei wenig Platz zeigt die Leiste nur Symbole; reicht auch das nicht, rutschen die letzten Knöpfe ins Menü.

## 2.3.0 – 23.11.2026 · Live-Modus fürs Lagerfeuer

- **Live-Modus** (Menü ⋯ → Live-Modus): Einer singt vor und wählt die Lieder, alle anderen sehen sie sofort
  auf ihrem Handy – mit Akkorden in der richtigen Tonart.
  - **Vorsingen:** „Live starten“ zeigt einen QR-Code und einen Code zum Beitreten; „Link kopieren“/„Teilen“
    schickt den Link z. B. in den Gruppen-Chat. Jedes Lied, das du öffnest oder im Spielmodus zeigst, geht an
    alle, auch Textänderungen und die Tonart. Oben zeigt „LIVE · 3“, wie viele mitsingen.
  - **Mitsingen:** QR-Code scannen oder Code eingeben – ohne eigenes Liederbuch und ohne Konto. Das Lied
    erscheint im Spielmodus; mit −/+ transponierst du zusätzlich nur für dich (z. B. mit Capo), „Übernehmen“
    legt es in dein eigenes Liederbuch. Wer später dazukommt, sieht sofort das aktuelle Lied.
  - Alle Geräte brauchen Internet (mobile Daten reichen). Die Lieder gehen Ende-zu-Ende verschlüsselt über
    öffentliche Vermittlungs-Server (HiveMQ, EMQX) – siehe Datenschutzerklärung, Abschnitt 5.

## 2.2.12 – 23.11.2026 · Spaltenbreiten einstellbar

- **Breite von Liederliste, Editor und Vorschau** lässt sich auf breiten Bildschirmen ändern: die Trennlinie
  rechts neben der Liste bzw. dem Editor ziehen. Doppelklick stellt die Standardbreite wieder her; mit Tab
  angewählt geht es auch mit ← / →. Die Breiten bleiben auf dem Gerät gespeichert (die Liste höchstens 40 %
  des Fensters, Editor und Vorschau mindestens 260 px).

## 2.2.11 – 23.11.2026 · Optionen je Liederbuch per Rechtsklick

- **Liederbuch-Auswahl oben links** ist jetzt ein eigenes Menü: **Rechtsklick** (am Handy: lang drücken) auf ein
  Buch zeigt seine Optionen – Öffnen, Umbenennen, Entfernen (bzw. Verlassen/Abo beenden) und beim geöffneten Buch
  die Cloud-Einstellungen. Rechtsklick auf den Namen oben öffnet die Optionen des geöffneten Buchs.- Lange Buchnamen werden oben sauber mit „…“ gekürzt.

## 2.2.10 – 23.11.2026 · Pfeiltasten blättern im Zwei-Spalten-Modus

- **→ / ← blättern zweispaltig um** (eine Doppelseite weiter/zurück), statt das Lied zu wechseln. Viele
  Bluetooth-Blätterpedale senden genau diese Tasten – damit überspringt das Pedal keine Lieder mehr.
  Nach der letzten Seite geht es wie gewohnt zum nächsten Lied; einspaltig wechseln →/← weiter das Lied.

## 2.2.9 – 23.11.2026 · Zwei Spalten: von Hand umblättern

- **Zweispaltiger Spielmodus von Hand blätterbar:** rechts bzw. links ins Lied tippen, waagerecht wischen
  (nach links = weiter), die Pfeile ‹ › an den Rändern oder Mausrad/Touchpad. Bisher ging das nur mit Tastatur
  oder Pedal – auf dem Tablet ohne Tastatur gar nicht.
- **Schnelles Mehrfach-Blättern** (z. B. zweimal kurz aufs Pedal) geht nicht mehr verloren: Dreimal drücken sind
  jetzt drei Seiten, vorher manchmal nur zwei.
- Beim Wechsel zum nächsten Lied springt eine gerade laufende Blätter-Bewegung nicht mehr ins neue Lied hinein.

## 2.2.8 – 23.11.2026 · Feld „Dauer“ in der Liedinfo

- **Dauer** steht jetzt in der Liedinfo neben Tempo (z. B. `3:20`). Danach richtet sich, wie schnell der
  Spielmodus scrollt bzw. umblättert – ohne Angabe nimmt er 3 Minuten an. Bisher ging das nur mit `{duration: …}` im Text.
  Die Dauer erscheint auch in der Kurzzeile der Liedinfo; eine ungültige Eingabe (z. B. „3,20“) wird rot umrandet.

## 2.2.7 – 22.11.2026 · Übersichtlicher am Handy, leichter Einstieg

- **So geht's los:** Solange ein Liederbuch höchstens ein Lied hat, zeigt die Liste vier Wege zum Start –
  Lied schreiben, Lied aus dem Netz einfügen, Datei öffnen, mit anderen Geräten abgleichen. „Ausblenden“ blendet sie dauerhaft aus.
- **Einstellungen am Handy:** Oben stehen die Bereiche als Knöpfe (Anzeigen, Liedtext, Akkorde & Harp, Titel & Interpret,
  Druck, App); darunter erscheint immer nur der gewählte Bereich statt einer langen Liste. Schalter stehen neben ihrem Text,
  der Kopf ist kürzer, „Zurücksetzen“ und „Speichern“ passen in eine Zeile.
- **Leiste über dem Lied (Handy):** „Spielen“ ist beschriftet; ♯/♭ erscheint erst beim Transponieren – sonst passt alles in eine Zeile.
- **Editor am Handy:** Die Einfüge-Knöpfe brauchen zwei statt vier Zeilen.
- **Tastenkürzel** fehlen im Menü auf reinen Touch-Geräten (dort gibt es keine Tastatur).

## 2.2.6 – 22.11.2026 · Installieren-Hilfe fürs iPhone

- **⋯ → Installieren** gibt es jetzt auch auf dem iPhone/iPad (und auf Android, wenn der Browser die
  Installation gerade nicht selbst anbietet). Statt der Installation öffnet sich dort eine kurze Anleitung
  passend zu Gerät und Browser – auf dem iPhone: ••• → Teilen → „Zum Home-Bildschirm“.
- Läuft die Seite im eingebauten Browser einer anderen App (z. B. nach einem Link aus WhatsApp oder Mail),
  sagt die Hilfe, dass man sie erst in Safari bzw. Chrome öffnen muss, und bietet „Adresse kopieren“ an.
- Als installierte App ist der Eintrag weg.

## 2.2.5 – 22.11.2026 · Datenschutzerklärung

- Neue **Datenschutzerklärung** (`datenschutz.html`), verlinkt in den Einstellungen und im Cloud-Dialog:
  kein eigener Server, keine Tracker; was die App auf dem Gerät speichert und was sie mit Google Drive,
  Dropbox und WebDAV macht. Google verlangt sie, damit die App für alle Google-Konten freigegeben
  („veröffentlicht“) werden kann.

## 2.2.4 – 22.11.2026 · Eigener Dialog „Liederbücher“, Mein Liederbuch umbenennen

- **Liederbücher** haben einen eigenen, kleinen Dialog (oben in der Auswahl „Liederbücher verwalten …“):
  Liste mit Speicherort, Neues Liederbuch, Einladung öffnen, Abo hinzufügen. Der **Cloud**-Dialog zeigt
  nur noch Abgleich, Mitglieder und Veröffentlichen des geöffneten Buchs; unten führt „Liederbücher …“
  hinüber und zurück.
- **„Mein Liederbuch“ lässt sich umbenennen**; Meldungen wie „In … kopieren“ nennen den neuen Namen.
- **Welches Google-Konto?** Der Cloud-Dialog zeigt beim Abgleich über Google Drive das Konto des
  geöffneten Buchs (z. B. „Google Drive · name@gmail.com“), auch in der Meldung „Anmeldung abgelaufen“.
- **Kontoauswahl für jedes Buch:** Auch „Mein Liederbuch“ fragt bei der ersten Anmeldung (oder nach dem
  Trennen) nach dem Google- bzw. Dropbox-Konto – bisher nur die weiteren Bücher.
- Neue Liederbücher starten leer – das Beispiellied gibt es nur noch beim allerersten Start.
- README: wie man ein Buch zu einem anderen Speicherort umzieht (Trennen, anderen Speicherort wählen,
  Verbinden); Dropbox-Abschnitt gilt jetzt für jedes Buch.
- Im Hintergrund: Vor jeder Veröffentlichung laufen jetzt automatisch alle Tests (`npm test`, kopfloser
  Browser) samt Prüfung, dass die Kopfleiste am Handy nicht über den Rand ragt – schlägt etwas fehl,
  wird nichts veröffentlicht.

## 2.2.3 – 22.11.2026 · Kopfleiste am Handy passt wieder

- Seit 2.2.1 war die Liederbuch-Auswahl oben so breit wie ihr längster Eintrag („Liederbücher
  verwalten …“) – am Handy rutschten Cloud und Menü (⋯) über den Rand, man musste nach links wischen.
  Jetzt ist sie nur so breit wie der Name des geöffneten Buchs, lange Namen werden mit „…“ gekürzt.

## 2.2.2 – 22.11.2026 · Google-Dateiauswahl lässt sich immer schließen

- Über der Google-Dateiauswahl (Einladung öffnen) liegt jetzt ein eigener Knopf **✕ Schließen**;
  auch die Esc-Taste schließt sie. Zeigt Google dort einen Fehler (z. B. „Der API-Entwicklerschlüssel
  ist ungültig“), hat die Auswahl selbst keinen Knopf zum Schließen. Danach geht der Cloud-Dialog wieder auf.

## 2.2.1 – 22.11.2026 · Neues Liederbuch direkt oben in der Auswahl

- Die Liederbuch-Auswahl oben links ist jetzt immer da und hat zwei neue Einträge:
  **＋ Neues Liederbuch …** (öffnet gleich das Formular zum Anlegen) und **Liederbücher verwalten …**.
  Man muss dafür nicht mehr im Cloud-Dialog suchen.

## 2.2.0 – 22.11.2026 · Mehrere Liederbücher mit eigenem Speicherort

- **Neues Liederbuch** (Cloud → Liederbücher auf diesem Gerät): beliebig viele eigene Liederbücher,
  jedes mit eigenem Speicherort – nur auf diesem Gerät, Google Drive, Dropbox oder WebDAV.
  Optional mit den Liedern des geöffneten Buchs.
- **Eigenes Konto pro Liederbuch:** Bei der ersten Anmeldung fragt Google bzw. Dropbox nach dem Konto;
  die App merkt es sich und meldet beim nächsten Mal wieder beim richtigen Konto an.
- Google Drive und Dropbox: Jedes weitere Buch ist eine eigene Datei `Liederbuch – <Name>.json`.
  WebDAV: eigener Ordner, vorbelegt neben dem Ordner des geöffneten Buchs.
- In der Liste steht bei jedem Buch, wo es abgeglichen wird; neu sind **Umbenennen** und **Entfernen**.
- **Einladung öffnen** fragt nach dem Google-Konto – die Einladung kann an ein anderes Konto gegangen sein.
- Abgeglichen wird wie bisher das geöffnete Liederbuch. „Mein Liederbuch“ und bestehende geteilte
  Bücher behalten ihre Einstellungen und Anmeldungen.
- Der Live-Modus rückt im Fahrplan auf Punkt 24.

## 2.1.2 – 22.11.2026 · Gemeinsame Liederbücher auch neben WebDAV/Dropbox

- Gleicht das persönliche Liederbuch über WebDAV/Nextcloud oder Dropbox ab, lassen sich trotzdem
  gemeinsame Liederbücher über Google Drive anlegen und Einladungen öffnen. Die Google-Anmeldung
  kommt dabei von selbst; das persönliche Liederbuch bleibt bei seinem Speicherort.
- Die Google-Anmeldung in einem gemeinsamen Liederbuch schaltet den automatischen Abgleich des
  persönlichen Liederbuchs (z. B. über WebDAV) nicht mehr ab.

## 2.1.1 – 22.11.2026 · Einladung öffnen: Dateiauswahl nicht mehr verdeckt

- Beim Öffnen einer Einladung schließt sich der Cloud-Dialog jetzt von selbst, damit die
  Google-Dateiauswahl sichtbar ist. Bricht man dort ab, geht der Cloud-Dialog wieder auf.
- Anleitung zur Google-Einrichtung: Der API-Schlüssel braucht als Website `https://docs.google.com/*`
  und als APIs Picker und Drive – sonst meldet die Dateiauswahl „API-Entwicklerschlüssel ist ungültig“.

## 2.1.0 – 21.11.2026 · Google Drive: nur noch „Mit Google anmelden“

- **Einfachere Anmeldung:** Für Google Drive genügt jetzt „Mit Google anmelden“ – Client-ID und
  Schlüssel trägt niemand mehr ein, sie sind fest in der App hinterlegt (Einrichtung einmalig, siehe
  `docs/google-einrichtung.md`).
- **iPhone/iPad:** In der installierten App öffnet sich kein Anmeldefenster mehr, die Seite wechselt
  kurz zu Google und zurück.
- **Teilen per E-Mail mit Rechten:** Unter *Cloud → Mitglieder* einladen und wählen, ob die Person
  **nur lesen** oder **bearbeiten** darf; Rechte lassen sich jederzeit ändern. Auch „Mein Liederbuch“
  lässt sich so teilen.
- **Einladung mit einem Klick:** Die Mail enthält einen Link zur App. Öffnen, mit Google anmelden,
  die vorgewählte Datei bestätigen – fertig.
- **Nur lesen:** Wer nur Leserechte hat, sieht das Liederbuch schreibgeschützt (Leiste „Nur lesen“),
  bekommt Änderungen automatisch und kann einzelne Lieder ins eigene Liederbuch kopieren. Google lässt
  ohne Schreibrecht ohnehin keine Änderung zu.
- **Klarere Meldungen**, wenn die Anmeldung abgelaufen, widerrufen oder bei Google falsch eingerichtet ist.
- **Abo über den Webserver:** Transposition und ♯/♭-Schreibweise gehen jetzt mit. Abonnenten können
  selbst umstellen, bis der Herausgeber sie ändert. Ältere Abo-Dateien funktionieren weiter.

## 2.0.1 – 21.11.2026 · Fertige App als Download, NAS aktualisiert sich selbst

- **Fertige App zum Herunterladen:** Jede neue Version steht auf GitHub unter *Releases* als
  `liederbuch.zip` bereit – entpacken und auf einen beliebigen Webspace legen, fertig.
- **Die NAS kann sich selbst aktuell halten:** Ein kleines Skript (`tools/nas-update.sh`) holt jede neue
  Fassung automatisch und legt sie in den Web-Ordner. Einrichtung in der QNAP-Anleitung.

## 2.0.0 – 21.11.2026 · Umstellung auf Vite (neue Hauptversion)

- **Für Nutzer ändert sich nichts** – die App sieht gleich aus und funktioniert wie vorher, auch offline.
- **Schneller beim ersten Laden:** Alle Programmteile und Stile werden zu je einer Datei zusammengefasst
  statt rund 90 einzelner Dateien.
- **Neue Version auf GitHub Pages:** wird nach jedem Push automatisch gebaut und veröffentlicht.
- **Für die eigene NAS:** Statt der Quelldateien wird jetzt der Inhalt des Ordners `dist/` kopiert
  (erzeugt mit `npm run build`).
- Grundlage für die nächsten Schritte: einfachere Google-Anmeldung und Live-Modus mit fertigen Bibliotheken.

## 1.28.0 – 21.11.2026 · Dropbox als Speicherort

- **Neuer Speicherort Dropbox** (Cloud → Abgleich → Speicherort): Das persönliche Liederbuch wird über
  deine Dropbox zwischen allen Geräten abgeglichen. „Verbinden“ führt kurz zu Dropbox und wieder zurück.
- **Bleibt verbunden:** Anders als bei Google muss man sich nicht nach einer Stunde neu anmelden.
- Die App sieht in deiner Dropbox nur ihren eigenen Ordner (*Apps → Name der App*), dort liegt
  `Liederbuch.json`.
- Einmalig nötig: eine kostenlose Dropbox-App anlegen und deren App-Schlüssel eintragen
  (Anleitung im README, „Dropbox“).
- Auf dem Handy passen die drei Speicherorte nebeneinander (Beschriftung bricht um).

## 1.27.0 – 19.11.2026 · Cloud-Dialog übersichtlicher

- Der Cloud-Dialog ist in klar getrennte Bereiche gegliedert (wie die Einstellungen):
  **Liederbücher auf diesem Gerät** · **Abgleich zwischen Geräten** · **Mitglieder** (nur gemeinsame
  Liederbücher) · **Für eine Gruppe veröffentlichen**.
- **Abos in der Liste:** Bei jedem abonnierten Liederbuch stehen jetzt die **Adresse** (mit „Kopieren“),
  Herausgeber, Stand und Anzahl der Lieder, dazu „Jetzt aktualisieren“ und **„Abo beenden“** – auch für
  Abos, die gerade nicht geöffnet sind.
- „Verbinden“ und „Trennen“ sitzen jetzt im Bereich „Abgleich“, nicht mehr ganz unten. Ist ein Abo
  geöffnet, blendet der Dialog die Einstellungen zum Abgleich aus (ein Abo wird nie abgeglichen).
- Der lange WebDAV-Erklärtext ist eingeklappt („Was passiert dort? Was muss der Server können?“).

## 1.26.3 – 19.11.2026 · Vom Abo zurück zu den eigenen Liedern

- **„Mein Liederbuch“** in der Abo-Leiste über der Liste: ein Tipp, und du bist wieder bei deinen eigenen
  Liedern. (Wechseln geht weiterhin auch oben über den Namen des Liederbuchs.)
- Nach dem Abonnieren erklärt ein Hinweis, wie man zwischen Abo und eigenen Liedern wechselt. Die eigenen
  Lieder waren nie weg – das Abo ist ein eigenes Liederbuch.

## 1.26.2 – 19.11.2026 · Abo-Datei heißt wie das Abo

- **Dateiname beim Herunterladen:** Die Abo-Datei heißt jetzt wie der eingetragene Name (z. B.
  „Die-Gedanken-sind-frei-….json“) statt immer „Mein-Liederbuch-…“. Die vorgeschlagene Adresse ändert sich
  beim Tippen mit – außer man hat sie selbst angepasst oder schon unter ihr veröffentlicht (dann bleibt
  der Einladungslink gleich).

## 1.26.1 – 19.11.2026 · Abo automatisch veröffentlichen, keine alten Serveradressen

- **Automatisch aktualisieren** (beim Veröffentlichen ankreuzen): Ändern sich Lieder oder Setlisten des Abos,
  veröffentlicht die App etwa 20 Sekunden später von selbst neu – auch bei Änderungen, die über den
  Sync-Ordner von anderen Geräten kommen. Läuft, solange die App beim Herausgeber geöffnet ist; Fehler
  werden einmal gemeldet.
- **Keine fremde Serveradresse mehr:** „Für eine Gruppe veröffentlichen“ bot bisher jede irgendwann
  gespeicherte WebDAV-Adresse als Ziel an und zeigte deren Servernamen. Jetzt nur noch den Sync-Ordner, über
  den die App gerade abgleicht – und ohne Servernamen („in euren Sync-Ordner“).
- **Gespeicherte Adresse und Zugangsdaten löschen:** neuer Knopf im Cloud-Dialog unter WebDAV (solange
  nicht verbunden), um eine alte Adresse loszuwerden.

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
