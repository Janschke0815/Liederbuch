# API-Dokumentation

Automatisch erzeugt aus den Kommentaren im Quelltext – **nicht von Hand bearbeiten**, sondern die
Kommentare ändern und `python tools/make-docs.py` ausführen. Wie alles zusammenhängt, steht in
[../architektur.md](../architektur.md).

87 Module, 330 exportierte Funktionen, Konstanten und Klassen.

## `src/` – Einstieg und größere Bereiche der Oberfläche

| Modul | Inhalt |
|---|---|
| [`app.js`](app.md) | Einstieg der App: steckt die Teile der Oberfläche zusammen und öffnet das erste Lied. |
| [`books.js`](books.md) | Mehrere Liederbücher auf einem Gerät. |
| [`context-menu.js`](context-menu.md) | Kontextmenü: Rechtsklick (Maus), langes Drücken (Touch) oder Menütaste / Umschalt+F10. |
| [`live-ui.js`](live-ui.md) | Live-Modus: Dialog (Vorsingen / Mitsingen), „LIVE“-Anzeige in der Kopfleiste, Mitsinger-Ansicht im Spielmodus. |
| [`metronome.js`](metronome.md) | Metronom mit Web Audio: genaue Zeitplanung (vorausplanen statt setInterval-Klicks), betonte Eins je nach Taktart. |
| [`play-mode.js`](play-mode.md) | Spielmodus: Vollbild nur mit dem Lied, automatisches Scrollen, Bildschirm bleibt an, Blättern per Tastatur oder Bluetooth-Fußpedal (die senden Bild-/Pfeiltasten). |
| [`prefs.js`](prefs.md) | Alles, was sich die App pro Gerät im Browser merkt (localStorage) – an einer Stelle. |
| [`print-ui.js`](print-ui.md) | Druckdialog (Auswahl + Optionen) und Druckvorschau. |
| [`pwa.js`](pwa.md) | PWA: Service Worker anmelden, Offline-Hinweis, "App installieren". |
| [`sample.js`](sample.md) | Beispiellied für ein leeres Liederbuch (gemeinfrei). |
| [`setlist-ui.js`](setlist-ui.md) | Setlisten in der linken Spalte: Übersicht, Bearbeiten (Reihenfolge, Notiz, eigene Transposition), Spielen und Drucken in Setlisten-Reihenfolge. |
| [`settings-ui.js`](settings-ui.md) | Einstellungsdialog mit Live-Muster. |
| [`sync-ui.js`](sync-ui.md) | Cloud-Knopf, Liederbuch-Auswahl und Dialog (verbinden, gemeinsame Liederbücher, Mitglieder). |
| [`types.js`](types.md) | Beschreibung der wichtigsten Datensätze – nur für Editoren wie VS Code (Autovervollständigung, Hinweise bei Tippfehlern). |
| [`version.js`](version.md) | Version der App – bei jeder veröffentlichten Änderung erhöhen (und das Datum anpassen). |

## `src/ui/` – Hauptansicht – ein Modul pro Aufgabe

| Modul | Inhalt |
|---|---|
| [`ui/abo.js`](ui/abo.md) | Abonnierte Liederbücher: per Einladungslink abonnieren, regelmäßig aktualisieren, beenden – und einzelne Lieder ins eigene Liederbuch kopieren. |
| [`ui/add-songs.js`](ui/add-songs.md) | Neue Lieder anlegen – mit Nachfrage, wenn es Titel und Interpret schon gibt (eingefügter Text, Lesezeichen von Ultimate Guitar, ChordPro-/Textdateien). |
| [`ui/app-keys.js`](ui/app-keys.md) | Tastenkürzel der Hauptansicht (die des Spielmodus stehen in play-mode.js). |
| [`ui/app-state.js`](ui/app-state.md) | Gemeinsamer Zustand der Oberfläche: welches Liederbuch, seine Datenbanken und das gerade geöffnete Lied. |
| [`ui/capo-help.js`](ui/capo-help.md) | Capo-Hilfe: schlägt Capo-Lagen vor, in denen das Lied mit möglichst einfachen Griffen klingt wie bisher. |
| [`ui/chord-tap.js`](ui/chord-tap.md) | Akkorde per Antippen. |
| [`ui/context-menus.js`](ui/context-menus.md) | Kontextmenüs (Rechtsklick / langes Drücken) für Lieder in der Liste und für die Vorschau, außerdem Doppelklick (spielen) und Entf (löschen) in der Liste. |
| [`ui/dom.js`](ui/dom.md) | Kleine Hilfen für die Oberfläche – von allen ui-Modulen gemeinsam genutzt. |
| [`ui/files.js`](ui/files.md) | Dateien öffnen (Sicherung als ZIP oder JSON, ChordPro- und Textdateien) und Sichern als ZIP. |
| [`ui/install-help.js`](ui/install-help.md) | Installieren-Hilfe: Welche Schritte passen zu diesem Gerät und Browser? |
| [`ui/list.js`](ui/list.md) | Liederliste links: Suche, Tag-Filter, „Was kann ich spielen?“, Sortierung. |
| [`ui/paste.js`](ui/paste.md) | Text einfügen: Akkorde-über-Text (z. |
| [`ui/preview-tools.js`](ui/preview-tools.md) | Werkzeuge an der Vorschau: Vergrößern/Verkleinern und Metronom (Klick auf Takt/Tempo). |
| [`ui/publish.js`](ui/publish.md) | „Für eine Gruppe veröffentlichen“: Lieder (alle, nach Tag oder aus einer Setliste) als Abo-Datei in den Sync-Ordner (WebDAV) legen oder herunterladen, und den Einladungslink zum Weitergeben zeigen. |
| [`ui/selection.js`](ui/selection.md) | Mehrfachauswahl in der Liederliste: Leiste unten (Anzahl, Alle, Aktionen, Löschen) und die Aktionen für alle ausgewählten Lieder – löschen (mit Rückgängig), in ein anderes Liederbuch kopieren, zu einer Setliste hinzufügen. |
| [`ui/share-with.js`](ui/share-with.md) | „Mit anderen teilen“: ein Einstieg, der zuerst fragt, ob die anderen mitbearbeiten (gemeinsames Liederbuch über Google Drive) oder nur lesen sollen (Abo) – und dann in den passenden bestehenden Ablauf führt (Cloud-Dialog „Mitglieder“, „Neues Liederbuch“, „Veröffentlichen …“). |
| [`ui/share.js`](ui/share.md) | Lied teilen: über das Teilen-Menü des Geräts, als ChordPro-Datei, als Text oder als PDF – jeweils in der aktuellen Transposition. |
| [`ui/shortcuts.js`](ui/shortcuts.md) | Alle Tastenkürzel an einer Stelle: Daraus entstehen die Tasten-Abfrage (app-keys.js, play-mode.js) und die Übersicht im Dialog „Tastenkürzel“. |
| [`ui/snippets.js`](ui/snippets.md) | Bausteine über dem Editor: Akkord, Strophe, Refrain, Bridge, Tab, Wiederholung, Hinweis – und die Übersicht der ChordPro-Syntax („?“). |
| [`ui/song-actions.js`](ui/song-actions.md) | Was man mit einem ganzen Lied tun kann: anlegen, löschen, duplizieren, zu einer Setliste hinzufügen. |
| [`ui/song.js`](ui/song.md) | Das geöffnete Lied: öffnen, automatisch speichern, Vorschau, Transponieren und die Liedinfo (Titel, Capo, Takt … über dem Editor). |
| [`ui/toolbar.js`](ui/toolbar.md) | Kopfleiste: angeheftete Aktionen beschriftet neben dem Menü „⋯“ (breiter Bildschirm). |
| [`ui/trash.js`](ui/trash.md) | Papierkorb: gelöschte Lieder wiederherstellen oder endgültig löschen. |
| [`ui/view.js`](ui/view.md) | Aufteilung des Bildschirms: Handy-Reiter (Lieder / Bearbeiten / Ansehen), Editor ausblenden, Menü „⋯“ am Handy. |

## `src/core/` – Reine Musik- und Textlogik (ohne Bildschirm, gut testbar)

| Modul | Inhalt |
|---|---|
| [`core/capo.js`](core/capo.md) | Capo-Hilfe: In welchem Bund liegt das Lied mit möglichst einfachen Griffen? |
| [`core/chord-place.js`](core/chord-place.md) | Akkorde per Antippen setzen: eine Stelle im sichtbaren Liedtext (Zeile + Spalte) wird in den ChordPro-Text übersetzt. |
| [`core/chord-shapes.js`](core/chord-shapes.md) | Gitarrengriffe (Standardstimmung EADGBE) für Griffbilder und die Capo-Hilfe. |
| [`core/chordpro.js`](core/chordpro.md) | ChordPro-Parser: Text -> Song-Modell. |
| [`core/chords.js`](core/chords.md) | Akkord-Erkennung und Transposition. |
| [`core/harp.js`](core/harp.md) | Mundharmonika-Tabs (Harp-Tabs): Kanalnummern über dem Text, wie Akkorde in eckigen Klammern. |
| [`core/meta-edit.js`](core/meta-edit.md) | Kopfangaben ({title:}, {capo:}, {time:} …) direkt im ChordPro-Text lesen und setzen. |
| [`core/play-scroll.js`](core/play-scroll.md) | Rechnungen für den Spielmodus – ohne Bildschirmzugriff, damit sie sich testen lassen. |
| [`core/playable.js`](core/playable.md) | "Was kann ich spielen?": Lieder, die nur aus bekannten Griffen bestehen (optional mit Capo). |
| [`core/repeat.js`](core/repeat.md) | Wiederholungsangaben wie "2×", "x2", "(2x)", "2 mal" am Ende eines Textes. |
| [`core/song-copy.js`](core/song-copy.md) | Mehrere Lieder in ein anderes Liederbuch kopieren: was dort schon steht (gleicher Titel und – falls beide einen haben – Interpret), wird übersprungen. |
| [`core/song-list.js`](core/song-list.md) | Liederliste: Sortierung und Erkennen doppelter Lieder. |
| [`core/text.js`](core/text.md) | Textfunktionen, die an mehreren Stellen gebraucht werden: deutsch sortieren, für die Suche vereinfachen, Zeilenenden vereinheitlichen. |
| [`core/toolbar-pins.js`](core/toolbar-pins.md) | Angeheftete Aktionen der Kopfleiste: welche, in welcher Reihenfolge. |

## `src/formats/` – Dateiformate: ChordPro-Dateien, ZIP, Sicherung, Import

| Modul | Inhalt |
|---|---|
| [`formats/abo.js`](formats/abo.md) | Abo-Datei: ein Liederbuch, das jemand für einen privaten Kreis veröffentlicht. |
| [`formats/backup.js`](formats/backup.md) | Sicherung als ZIP: lesbare ChordPro-Dateien (wie auf dem WebDAV-Server) + vollständige JSON. |
| [`formats/chordpro-files.js`](formats/chordpro-files.md) | Liederbuch als reine ChordPro-Dateien (wie beim Programm ChordPro selbst): Lieder/<Titel - Interpret>.cho   Liedtext; Einstellungen der App als Direktiven: {transpose: 2}            (offizielles ChordPro) {x_accidentals: flat}     (♯/♭-Schreibweise, nur Liederbuch) {x_notiz: …}              (Notiz, eine Zeile je Direktive) Setlisten/<Name>.txt             eine Zeile pro Lied (Dateiname), darunter eingerückt „Transposition: 2“ und „Notiz: …“ Andere Programme ignorieren x_-Direktiven (so sieht es der ChordPro-Standard vor). |
| [`formats/export-text.js`](formats/export-text.md) | Lied exportieren: transponierter ChordPro-Text und "Akkorde über dem Text" (z. |
| [`formats/file-format.js`](formats/file-format.md) | Dateien, die Menschen zu sehen bekommen (NAS, Drive, Sicherung, geteilte Lieder), so schreiben, dass sie auch in Windows-Programmen wie dem Editor sauber aussehen: eingerückt und mit Windows-Zeilenumbrüchen (CR LF). |
| [`formats/file-import.js`](formats/file-import.md) | Erkennt, was in einer geöffneten Datei steckt. |
| [`formats/harp-import.js`](formats/harp-import.md) | Mundharmonika-Zeilen aus fremden Quellen lesen (z. |
| [`formats/paste-import.js`](formats/paste-import.md) | Eingefügter Text (z. |
| [`formats/song-files.js`](formats/song-files.md) | Hilfen für „eine Datei pro Lied“ auf einem WebDAV-Server: Dateinamen aus Titel und Interpret, Prüfsummen zum Erkennen von Änderungen, Ordnerliste (PROPFIND) lesen. |
| [`formats/ug-bookmarklet.js`](formats/ug-bookmarklet.md) | Lesezeichen „Ins Liederbuch“ (Bookmarklet): läuft auf der Ultimate-Guitar-Seite, die man gerade selbst ansieht, liest Titel, Interpret, Capo, Tonart, Stimmung, Tempo und den Liedtext aus und öffnet das Liederbuch mit dem Einfügen-Dialog (Daten in der Adresse hinter #ug=, sie gehen an keinen Server). |
| [`formats/ug-import.js`](formats/ug-import.md) | Import: "Akkorde über dem Text" (z. |
| [`formats/zip.js`](formats/zip.md) | Kleines ZIP-Modul ohne fremde Bibliothek. |

## `src/render/` – Lied -> HTML

| Modul | Inhalt |
|---|---|
| [`render/chord-diagram.js`](render/chord-diagram.md) | Griffbild als SVG: 6 Saiten, 4–5 Bünde, ○ leer, × nicht anschlagen, Barré als Balken. |
| [`render/song-view.js`](render/song-view.md) | Song-Modell -> DOM. |

## `src/print/` – Druck: Seitenumbruch, Liederbuch, Druckschriften

| Modul | Inhalt |
|---|---|
| [`print/paginate.js`](print/paginate.md) | Seitenumbruch selbst gemacht: Inhalte werden Element für Element in Seiten mit fester Größe (in mm) gegossen und dabei im echten Layout gemessen. |
| [`print/print-fonts.js`](print/print-fonts.md) | Eigene Schrift nur für den Druck (in der Druckvorschau einstellbar). |
| [`print/print-quick.js`](print/print-quick.md) | Druck-Optionen als Schnellwahl: Jede Option im Dialog „Optionen …“ lässt sich mit 📌 in die Leiste über der Druckvorschau heften. |
| [`print/songbook.js`](print/songbook.md) | Druckfertiges Liederbuch: Deckblatt, Inhaltsverzeichnis, ein Lied pro neuer Seite. |

## `src/settings/` – Darstellungs-Einstellungen

| Modul | Inhalt |
|---|---|
| [`settings/settings.js`](settings/settings.md) | Layout-Einstellungen: Standardwerte, Prüfung, Speichern, Anwenden. |

## `src/storage/` – Speicher (IndexedDB): Lieder, Setlisten

| Modul | Inhalt |
|---|---|
| [`storage/repository.js`](storage/repository.md) | Lieder verwalten: anlegen, ändern, löschen, suchen, Export/Import. |
| [`storage/setlists.js`](storage/setlists.md) | Setlisten: geordnete Auswahl von Liedern, z. |
| [`storage/stores.js`](storage/stores.md) | Speicher-Backends. |

## `src/sync/` – Abgleich mit Google Drive und WebDAV

| Modul | Inhalt |
|---|---|
| [`sync/abo-client.js`](sync/abo-client.md) | Abo-Datei vom Server laden – mit Anmeldung, falls der Ordner geschützt ist, und nur, wenn sie sich seit dem letzten Mal geändert hat (ETag). |
| [`sync/book-name.js`](sync/book-name.md) | Name eines Liederbuchs mit abgleichen. |
| [`sync/config.js`](sync/config.md) | Google-Zugangsdaten für Google Drive (Einrichtung: docs/google-einrichtung.md). |
| [`sync/dropbox.js`](sync/dropbox.md) | Cloud-Anbieter Dropbox: jedes Liederbuch ist eine JSON-Datei im App-Ordner (Dropbox → Apps → <Name der Dropbox-App> → Liederbuch.json, weitere Bücher „Liederbuch – Name.json“). |
| [`sync/google-auth.js`](sync/google-auth.md) | Anmeldung bei Google (OAuth 2) – ganz im Browser, ohne eigenen Server. |
| [`sync/google-drive.js`](sync/google-drive.md) | Speicherschicht Google Drive: jedes Liederbuch ist eine JSON-Datei in Drive (Format liederbuch-sync). |
| [`sync/sync-engine.js`](sync/sync-engine.md) | Abgleich der lokalen Datenbank mit einer gemeinsamen Datei in der Cloud. |
| [`sync/webdav-client.js`](sync/webdav-client.md) | WebDAV über HTTP: Anmeldung, Ordnerliste (PROPFIND), Dateien lesen, schreiben, löschen. |
| [`sync/webdav.js`](sync/webdav.md) | Cloud-Anbieter WebDAV (z. |
