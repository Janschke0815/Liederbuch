# `src/pwa.js`

[← Übersicht](README.md)

PWA: Service Worker anmelden, Offline-Hinweis, "App installieren". Eigenständig, damit ein Fehler hier die eigentliche App nicht blockiert.

**Benutzt:** [`ui/dom.js`](ui/dom.md)  

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `async registerServiceWorker()`
- `setupOfflineBadge()`
- `setupInstallButton()`
- `async storageStatus()`
- `async requestPersistence()`
- `setupPersistentStorage()`
