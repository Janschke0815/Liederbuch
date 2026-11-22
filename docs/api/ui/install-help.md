# `src/ui/install-help.js`

[← Übersicht](../README.md)

Installieren-Hilfe: Welche Schritte passen zu diesem Gerät und Browser?

Chrome/Edge auf Android und dem PC bieten die Installation selbst an (beforeinstallprompt) – dann startet der Knopf sie direkt. Safari auf iPhone/iPad tut das nie; dort (und wenn der Browser gerade nicht anbietet) zeigt die App die passenden Schritte. Reine Logik, ohne Bildschirm – testbar.

**Benutzt von:** [`pwa.js`](../pwa.md)

## Exportiert

### `detectPlatform({ userAgent = '', maxTouchPoints = 0, standalone = false, displayStandalone = false } = {})`

Gerät und Browser grob einordnen.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `env` | `{userAgent?: string, maxTouchPoints?: number, standalone?: boolean, displayStandalone?: boolean}` |  |

**Rückgabe:** `{installed: boolean, os: 'ios'|'android'|'desktop', browser: string, inApp: boolean}` browser: 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other' inApp: Seite läuft im eingebauten Browser einer anderen App (WhatsApp, Mail, Instagram …)

### `installSteps(p)`

Anleitung für ein Gerät.

| Parameter | Typ | Bedeutung |
|---|---|---|
| `p` | `ReturnType<typeof detectPlatform>` |  |

**Rückgabe:** `{title: string, intro: string, steps: string[], note?: string, copyLink?: boolean}` copyLink: Knopf „Adresse kopieren“ anbieten (zum Einfügen in Safari/Chrome)
