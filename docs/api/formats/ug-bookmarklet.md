# `src/formats/ug-bookmarklet.js`

[← Übersicht](../README.md)

Lesezeichen „Ins Liederbuch“ (Bookmarklet): läuft auf der Ultimate-Guitar-Seite, die man gerade selbst ansieht, liest Titel, Interpret, Capo, Tonart, Stimmung, Tempo und den Liedtext aus und öffnet das Liederbuch mit dem Einfügen-Dialog (Daten in der Adresse hinter #ug=, sie gehen an keinen Server). Es wird nichts automatisch abgerufen – wie Kopieren und Einfügen, nur ohne Handarbeit.

Das Lesezeichen selbst sammelt nur Rohdaten; die Umwandlung in Einfügetext passiert hier in der App (ugDataToText). So wirken Verbesserungen sofort, ohne das Lesezeichen neu anzulegen.

**Benutzt von:** [`ui/paste.js`](../ui/paste.md)

## Exportiert

### `bookmarkletHref(appUrl)`

Adresse "javascript:…" für das Lesezeichen, das die App unter appUrl öffnet.

### `readUgHash(hash)`

Daten aus der Adresse (#ug=…) lesen; null, wenn keine oder unbrauchbar.

### `stripUgMarkup(content)`

Ultimate-Guitar-Markierungen entfernen: [tab]…[/tab] weg, [ch]C[/ch] -> C. Normalerweise
steht eine Akkordzeile über dem Text; stehen Akkorde mitten im Text, wird daraus ebenfalls
eine Akkordzeile darüber.

### `ugDataToText(d)`

Rohdaten des Lesezeichens -> Text für den Einfügen-Dialog (mit Kopfzeilen für Titel usw.).

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `liederbuchBookmarklet(app)` – Läuft als Lesezeichen auf der fremden Seite. Muss für sich allein lauffähig sein (wird als
- `inlineToChordLine(line)` – Zeile mit Akkorden mitten im Text -> Akkordzeile über der Textzeile (gleiche Spalten).
