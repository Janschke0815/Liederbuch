// Cloud-Knopf, Liederbuch-Auswahl und Dialog (verbinden, gemeinsame Liederbücher, Mitglieder).

import { SyncEngine, SYNC_FORMAT, SYNC_VERSION } from './sync/sync-engine.js';
import { GoogleDriveProvider } from './sync/google-drive.js';
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_APP_ID } from './sync/config.js';
import {
  listBooks, setActiveBook, addSharedBook, removeBook, bookNameFromFile, fileNameForBook,
} from './books.js';
import { slimRecord } from './storage/repository.js';

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
const li = (...children) => {
  const el = document.createElement('li');
  el.append(...children);
  return el;
};
const span = (className, text, small) => {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  if (small) el.append(Object.assign(document.createElement('small'), { textContent: small }));
  return el;
};
const button = (text, onclick, className = '') =>
  Object.assign(document.createElement('button'), { type: 'button', textContent: text, onclick, className });

/**
 * @param {{repo, book, beforeSync: () => Promise<void>, beforeConnect?: () => Promise<void>,
 *          beforeSwitch: () => Promise<void>, toast: Function}} opts
 */
export function setupSync({ repo, book, beforeSync, beforeConnect, beforeSwitch, toast }) {
  const dlg = $('#sync-dialog');
  const btn = $('#btn-cloud');
  $('#sync-origin').textContent = location.origin;

  const cfg = (key, fallback) => localStorage.getItem(key) || fallback;
  const clientId = () => cfg('gdrive.clientId', GOOGLE_CLIENT_ID);
  const apiKey = () => cfg('gdrive.apiKey', GOOGLE_API_KEY);
  const appId = () => cfg('gdrive.appId', GOOGLE_APP_ID);
  const connectedFlag = () => localStorage.getItem('sync.provider') === 'gdrive';

  let provider = null;
  let engine = null;
  let info = null; // Name/Rechte der Drive-Datei des aktiven Liederbuchs

  function build() {
    engine?.stop();
    provider = new GoogleDriveProvider({ clientId: clientId(), apiKey: apiKey(), appId: appId(), book });
    engine = new SyncEngine(repo, provider, { beforeSync });
    engine.addEventListener('status', render);
  }

  // ---------- Liederbuch-Auswahl in der Kopfleiste ----------

  async function switchTo(id) {
    await beforeSwitch?.();
    setActiveBook(id);
    location.reload();
  }

  function renderBookSelect() {
    const books = listBooks();
    const sel = $('#book-select');
    sel.replaceChildren(...books.map((b) => new Option(b.shared ? `${b.name} 👥` : b.name, b.id, false, b.id === book.id)));
    const several = books.length > 1;
    sel.hidden = !several;
    $('#app-name').hidden = several;
    sel.onchange = () => switchTo(sel.value);
  }

  // ---------- Status ----------

  function render() {
    const state = engine?.state || 'off';
    let text = '';
    if (state === 'idle') text = `Google Drive · zuletzt abgeglichen ${fmtTime(engine.lastSync)}`;
    else if (state === 'syncing') text = 'Google Drive';
    else if (state === 'offline') text = 'Änderungen werden abgeglichen, sobald wieder Verbindung besteht.';
    else if (state === 'auth') text = 'Die Google-Anmeldung ist abgelaufen. „Neu anmelden“ tippen – deine Lieder bleiben erhalten.';
    else if (state === 'error') text = engine.error?.message || '';
    else if (book.shared) text = 'Dieses gemeinsame Liederbuch braucht die Verbindung zu Google Drive.';
    else text = clientId() ? 'Mit Google Drive verbinden, um alle Geräte abzugleichen.' : 'Zuerst die Einrichtung unten erledigen.';

    btn.dataset.state = state;
    btn.title = `Cloud-Sync: ${TITLES[state]}${text ? ' – ' + text : ''}`;
    $('#cloud-label').textContent = state === 'off' ? 'Cloud' : state === 'auth' ? 'Anmelden' : TITLES[state];
    $('#sync-status').dataset.state = state;
    $('#sync-status-title').textContent = `${book.name}: ${TITLES[state]}`;
    $('#sync-status-text').textContent = text;

    const connected = state !== 'off';
    const usable = connected && state !== 'auth';
    $('#sync-disconnect').hidden = !connected;
    $('#sync-now').hidden = !usable;
    $('#sync-connect').hidden = usable;
    $('#sync-connect').textContent = state === 'auth' ? 'Neu anmelden' : 'Verbinden';
    $('#book-actions').hidden = !usable;
    $('#book-offline-hint').hidden = usable;
    $('#book-new-from').textContent = book.name;
    for (const id of ['#sync-client-id', '#sync-api-key', '#sync-app-id']) $(id).disabled = usable;
  }

  function renderBooks() {
    const items = listBooks().map((b) => {
      const isActive = b.id === book.id;
      const row = li(span('book-name', b.name, b.shared ? 'gemeinsam' : 'persönlich'));
      if (isActive) {
        row.classList.add('active');
        row.append(span('hint', 'geöffnet'));
      } else {
        row.append(button('Öffnen', () => switchTo(b.id)));
      }
      if (b.shared && isActive) row.append(button('Verlassen', leaveBook, 'danger'));
      return row;
    });
    $('#book-list').replaceChildren(...items);
  }

  async function renderMembers() {
    const box = $('#members');
    box.hidden = true;
    if (!provider.signedIn || engine.state === 'off') return;
    try {
      info = await provider.info();
      if (!info?.capabilities?.canShare) return;
      const members = await provider.members();
      $('#members-book').textContent = book.name;
      $('#member-list').replaceChildren(...members.map((m) => {
        const owner = m.role === 'owner';
        const row = li(span('member-name', m.displayName || m.emailAddress, owner ? 'Besitzer' : m.emailAddress));
        if (!owner) {
          row.append(button('Entfernen', async () => {
            if (!confirm(`${m.displayName || m.emailAddress} aus „${book.name}“ entfernen?`)) return;
            try {
              await provider.removeMember(m.id);
              toast('Mitglied entfernt');
            } catch (err) {
              toast(err.message);
            }
            renderMembers();
          }, 'danger'));
        }
        return row;
      }));
      box.hidden = false;
    } catch (err) {
      console.warn(err);
    }
  }

  // ---------- Verbinden / Trennen ----------

  function saveSetup() {
    const pairs = [['gdrive.clientId', '#sync-client-id'], ['gdrive.apiKey', '#sync-api-key'], ['gdrive.appId', '#sync-app-id']];
    let changed = false;
    for (const [key, sel] of pairs) {
      const v = $(sel).value.trim();
      if (v !== (localStorage.getItem(key) || '') && !(v === '' && !localStorage.getItem(key))) {
        if (v) localStorage.setItem(key, v);
        else localStorage.removeItem(key);
        changed = true;
      }
    }
    if (changed) build();
  }

  async function connect({ silent = false } = {}) {
    saveSetup();
    if (!clientId()) {
      $('#sync-setup').open = true;
      $('#sync-client-id').focus();
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
    const first = !connectedFlag();
    localStorage.setItem('sync.provider', 'gdrive');
    if (first && !book.shared) await beforeConnect?.();
    if (engine.state === 'off') engine.start();
    else await engine.sync();
    if (first) toast('Mit Google Drive verbunden');
    if (dlg.open) renderMembers();
    return true;
  }

  $('#sync-connect').onclick = () => connect({ silent: engine?.state === 'auth' });
  $('#sync-now').onclick = () => engine.sync();
  $('#sync-disconnect').onclick = () => {
    provider.signOut();
    engine.stop();
    localStorage.removeItem('sync.provider');
    $('#members').hidden = true;
    toast('Cloud-Sync getrennt – die Lieder bleiben auf diesem Gerät');
  };

  // ---------- Gemeinsame Liederbücher ----------

  $('#book-new-ok').onclick = async () => {
    const name = $('#book-new-name').value.trim();
    if (!name) {
      $('#book-new-name').focus();
      return;
    }
    if (listBooks().some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      toast('Ein Liederbuch mit diesem Namen gibt es schon');
      return;
    }
    try {
      await beforeSync?.();
      const songs = $('#book-new-copy').checked
        ? (await repo.allRecords()).filter((r) => !r.deletedAt).map(slimRecord)
        : [];
      const data = { format: SYNC_FORMAT, version: SYNC_VERSION, updatedAt: new Date().toISOString(), songs };
      const file = await provider.createShared(fileNameForBook(name), data);
      const created = addSharedBook({ fileId: file.id, name });
      toast(`„${name}“ angelegt – jetzt Mitglieder einladen`);
      localStorage.setItem('openSyncDialog', '1');
      await switchTo(created.id);
    } catch (err) {
      toast(`Anlegen fehlgeschlagen: ${err.message}`);
    }
  };

  $('#book-join').onclick = async () => {
    saveSetup();
    try {
      const file = await provider.pickShared();
      if (!file) return;
      const existing = listBooks().find((b) => b.fileId === file.id);
      const joined = existing || addSharedBook({ fileId: file.id, name: bookNameFromFile(file.name) });
      toast(`„${joined.name}“ geöffnet`);
      await switchTo(joined.id);
    } catch (err) {
      if (/API-Schlüssel/.test(err.message)) $('#sync-setup').open = true;
      toast(err.message);
    }
  };

  async function leaveBook() {
    const owner = info?.ownedByMe;
    const msg = owner
      ? `„${book.name}“ auf diesem Gerät entfernen? Die Datei bleibt in deinem Drive, die Mitglieder behalten Zugriff.`
      : `„${book.name}“ auf diesem Gerät entfernen? Die anderen Mitglieder behalten das Liederbuch.`;
    if (!confirm(msg)) return;
    removeBook(book.id);
    indexedDB.deleteDatabase(book.dbName);
    await switchTo('personal');
  }

  $('#invite-ok').onclick = async () => {
    const email = $('#invite-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('#invite-email').focus();
      toast('Bitte eine gültige E-Mail-Adresse eingeben');
      return;
    }
    const appUrl = location.origin + location.pathname;
    const message = `Du bist zum Liederbuch „${book.name}“ eingeladen. Öffne ${appUrl} → Cloud → Verbinden → „Einladung öffnen …“ und wähle diese Datei.`;
    try {
      await provider.invite(email, message);
      $('#invite-email').value = '';
      toast(`Einladung an ${email} verschickt`);
      renderMembers();
    } catch (err) {
      toast(`Einladen fehlgeschlagen: ${err.message}`);
    }
  };
  $('#invite-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#invite-ok').click();
    }
  });

  // ---------- Dialog ----------

  function openDialog() {
    $('#sync-client-id').value = clientId();
    $('#sync-api-key').value = apiKey();
    $('#sync-app-id').value = appId();
    $('#sync-setup').open = !clientId();
    render();
    renderBooks();
    renderMembers();
    dlg.showModal();
  }

  // Abgelaufene Anmeldung: Klick auf den Cloud-Knopf erneuert sie direkt
  btn.onclick = async () => {
    if (engine?.state === 'auth' && (await connect({ silent: true }))) return;
    openDialog();
  };
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());

  build();
  render();
  renderBookSelect();
  if (connectedFlag() && clientId()) engine.start();
  if (localStorage.getItem('openSyncDialog')) {
    localStorage.removeItem('openSyncDialog');
    openDialog();
  }
  return { get engine() { return engine; } };
}
