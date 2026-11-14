// PWA: Service Worker anmelden, Offline-Hinweis, "App installieren".
// Eigenständig, damit ein Fehler hier die eigentliche App nicht blockiert.

const $ = (s) => document.querySelector(s);

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
    const reg = await navigator.serviceWorker.ready;
    // Alle bereits geladenen Dateien (Module, CSS, Icons) für offline vormerken
    const urls = [
      location.href.split('#')[0],
      ...performance.getEntriesByType('resource').map((e) => e.name),
    ].filter((u) => new URL(u).origin === location.origin);
    reg.active?.postMessage({ type: 'cache-urls', urls });
  } catch (err) {
    console.warn('Service Worker nicht verfügbar:', err);
  }
}

function setupOfflineBadge() {
  const badge = $('#offline-badge');
  if (!badge) return;
  const update = () => (badge.hidden = navigator.onLine);
  addEventListener('online', update);
  addEventListener('offline', update);
  update();
}

function setupInstallButton() {
  const btn = $('#btn-install');
  if (!btn) return;
  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  btn.onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
  };
  addEventListener('appinstalled', () => (btn.hidden = true));
}

if (document.readyState === 'complete') registerServiceWorker();
else addEventListener('load', registerServiceWorker);
setupOfflineBadge();
setupInstallButton();
