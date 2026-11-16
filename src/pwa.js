// PWA: Service Worker anmelden, Offline-Hinweis, "App installieren".
// Eigenständig, damit ein Fehler hier die eigentliche App nicht blockiert.

import { $ } from './ui/dom.js';

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

// Dauerhafter Speicher: Ohne ihn darf der Browser die Lieder (IndexedDB) bei knappem
// Speicherplatz von selbst löschen. Chrome/Edge entscheiden still (z. B. wenn die App
// installiert ist), Firefox fragt nach – deshalb erst bei der ersten Bedienung anfragen.
const storage = navigator.storage;

async function storageStatus() {
  const status = $('#st-storage-status');
  const btn = $('#st-storage-btn');
  if (!status) return;
  if (!storage?.persisted) {
    status.textContent = 'Dieser Browser unterstützt das nicht – lege regelmäßig eine Sicherung an.';
    if (btn) btn.hidden = true;
    return;
  }
  const persisted = await storage.persisted();
  let used = '';
  try {
    const { usage } = await storage.estimate();
    if (usage != null) used = ` Belegt: ${(usage / 1024 / 1024).toFixed(1).replace('.', ',')} MB.`;
  } catch {}
  status.textContent = persisted
    ? `Ja – der Browser löscht deine Lieder nicht von selbst.${used}`
    : `Nein – bei knappem Speicher könnte der Browser die Lieder löschen. Installieren der App oder ein Lesezeichen hilft.${used}`;
  if (btn) btn.hidden = persisted;
}

async function requestPersistence() {
  if (!storage?.persist) return false;
  try {
    return (await storage.persisted()) || (await storage.persist());
  } catch {
    return false;
  }
}

function setupPersistentStorage() {
  if (!storage?.persist) return storageStatus();
  storage.persisted().then((ok) => {
    if (ok) return;
    // einmal pro Sitzung bei der ersten Bedienung (Firefox braucht eine Nutzeraktion)
    addEventListener('pointerdown', () => requestPersistence().then(storageStatus), { once: true, capture: true });
  });
  $('#st-storage-btn')?.addEventListener('click', async () => {
    const ok = await requestPersistence();
    await storageStatus();
    if (!ok) {
      $('#st-storage-status').textContent =
        'Der Browser hat abgelehnt. Er erlaubt es meist erst, wenn die App installiert ist ' +
        '(„Zum Startbildschirm hinzufügen“) oder ein Lesezeichen hat. Bis dahin: regelmäßig sichern.';
    }
  });
  $('#btn-settings')?.addEventListener('click', storageStatus);
  addEventListener('appinstalled', () => requestPersistence().then(storageStatus));
  storageStatus();
}

if (document.readyState === 'complete') registerServiceWorker();
else addEventListener('load', registerServiceWorker);
setupOfflineBadge();
setupInstallButton();
setupPersistentStorage();
