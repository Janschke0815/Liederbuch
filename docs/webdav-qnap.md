# Liederbuch auf der eigenen QNAP-NAS abgleichen (WebDAV)

> **Einfacher Weg zuerst:** Die fertige App ([liederbuch.zip](https://github.com/Janschke0815/Liederbuch/releases/latest/download/liederbuch.zip)
> oder selbst gebaut mit `npm run build` → `dist/`) in den Web-Ordner der NAS entpacken (QNAP *Web Server*;
> automatisch aktuell halten: [siehe unten](#app-automatisch-aktuell-halten))
> und die App von dort öffnen, z. B. `https://DEIN-NAS.myqnapcloud.com:8081/`. Laufen App und
> WebDAV unter **derselben Adresse und demselben Port**, braucht es kein CORS und keinen Caddy:
> In der App unter *Cloud → WebDAV* einfach `https://DEIN-NAS.myqnapcloud.com:8081/Liederbuch/`
> eintragen. Alles Weitere unten ist nur nötig, wenn die App woanders läuft (z. B. GitHub Pages).

Die App läuft im Browser und spricht den WebDAV-Server direkt an. Das erlaubt der Browser nur,
wenn der Server die App ausdrücklich zulässt (**CORS**). QNAP kann das von sich aus nicht. Deshalb
kommt ein kleiner **Caddy-Container** davor:

    Browser / Handy ──https──▶ FRITZ!Box ──▶ Caddy (Container auf der NAS) ──▶ WebDAV der NAS
                                             · gültiges Zertifikat (Let's Encrypt, automatisch)
                                             · beantwortet die Vorabfrage des Browsers
                                             · ergänzt die CORS-Freigabe
                                             · lässt nur den Ordner /Liederbuch/ durch

Menünamen gelten für QTS 5; in anderen Versionen heißen sie teils etwas anders.

Platzhalter in dieser Anleitung – durch deine Werte ersetzen:

| Platzhalter | Bedeutung | Beispiel |
|---|---|---|
| `DEIN-NAS.myqnapcloud.com` | myQNAPcloud-Adresse der NAS | `meinnas.myqnapcloud.com` |
| `192.168.x.y` | feste Adresse der NAS im Heimnetz | `192.168.178.20` |
| `5001` | Port, auf dem das WebDAV der NAS läuft (HTTPS) | `5001` |

> **Sicherheit:** Damit das Handy auch unterwegs abgleicht, wird ein Zugang der NAS ins Internet
> gestellt. Caddy lässt nur den Ordner `Liederbuch` durch; zusätzlich ein eigener NAS-Benutzer, der
> nur diesen Ordner sieht, ein starkes Passwort und aktuelle Firmware. Wer nur zu Hause abgleichen
> will, lässt Schritt 5 (Portfreigabe) weg – Let's Encrypt braucht dann aber einen anderen Weg
> (siehe „Nur im Heimnetz“ unten).

## 1. Ordner und Benutzer auf der NAS

1. **Systemsteuerung → Privilegien → Freigabeordner → Erstellen:** Ordner `Liederbuch`.
2. **Systemsteuerung → Privilegien → Benutzer → Erstellen:** z. B. `liederbuch`, starkes Passwort.
   Rechte: **nur** Lesen/Schreiben auf `Liederbuch`, auf alle anderen Ordner „Zugriff verweigert“.
   Anwendungsrechte: nur **WebDAV** (kein Desktop-Zugang, keine App-Station).
3. **Systemsteuerung → Netzwerk- & Dateidienste → Win/Mac/NFS/WebDAV → WebDAV:** aktiviert lassen,
   *Freigabeordner-Berechtigungen* verwenden. Der HTTPS-Port steht dort (hier `5001`).
4. In der **FRITZ!Box** der NAS eine feste Adresse geben: *Heimnetz → Netzwerk → Gerät bearbeiten →
   „Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“*.

## 2. Container Station installieren

**App Center → Container Station** installieren und einmal öffnen. Sie legt den Freigabeordner
`Container` an.

## 3. Caddy-Dateien anlegen

In der **File Station** den Ordner `Container/liederbuch-caddy` anlegen, darin die Ordner `data`
und `config` und die Datei **`Caddyfile`** (reiner Text, ohne Endung) mit diesem Inhalt:

```caddyfile
DEIN-NAS.myqnapcloud.com {
	# CORS-Freigabe für die Liederbuch-App (bei jeder Antwort, auch bei Fehlern)
	header {
		defer
		Access-Control-Allow-Origin "https://janschke0815.github.io"
		Access-Control-Allow-Methods "GET, HEAD, PUT, DELETE, MKCOL, PROPFIND, OPTIONS"
		Access-Control-Allow-Headers "Authorization, Content-Type, Depth, If-Match, If-None-Match"
		Access-Control-Expose-Headers "ETag"
		Access-Control-Max-Age "86400"
		Vary "Origin"
	}

	# Nur der Ordner Liederbuch wird durchgereicht
	handle /Liederbuch/* {
		# Vorabfrage des Browsers selbst beantworten (das WebDAV der NAS will dafür ein Passwort)
		@preflight method OPTIONS
		respond @preflight 204

		reverse_proxy https://192.168.x.y:5001 {
			transport http {
				# Das Zertifikat der NAS gilt für die myQNAPcloud-Adresse
				tls_server_name DEIN-NAS.myqnapcloud.com
			}
		}
	}

	handle {
		respond "Nicht gefunden" 404
	}
}
```

> Wer die App unter einer anderen Adresse nutzt (eigene GitHub-Pages-Seite), trägt diese bei
> `Access-Control-Allow-Origin` ein – genau eine Adresse, ohne `/` am Ende.

## 4. Container starten

**Container Station → Anwendungen → Erstellen**, Name `liederbuch-caddy`, als YAML einfügen:

```yaml
services:
  caddy:
    image: caddy:2
    container_name: liederbuch-caddy
    restart: unless-stopped
    ports:
      - "8880:80"    # Let's Encrypt (Zertifikat holen und erneuern)
      - "8443:443"   # Zugang für die App
    volumes:
      - /share/Container/liederbuch-caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - /share/Container/liederbuch-caddy/data:/data
      - /share/Container/liederbuch-caddy/config:/config
```

**Erstellen** – Container Station lädt Caddy und startet den Container. Im Protokoll des
Containers erscheint nach Schritt 5 „certificate obtained successfully“.

Nach einer Änderung am Caddyfile den Container neu starten.

## 5. Portfreigaben in der FRITZ!Box

*Internet → Freigaben → Portfreigaben → Gerät für Freigaben hinzufügen* → die NAS wählen →
*Neue Freigabe → Portfreigabe*:

| Anwendung | Protokoll | Port an Gerät | Port extern |
|---|---|---|---|
| Andere Anwendung „Liederbuch HTTPS“ | TCP | **8443** | **443** |
| Andere Anwendung „Liederbuch Zertifikat“ | TCP | **8880** | **80** |

**Eigener Port statt 443:** Für die App kann extern auch ein anderer Port genommen werden,
z. B. **8081 → 8443**. Die Adresse in der App lautet dann
`https://DEIN-NAS.myqnapcloud.com:8081/Liederbuch/`; am Caddyfile ändert sich nichts. Port **80**
wird aber trotzdem gebraucht: Let's Encrypt prüft nur über Port 80 (oder 443), ob dir die Adresse
gehört – beim ersten Start und bei jeder Erneuerung etwa alle zwei Monate. Über Port 80 liefert
Caddy nichts von der NAS aus.

War der gewählte Port vorher direkt auf das WebDAV der NAS freigegeben, diese Freigabe auf Caddy
umstellen – dann ist von außen nur noch Caddy erreichbar.

> **Verwaltungsoberfläche nicht freigeben:** Zeigt eine Freigabe (oft 443 oder 8080) auf die
> QTS-Anmeldeseite der NAS, diese löschen und unter *myQNAPcloud* die automatische
> Router-Konfiguration (UPnP) ausschalten. Für den Fernzugriff auf die Verwaltung besser das VPN
> der FRITZ!Box nutzen.

Die **myQNAPcloud**-Adresse muss auf deinen Anschluss zeigen (*myQNAPcloud → DDNS* aktiv).

## 6. In der App verbinden

**Cloud → Speicherort „WebDAV / Nextcloud“:**

- Ordner-Adresse: `https://DEIN-NAS.myqnapcloud.com/Liederbuch/`
- Benutzername / App-Passwort: der Benutzer aus Schritt 1

**Verbinden** – die App legt die Ordner `Lieder` (eine `.cho`-Datei pro Lied) und `Setlisten` an.
Mehrere Personen tragen dieselbe
Adresse ein (eigene NAS-Benutzer mit Zugriff auf den Ordner).

## App automatisch aktuell halten

Liegt die App selbst auf der NAS, holt `tools/nas-update.sh` jede neue Fassung von GitHub
(Release „latest“, `liederbuch.zip`) und entpackt sie in den Web-Ordner. Die NAS braucht dafür
keinen offenen Port, und auf GitHub liegen keine NAS-Zugangsdaten. Andere Dateien im Ordner
(z. B. der WebDAV-Ordner `Liederbuch/` mit den Liedern) bleiben unberührt.

1. *Systemsteuerung → Netzwerk- & Dateidienste → Telnet/SSH*: SSH einschalten.
2. `nas-update.sh` auf die NAS kopieren, z. B. nach `/share/Public/nas-update.sh`.
3. Per SSH anmelden (`ssh admin@DEINE-NAS`) und einmal von Hand ausprobieren
   (Ordner anpassen – dort, wo die `index.html` der App liegt):

       sh /share/Public/nas-update.sh /share/Web

   Ausgabe „Liederbuch aktualisiert …“ – beim zweiten Aufruf kommt nichts (unverändert).
4. Alle 15 Minuten automatisch – Zeile an die Cron-Tabelle der QNAP anhängen und neu laden
   (die QNAP vergisst Einträge, die nur mit `crontab -e` gemacht werden):

       echo '*/15 * * * * sh /share/Public/nas-update.sh /share/Web >/dev/null 2>&1' >> /etc/config/crontab
       crontab /etc/config/crontab && /etc/init.d/crond.sh restart

Geräte, die die App schon geöffnet haben, holen sich die neue Fassung beim nächsten Öffnen.

## Prüfen, ob alles stimmt

Ohne Zugangsdaten, von einem beliebigen Rechner:

```bash
curl -i -X OPTIONS "https://DEIN-NAS.myqnapcloud.com/Liederbuch/Liederbuch.json" -H "Origin: https://janschke0815.github.io" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: authorization"
```

Erwartet: `HTTP/2 204` und `access-control-allow-origin: https://janschke0815.github.io`.
Eine Adresse außerhalb von `/Liederbuch/` liefert `404`.

## Fehlersuche

| Meldung in der App / Befund | Ursache |
|---|---|
| „Server … nicht erreichbar … (CORS)“ | Container läuft nicht, Portfreigabe fehlt, oder falsche Adresse bei `Access-Control-Allow-Origin` |
| Zertifikatsfehler im Browser | Caddy hat noch kein Zertifikat: Port 80 nicht freigegeben oder myQNAPcloud-Adresse zeigt woanders hin – Container-Protokoll ansehen |
| „Benutzername oder Passwort falsch“ | Zugangsdaten oder WebDAV-Recht des Benutzers prüfen |
| „Keine Berechtigung für diesen Ordner“ | Benutzer hat kein Schreibrecht auf `Liederbuch` |
| Caddy-Protokoll: `502` / „connection refused“ | WebDAV-Port oder NAS-Adresse im Caddyfile falsch |

## Nur im Heimnetz

Ohne Portfreigaben kann Let's Encrypt kein Zertifikat ausstellen. Dann im Caddyfile statt der
myQNAPcloud-Adresse `https://192.168.x.y:8443` eintragen und `tls internal` ergänzen; das
Caddy-Stammzertifikat (`data/caddy/pki/authorities/local/root.crt`) muss dann auf jedem Gerät als
vertrauenswürdig installiert werden. Außerdem behandeln Chrome und Edge Zugriffe einer
Internetseite auf Adressen im Heimnetz besonders: Im `header`-Block zusätzlich
`Access-Control-Allow-Private-Network "true"` eintragen, und der Browser fragt beim ersten Mal, ob
die Seite auf Geräte im lokalen Netzwerk zugreifen darf. Das ist fummeliger – meist ist die
Variante oben einfacher.
