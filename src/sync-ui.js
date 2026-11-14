// Cloud-Knopf in der Kopfleiste und Dialog zum Verbinden.

import { SyncEngine } from './sync/sync-engine.js';
import { GoogleDriveProvider } from './sync/google-drive.js';
import { GOOGLE_CLIENT_ID } from './sync/config.js';

const $ = (s) => document.querySelector(s);

const TITLES = {
  off: 'Nicht verbunden',
  idle: 'Synchron',
  syncing: 'Gleiche ab …',
  offline: 'Offline',
  auth: 'Anmeldung nötig',
  error: 'Fehler beim Abgleich',
};

const fmtTime = (d) => d?.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * @param {{repo, beforeSync: () => Promise<void>, beforeConnect?: () => Promise<void>, toast: Function}} opts
 */
export function setupSync({ repo, beforeSync, beforeConnect, toast }) {
  const dlg = $('#sync-dialog');
  const btn = $('#btn-cloud');
  const clientIdInput = $('#sync-client-id');
  $('#sync-origin').textContent = location.origin;

  const clientId = () => localStorage.getItem('gdrive.clientId') || GOOGLE_CLIENT_ID;
  let provider = null;
  let engine = null;

  function build() {
    engine?.stop();
    provider = new GoogleDriveProvider({ clientId: clientId() });
    engine = new SyncEngine(repo, provider, { beforeSync });
    engine.addEventListener('status', render);
  }

  function render() {
    const state = engine?.state || 'off';
    let text = '';
    if (state === 'idle') text = `Google Drive · zuletzt abgeglichen ${fmtTime(engine.lastSync)}`;
    else if (state === 'syncing') text = 'Google Drive';
    else if (state === 'offline') text = 'Änderungen werden abgeglichen, sobald wieder Verbindung besteht.';
    else if (state === 'auth') text = 'Die Google-Anmeldung ist abgelaufen. „Verbinden“ tippen – deine Lieder bleiben erhalten.';
    else if (state === 'error') text = engine.error?.message || '';
    else text = clientId() ? 'Mit Google Drive verbinden, um alle Geräte abzugleichen.' : 'Zuerst die Einrichtung unten erledigen.';

    btn.dataset.state = state;
    btn.title = `Cloud-Sync: ${TITLES[state]}${text ? ' – ' + text : ''}`;
    $('#cloud-label').textContent = state === 'off' ? 'Cloud' : state === 'auth' ? 'Anmelden' : TITLES[state];
    $('#sync-status').dataset.state = state;
    $('#sync-status-title').textContent = TITLES[state];
    $('#sync-status-text').textContent = text;

    const connected = state !== 'off';
    $('#sync-disconnect').hidden = !connected;
    $('#sync-now').hidden = !connected || state === 'auth';
    $('#sync-connect').hidden = connected && state !== 'auth';
    $('#sync-connect').textContent = state === 'auth' ? 'Neu anmelden' : 'Verbinden';
    $('#sync-provider').disabled = connected;
    clientIdInput.disabled = connected && state !== 'auth';
  }

  async function connect({ silent = false } = {}) {
    const id = clientIdInput.value.trim();
    if (id !== clientId()) {
      localStorage.setItem('gdrive.clientId', id);
      build();
    }
    if (!clientId()) {
      $('#sync-setup').open = true;
      clientIdInput.focus();
      toast('Bitte zuerst die Google-Client-ID eintragen');
      return false;
    }
    try {
      try {
        await provider.signIn({ silent });
      } catch (err) {
        if (!silent) throw err;
        await provider.signIn();
      }
    } catch (err) {
      toast(`Verbinden fehlgeschlagen: ${err.message}`);
      return false;
    }
    const first = localStorage.getItem('sync.provider') !== 'gdrive';
    localStorage.setItem('sync.provider', 'gdrive');
    if (first) await beforeConnect?.();
    if (engine.state === 'off') engine.start();
    else await engine.sync();
    if (first) toast('Mit Google Drive verbunden');
    return true;
  }

  $('#sync-connect').onclick = () => connect({ silent: engine?.state === 'auth' });
  $('#sync-now').onclick = () => engine.sync();
  $('#sync-disconnect').onclick = () => {
    provider.signOut();
    engine.stop();
    localStorage.removeItem('sync.provider');
    toast('Cloud-Sync getrennt – die Lieder bleiben auf diesem Gerät');
  };

  // Abgelaufene Anmeldung: Klick auf den Cloud-Knopf erneuert sie direkt
  btn.onclick = async () => {
    if (engine?.state === 'auth' && (await connect({ silent: true }))) return;
    clientIdInput.value = clientId();
    $('#sync-setup').open = !clientId();
    render();
    dlg.showModal();
  };
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());

  build();
  render();
  if (localStorage.getItem('sync.provider') === 'gdrive' && clientId()) engine.start();
  return { get engine() { return engine; } };
}
