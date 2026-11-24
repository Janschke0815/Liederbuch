// PWA: Service Worker anmelden, Offline-Hinweis, "App installieren".
// Eigenständig, damit ein Fehler hier die eigentliche App nicht blockiert.

import { $, closeOnBackdrop } from './ui/dom.js';
import { detectPlatform, installSteps } from './ui/install-help.js';

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Beim Entwickeln (npm run dev) keinen Cache: sonst sieht man nach Änderungen alte Dateien
  if (import.meta.env?.DEV) {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
    return;
  }
  try {
    await navigator.serviceWorker.register('./sw.js');
    const reg = await navigator.serviceWorker.ready;
    // Alle bereits geladenen Dateien (Module, CSS, Icons) für offline vormerken
    // dazu die Bausteine, die erst bei Bedarf geladen werden (Noten, QR-Code) – Liste aus dem Bauen
    const lazy = await fetch('./lazy-files.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
    const urls = [
      location.href.split('#')[0],
      ...performance.getEntriesByType('resource').map((e) => e.name),
      ...lazy.map((f) => new URL(f, location.href).href),
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

/**
 * „Installieren“: Bietet der Browser die Installation an (Chrome/Edge auf Android und PC), startet
 * der Knopf sie direkt. Sonst – immer auf iPhone/iPad, auf Android wenn der Browser gerade nicht
 * anbietet – zeigt er die passenden Schritte (siehe ui/install-help.js). Als installierte App: weg.
 */
function setupInstallButton() {
  const btn = $('#btn-install');
  const dlg = $('#install-dialog');
  if (!btn) return;
  const platform = detectPlatform({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone: navigator.standalone === true,
    displayStandalone: matchMedia?.('(display-mode: standalone)').matches,
  });
  let deferred = null;
  const mobile = platform.os !== 'desktop';
  const update = () => (btn.hidden = platform.installed || !(deferred || mobile));
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    update();
  });
  btn.onclick = async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      update();
      return;
    }
    showInstallHelp(platform, dlg);
  };
  addEventListener('appinstalled', () => {
    platform.installed = true;
    update();
  });
  update();
}

/** Anleitung zum Installieren für dieses Gerät anzeigen. */
function showInstallHelp(platform, dlg) {
  if (!dlg) return;
  const help = installSteps(platform);
  $('#install-title').textContent = help.title;
  $('#install-intro').textContent = help.intro;
  $('#install-steps').replaceChildren(...help.steps.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  $('#install-steps').hidden = !help.steps.length;
  $('#install-note').textContent = help.note || '';
  $('#install-note').hidden = !help.note;
  const copy = $('#install-copy');
  copy.hidden = !help.copyLink;
  copy.textContent = 'Adresse kopieren';
  copy.onclick = async () => {
    const url = location.href.split('#')[0];
    try {
      await navigator.clipboard.writeText(url);
      copy.textContent = 'Kopiert ✓';
    } catch {
      prompt('Adresse zum Kopieren:', url);
    }
  };
  dlg.showModal();
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
if ($('#install-dialog')) closeOnBackdrop('#install-dialog');
setupPersistentStorage();
