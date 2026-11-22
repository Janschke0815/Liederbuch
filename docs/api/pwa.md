# `src/pwa.js`

[← Übersicht](README.md)

PWA: Service Worker anmelden, Offline-Hinweis, "App installieren". Eigenständig, damit ein Fehler hier die eigentliche App nicht blockiert.

**Benutzt:** [`ui/dom.js`](ui/dom.md), [`ui/install-help.js`](ui/install-help.md)  

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async registerServiceWorker()`
- `setupOfflineBadge()`
- `setupInstallButton()` – „Installieren“: Bietet der Browser die Installation an (Chrome/Edge auf Android und PC), startet
- `showInstallHelp(platform, dlg)` – Anleitung zum Installieren für dieses Gerät anzeigen.
- `async storageStatus()`
- `async requestPersistence()`
- `setupPersistentStorage()`
