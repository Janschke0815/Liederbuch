# Google Drive einrichten (einmalig, kostenlos)

Damit sich alle nur noch **„Mit Google anmelden“** müssen, braucht die App einmal ein eigenes
Google-Cloud-Projekt. Die drei Werte daraus (Client-ID, API-Schlüssel, Projektnummer) kommen fest in
`src/sync/config.js` – danach trägt auf keinem Gerät mehr jemand etwas ein.

## Wie die Anmeldung funktioniert (kurz)

- **OAuth 2 ganz im Browser, ohne eigenen Server.** Die App leitet zu Google, man meldet sich dort an
  und erlaubt den Zugriff; Google gibt der App ein **Zugangstoken**, das etwa eine Stunde gilt. Es liegt
  nur auf dem Gerät (im Browser-Speicher der App), nie im Quelltext oder in einer öffentlichen Datei.
- **Kein Client-Secret, kein Refresh-Token.** Beides gibt es bei Google nur für Apps mit eigenem
  Server. Läuft das Token ab, zeigt der Cloud-Knopf „Anmelden“ – ein Tipp genügt, wer schon zugestimmt
  hat, wird nicht noch einmal gefragt. Bis dahin speichert die App lokal weiter, nichts geht verloren.
- **Berechtigung `drive.file`** – die kleinste, die es für Drive gibt: Die App sieht nur Dateien, die
  sie selbst angelegt hat oder die man ihr in der Google-Dateiauswahl ausdrücklich gibt, nicht den
  Rest des Drives. Weitere Berechtigungen braucht die App nicht. (`drive.readonly` o. Ä. würde eine
  aufwendige Sicherheitsprüfung durch Google verlangen und mehr Zugriff geben als nötig.)
- **Rechte setzt Google durch.** Wer ein Liederbuch nur lesen darf (Drive-Freigabe „Betrachter“),
  dem verweigert Google das Schreiben – egal, was die App anzeigt. Die App fragt die eigenen Rechte ab
  und sperrt dann zusätzlich das Bearbeiten.
- **iPhone/iPad:** In der installierten App (Home-Bildschirm) öffnet sich kein Anmeldefenster, sondern
  die Seite wechselt kurz zu Google und wieder zurück.

Keiner der drei Werte ist geheim: Sie stehen bei jeder Web-App sichtbar im Code, und Google nimmt sie
nur von den Adressen an, die du unten einträgst.

## 1. Projekt anlegen und Dienste einschalten

1. <https://console.cloud.google.com/> öffnen (mit deinem Google-Konto) → oben **Projekt auswählen →
   Neues Projekt**, Name z. B. „Liederbuch“ → **Erstellen**.
2. **APIs & Dienste → Bibliothek**: **Google Drive API** suchen → **Aktivieren**. Ebenso die
   **Google Picker API** (für die Dateiauswahl beim Öffnen einer Einladung).

## 2. Zustimmungsbildschirm („Google Auth Platform“)

1. Menü **Google Auth Platform** (früher „OAuth-Zustimmungsbildschirm“) → **Jetzt starten**.
2. App-Name „Liederbuch“, Support-E-Mail (deine), Zielgruppe **Extern**, Kontakt-E-Mail → fertig.
3. **Datenzugriff → Bereiche hinzufügen**: `…/auth/drive.file` („Google Drive-Dateien sehen, bearbeiten,
   erstellen und löschen, die Sie mit dieser App verwenden“) → Speichern.
4. **Zielgruppe** – eins von beiden:
   - **Testphase:** Alle, die die App nutzen (du und alle Mitglieder), als **Testnutzer** eintragen
     (höchstens 100). Nachteil: Bei Testnutzern verlangt Google ungefähr wöchentlich eine neue Zustimmung.
   - **Veröffentlichen** („App veröffentlichen“): Mit `drive.file` ist dafür keine Prüfung durch Google
     nötig. Voraussetzung: Unter **Branding** sind App-Startseite und Datenschutzerklärung eingetragen
     (z. B. `https://janschke0815.github.io/Liederbuch/` und `…/Liederbuch/datenschutz.html`) und die Domain
     (`janschke0815.github.io`) steht unter *Autorisierte Domains* – sonst bleibt der Knopf grau. Jeder mit Google-Konto kann sich anmelden, sieht aber trotzdem nur sein eigenes Drive bzw.
     die mit ihm geteilten Liederbücher. Empfohlen, sobald es läuft.

## 3. OAuth-Client (Webanwendung)

**Google Auth Platform → Clients → Client erstellen**:

- Anwendungstyp: **Webanwendung**, Name z. B. „Liederbuch Web“.
- **Autorisierte JavaScript-Quellen** (nur Protokoll und Host, ohne Pfad):
  - `https://janschke0815.github.io`
  - `http://localhost:5173` (Entwickeln) und `http://localhost:4173` (`npm run preview`)
  - ggf. die Adresse der NAS, z. B. `https://DEIN-NAS.myqnapcloud.com:8081`
- **Autorisierte Weiterleitungs-URIs** (für die Anmeldung per Weiterleitung auf iPhone/iPad – genau die
  Adresse der App mit Pfad und Schrägstrich am Ende; die App zeigt sie unter *Cloud → Google-Einrichtung*):
  - `https://janschke0815.github.io/Liederbuch/`
  - `http://localhost:5173/`
  - ggf. `https://DEIN-NAS.myqnapcloud.com:8081/`
- **Erstellen** → die **Client-ID** kopieren (`….apps.googleusercontent.com`).
  Das angezeigte **Client-Secret wird nicht gebraucht** – nirgends eintragen, nicht weitergeben.

Änderungen an den Adressen brauchen bei Google ein paar Minuten, bis sie gelten.

## 4. API-Schlüssel (für die Dateiauswahl)

**APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → API-Schlüssel**, dann **Schlüssel bearbeiten**:

- **Anwendungseinschränkungen:** *Websites* mit nur **`https://docs.google.com/*`**. Die App selbst
  benutzt den Schlüssel nicht, nur die Dateiauswahl – und die läuft in einem Google-Rahmen auf
  docs.google.com und fragt von dort aus an. Die Adressen der App (GitHub Pages, localhost, NAS) sind
  hier daher nicht nötig; fehlt docs.google.com, meldet die Dateiauswahl „API-Entwicklerschlüssel ist ungültig“.
- **API-Einschränkungen:** **Google Picker API** und **Google Drive API** (die Dateiauswahl fragt
  Drive mit dem Schlüssel ab; fehlt die Drive API hier, meldet sie „API-Entwicklerschlüssel ist
  ungültig“). Der Schlüssel allein gibt keinen Zugriff auf Dateien – dafür braucht es immer die Anmeldung.

Änderungen am Schlüssel brauchen ebenfalls ein paar Minuten.

## 5. Projektnummer

Steht auf der Startseite des Projekts (**Cloud-Übersicht → Dashboard**, „Projektnummer“, nur Ziffern) –
nicht zu verwechseln mit der Projekt-ID.

## 6. Werte eintragen

In `src/sync/config.js`:

```js
export const GOOGLE_CLIENT_ID = '123456789012-abc….apps.googleusercontent.com';
export const GOOGLE_API_KEY = 'AIza…';
export const GOOGLE_APP_ID = '123456789012';
```

Committen und pushen – GitHub baut die App neu, nach ein bis zwei Minuten gilt es für alle. Solange die
Werte dort leer sind, zeigt die App unter *Cloud → Google-Einrichtung* Felder, in die man sie pro Gerät
eintragen kann (praktisch zum Ausprobieren, z. B. mit einem eigenen Projekt für eine eigene Kopie der App).

> **Umgebungsvariablen?** Weil es keinen Server gibt, gibt es auch kein Geheimnis, das in eine
> Umgebungsvariable gehören würde: Client-ID, API-Schlüssel und Projektnummer sind öffentliche Angaben
> und dürfen im Repository stehen. Ein Client-Secret oder Passwörter kommen nirgends vor.

## So wird es benutzt

- **Eigene Geräte abgleichen:** *Cloud → Abgleich → Speicherort Google Drive → Mit Google anmelden.*
  Beim ersten Mal wandern die Lieder dieses Geräts in die Datei `Liederbuch.json` in deinem Drive; liegt
  dort schon eine, wird zusammengeführt (pro Lied gewinnt die neuere Fassung, nichts geht verloren).
  Eine Sicherungsdatei vorher wie gewohnt mit *Datei öffnen* einlesen.
- **Mit anderen teilen:** Im Cloud-Dialog unter *Mitglieder* die E-Mail-Adresse eingeben, Rechte wählen
  (**nur lesen** oder **darf bearbeiten**) → *Einladen*. Google schickt eine Mail mit einem Link zur App.
  Rechte lassen sich dort jederzeit ändern oder entziehen.
- **Einladung annehmen:** Link aus der Mail öffnen → *Mit Google anmelden und öffnen* → in der
  Google-Auswahl die vorgewählte Datei bestätigen. Mit Leserechten ist das Liederbuch schreibgeschützt
  und holt Änderungen automatisch; einzelne Lieder lassen sich ins eigene Liederbuch kopieren.

## Wenn etwas nicht klappt

| Meldung | Ursache |
|---|---|
| „Die App hat keine Google-Client-ID“ | Schritt 6 fehlt |
| „… nicht als Weiterleitung eingetragen“ / `redirect_uri_mismatch` | Adresse fehlt unter *Weiterleitungs-URIs* (Schritt 3) – genau so, wie die App sie anzeigt |
| „Pop-ups … blockiert“ | Pop-ups für die Seite der App erlauben |
| `origin_mismatch` / „Zugriff blockiert“ | Adresse fehlt unter *JavaScript-Quellen* (Schritt 3) |
| „Zugriff auf Google Drive wurde nicht erlaubt“ | Bei Google das Häkchen für Drive nicht gesetzt – noch einmal anmelden |
| `access_denied` in der Testphase | Konto ist nicht als Testnutzer eingetragen (Schritt 2) |
| „Der API-Entwicklerschlüssel ist ungültig“ (in der Dateiauswahl; schließen mit „✕ Schließen“ oben rechts oder Esc) | Beim API-Schlüssel fehlt unter *API-Einschränkungen* die Drive API oder Picker API, die Picker API ist nicht aktiviert (Schritt 1) oder unter *Websites* fehlt `https://docs.google.com/*` (Schritt 4) |
| „Für ‚Einladung öffnen‘ fehlen API-Schlüssel …“ | API-Schlüssel oder Projektnummer fehlen (Schritte 4–6) |
| „Die Google-Anmeldung ist abgelaufen oder wurde widerrufen“ | normal nach etwa einer Stunde oder nach Entzug unter <https://myaccount.google.com/permissions> – neu anmelden |
| „Nur lesen: … keine Schreibrechte“ | Der Besitzer hat dir nur Leserechte gegeben |
