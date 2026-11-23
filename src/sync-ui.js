// Cloud-Knopf, Liederbuch-Auswahl und Dialog (verbinden, gemeinsame Liederbücher, Mitglieder).
//
// Google Drive: Anmeldung mit google-auth.js (Fenster, auf iPhone/iPad per Weiterleitung), Speichern mit
// google-drive.js. Einladung per E-Mail mit Link <App>#drive=<Datei-ID>: Wer ihn öffnet, meldet sich
// an, bestätigt die Datei in der Google-Dateiauswahl und hat das Liederbuch – mit Leserechten nur
// zum Lesen (Google verweigert dann das Schreiben, die App sperrt das Bearbeiten).
//
// Mehrere Liederbücher (ab 2.2): Jedes hat seinen eigenen Speicherort und sein eigenes Konto. Alle
// Einstellungen und Anmeldungen des geöffneten Buchs liegen unter bookKey(book, …); abgeglichen
// wird nur das geöffnete Liederbuch.

import { SyncEngine, ReadOnlyError } from './sync/sync-engine.js';
import { GoogleAuth, googleRedirectUri, prefersRedirect } from './sync/google-auth.js';
import { GoogleDriveProvider } from './sync/google-drive.js';
import { WebDavProvider, webdavUrlProblem } from './sync/webdav.js';
import { DropboxProvider, dropboxRedirectUri } from './sync/dropbox.js';
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_APP_ID, DROPBOX_APP_KEY } from './sync/config.js';
import {
  listBooks, setActiveBook, addSharedBook, addBook, renameBook, removeBook, driveBookName, bookKey, personalBookName,
} from './books.js';
import { prefs } from './prefs.js';
import { SongRepository } from './storage/repository.js';
import { openIdbStore } from './storage/stores.js';
import { $ } from './ui/dom.js';
import { showMenu } from './context-menu.js';
import { BookNameStore, driveFileName, rememberRename, slimName } from './sync/book-name.js';

const TITLES = {
  off: 'Nicht verbunden',
  idle: 'Synchron',
  syncing: 'Gleiche ab …',
  offline: 'Offline',
  auth: 'Anmeldung nötig',
  error: 'Fehler beim Abgleich',
};

const fmtTime = (d) => d?.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('de', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');
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
 * Cloud-Dialog und Abgleich einrichten (Google Drive, Dropbox oder WebDAV, gemeinsame Liederbücher).
 * @param {{repo, book, beforeSync: () => Promise<void>, beforeConnect?: () => Promise<void>,
 *          beforeSwitch: () => Promise<void>, toast: Function,
 *          leaveAbo?: (entry: object) => boolean, refreshAbo?: (o: {quiet: boolean}) => Promise<void>}} opts
 *   leaveAbo/refreshAbo: Abo beenden bzw. aktualisieren (aus ui/abo.js)
 */
export function setupSync({ repo, extra = [], book, beforeSync, beforeConnect, beforeSwitch, toast, leaveAbo, refreshAbo }) {
  const dlg = $('#sync-dialog'); // Cloud: Abgleich, Mitglieder, Veröffentlichen des geöffneten Buchs
  const booksDlg = $('#books-dialog'); // Liederbücher: Liste, neu, Einladung, Abo
  const btn = $('#btn-cloud');
  $('#sync-origin').textContent = location.origin;
  $('#sync-redirect').textContent = googleRedirectUri();
  $('#webdav-origin').textContent = location.origin;
  $('#dropbox-redirect').textContent = dropboxRedirectUri();

  const cfg = (key, fallback) => localStorage.getItem(key) || fallback;
  // Google: fest in config.js eingetragen (Normalfall) – nur ohne diese Werte pro Gerät eintragbar
  const googleBuiltIn = Boolean(GOOGLE_CLIENT_ID);
  const clientId = () => GOOGLE_CLIENT_ID || cfg('gdrive.clientId', '');
  const apiKey = () => (googleBuiltIn ? GOOGLE_API_KEY : cfg('gdrive.apiKey', GOOGLE_API_KEY));
  const appId = () => (googleBuiltIn ? GOOGLE_APP_ID : cfg('gdrive.appId', GOOGLE_APP_ID));
  const appKey = () => cfg('dropbox.appKey', DROPBOX_APP_KEY);
  // Einstellung des geöffneten Liederbuchs (eigene Schlüssel je Buch, siehe bookKey)
  const K = (base) => bookKey(book, base);
  // Geteilte Liederbücher laufen immer über Google Drive; alle anderen wahlweise über Dropbox oder WebDAV
  const kindOf = (b) => {
    const k = localStorage.getItem(bookKey(b, 'sync.kind'));
    return b.shared || !['webdav', 'dropbox'].includes(k) ? 'gdrive' : k;
  };
  const kind = () => kindOf(book);
  const connectedFlag = () => localStorage.getItem(K('sync.provider')) === kind();
  const webdavOf = (b) => ({
    url: localStorage.getItem(bookKey(b, 'webdav.url')) || '',
    user: localStorage.getItem(bookKey(b, 'webdav.user')) || '',
    password: localStorage.getItem(bookKey(b, 'webdav.pass')) || '',
  });
  const webdav = () => webdavOf(book);
  const configured = () => ({ webdav: Boolean(webdav().url), dropbox: Boolean(appKey()) })[kind()] ?? Boolean(clientId());

  let provider = null;
  let engine = null;
  let auth = null; // Google-Anmeldung
  const nameStore = new BookNameStore(book); // Name des geöffneten Buchs als Abgleich-Datensatz
  let info = null; // Name/Rechte der Drive-Datei des aktiven Liederbuchs

  const googleAuth = () => new GoogleAuth({ clientId: clientId(), tokenKey: K('gdrive.token'), accountKey: K('gdrive.account') });
  // Einladung öffnen: eigene Anmeldung mit Kontoauswahl (die Einladung kann an ein anderes Konto gehen)
  const joinAuth = () => new GoogleAuth({ clientId: clientId(), tokenKey: 'gdrive.token:join', accountKey: 'gdrive.account:join' });
  const driveFor = (b, a = auth) => new GoogleDriveProvider({
    auth: a, apiKey: apiKey(), appId: appId(), book: b,
    ...(b === book && book.own ? { fileName: book.file, fileIdKey: K('gdrive.fileId') } : {}),
  });

  function build() {
    engine?.stop();
    const k = kind();
    auth = googleAuth();
    provider = k === 'webdav'
      ? new WebDavProvider(webdav())
      : k === 'dropbox'
        ? new DropboxProvider({ appKey: appKey(), tokenKey: K('dropbox.token'), ...(book.own ? { path: book.file } : {}) })
        : driveFor(book);
    // Der Name des Buchs gleicht mit ab (book-name.js) – Umbenennen gilt auf allen Geräten
    const collections = [...extra, { key: 'book', repo: nameStore, slim: slimName }];
    engine = new SyncEngine(repo, provider, { beforeSync, extra: collections, readOnly: Boolean(book.readOnly) });
    engine.addEventListener('status', render);
    engine.addEventListener('status', () => {
      if (engine.state === 'error' && engine.error instanceof ReadOnlyError) markRole('reader');
      if (engine.state === 'idle' && book.shared && !roleChecked) checkRole();
      // Google Drive: Datei heißt wie das Buch („Liederbuch – DPSG Liederbuch.json“)
      if (engine.state === 'idle' && provider.ensureName) {
        provider.ensureName(driveFileName(book, book.name)).catch((err) => console.warn('Drive-Datei umbenennen:', err));
      }
    });
  }

  // Ein anderes Gerät hat das Buch umbenannt: Namen überall nachziehen
  nameStore.addEventListener('remote-name', (e) => {
    renderBookSelect();
    renderBooks();
    render();
    toast(`Liederbuch heißt jetzt „${e.detail}“ (auf einem anderen Gerät umbenannt)`);
  });

  // ---------- Rechte eines geteilten Liederbuchs ----------

  let roleChecked = false;

  /** Rechte haben sich geändert (z. B. vom Editor auf „nur lesen“ gesetzt): merken und neu laden. */
  function markRole(role) {
    const ro = role === 'reader';
    if (!book.shared || ro === Boolean(book.readOnly)) return;
    addSharedBook({ fileId: book.fileId, name: book.name, readOnly: ro });
    toast(ro ? `„${book.name}“: Du hast hier nur Leserechte – das Liederbuch ist jetzt schreibgeschützt`
      : `„${book.name}“: Du darfst jetzt bearbeiten`, { ms: 6000 });
    setTimeout(() => location.reload(), 1500);
  }

  async function checkRole() {
    roleChecked = true;
    try {
      const role = await provider.role();
      if (role) markRole(role);
    } catch (err) {
      console.warn(err);
    }
  }

  // ---------- Liederbuch-Auswahl in der Kopfleiste ----------

  async function switchTo(id) {
    await beforeSwitch?.();
    setActiveBook(id);
    location.reload();
  }

  const bookLabel = (b) => (b.abo || b.readOnly ? `${b.name} (nur lesen)` : b.shared ? `${b.name} 👥` : b.name);
  /** Optionen zu einem Liederbuch (Rechtsklick bzw. lang drücken in der Auswahl). */
  function bookOptions(b) {
    const isActive = b.id === book.id;
    return [
      !isActive && { label: 'Öffnen', icon: 'open', action: () => switchTo(b.id) },
      !b.abo && { label: 'Umbenennen …', icon: 'edit', action: () => rename(b) },
      isActive && { label: 'Cloud: Abgleich & Teilen …', icon: 'cloud', action: () => openDialog() },
      '-',
      b.own && { label: 'Entfernen …', icon: 'trash', danger: true, action: () => removeOwnBook(b) },
      b.shared && isActive && { label: 'Verlassen …', icon: 'trash', danger: true, action: leaveBook },
      b.abo && leaveAbo && { label: 'Abo beenden …', icon: 'trash', danger: true, action: () => leaveAbo(b) && (renderBooks(), renderBookSelect()) },
      '-',
      { label: 'Liederbücher verwalten …', action: () => openBooks() },
    ];
  }

  /** Liederbuch-Auswahl in der Kopfleiste: eigenes Menü, damit jedes Buch Optionen per Rechtsklick hat. */
  function renderBookSelect() {
    const btn = $('#book-select');
    btn.querySelector('.book-select-name').textContent = bookLabel(book);
    btn.hidden = false;
    $('#app-name').hidden = true;
    const openAt = () => {
      const r = btn.getBoundingClientRect();
      return { x: r.left, y: r.bottom + 4 };
    };
    btn.onclick = () => {
      const books = listBooks();
      const menu = showMenu([
        ...books.map((b) => ({
          label: bookLabel(b),
          checked: b.id === book.id,
          action: () => b.id !== book.id && switchTo(b.id),
          context: () => bookOptions(b),
          contextTitle: b.name,
        })),
        '-',
        { label: 'Neues Liederbuch …', icon: 'plus', action: () => openBooks({ create: true }) },
        { label: 'Liederbücher verwalten …', action: () => openBooks() },
      ], { ...openAt(), title: 'Liederbücher' });
      menu.focusFirst();
    };
    // Rechtsklick auf den Namen oben: Optionen zum geöffneten Buch
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      showMenu(bookOptions(book), { ...openAt(), title: book.name }).focusFirst();
    };
  }

  // ---------- Status ----------

  function render() {
    const state = engine?.state || 'off';
    const dav = kind() === 'webdav';
    const dbx = kind() === 'dropbox';
    const gd = !dav && !dbx;
    const account = gd ? auth?.account : '';
    const where = dav ? `WebDAV (${provider.host})` : dbx ? 'Dropbox' : `Google Drive${account ? ` · ${account}` : ''}`;
    let text = '';
    if (state === 'idle') text = `${where} · zuletzt abgeglichen ${fmtTime(engine.lastSync)}`;
    else if (state === 'syncing') text = where;
    else if (state === 'offline') text = 'Änderungen werden abgeglichen, sobald wieder Verbindung besteht.';
    else if (state === 'auth') {
      text = dav
        ? `${engine.error?.message || 'Anmeldung fehlgeschlagen'}. Zugangsdaten prüfen und „Neu anmelden“ tippen – deine Lieder bleiben erhalten.`
        : `Die ${dbx ? 'Dropbox' : 'Google'}-Anmeldung${account ? ` (${account})` : ''} ist abgelaufen. „Neu anmelden“ tippen – deine Lieder bleiben erhalten.`;
    } else if (state === 'error') text = engine.error?.message || '';
    else if (book.abo) text = 'Abonniertes Liederbuch – wird über das Abo aktualisiert, nicht über die Cloud.';
    else if (book.readOnly) text = 'Geteiltes Liederbuch, nur lesen – mit Google anmelden, um den neuesten Stand zu holen.';
    else if (book.shared) text = 'Dieses gemeinsame Liederbuch braucht die Verbindung zu Google Drive.';
    else if (dav) text = 'Adresse und Zugangsdaten eintragen, dann „Verbinden“.';
    else if (dbx) text = appKey() ? 'Mit Dropbox verbinden, um alle Geräte abzugleichen.' : 'Zuerst die Dropbox-Einrichtung unten erledigen.';
    else text = clientId() ? 'Mit Google anmelden, um alle Geräte über Google Drive abzugleichen.' : 'Zuerst die Google-Einrichtung unten erledigen.';
    if (state === 'idle' && book.readOnly) text += ' · nur lesen';

    btn.dataset.state = state;
    btn.title = `Cloud-Sync: ${TITLES[state]}${text ? ' – ' + text : ''}`;
    $('#cloud-label').textContent = state === 'off' ? 'Cloud' : state === 'auth' ? 'Anmelden' : TITLES[state];
    $('#sync-status').dataset.state = state;
    $('#sync-status-title').textContent = book.abo ? 'Abo – wird nicht abgeglichen' : TITLES[state]; // Buchname steht im Titel
    $('#sync-dlg-book').textContent = book.name;
    $('#sync-status-text').textContent = text;

    const connected = state !== 'off';
    const usable = connected && state !== 'auth';
    $('#sync-disconnect').hidden = !connected;
    $('#sync-now').hidden = !usable;
    $('#sync-connect').hidden = usable;
    $('#sync-connect').textContent = state === 'auth' ? 'Neu anmelden' : gd ? 'Mit Google anmelden' : 'Verbinden';
    $('#book-actions').hidden = !clientId();
    // Abo: wird nie mit der Cloud abgeglichen – keine Einstellungen zum Abgleich zeigen
    $('#sync-config').hidden = Boolean(book.abo);
    $('#sync-card').classList.toggle('muted', Boolean(book.abo));
    $('#publish-from').textContent = book.name;
    $('#book-new-from').textContent = book.name;
    $('#drive-invite').hidden = !pendingJoin;
    for (const id of ['#sync-client-id', '#sync-api-key', '#sync-app-id']) $(id).disabled = usable;
    for (const id of ['#webdav-url', '#webdav-user', '#webdav-pass']) $(id).disabled = usable;
    $('#dropbox-app-key').disabled = usable;
    // alte Adresse wieder loswerden (nur, solange nicht verbunden)
    $('#webdav-forget').hidden = connected || !webdav().url;

    // Speicherort: nicht für geteilte Liederbücher (immer Drive) und nur, solange nicht verbunden
    $('#sync-provider-row').hidden = book.shared;
    for (const b of $('#sync-provider').querySelectorAll('button')) {
      b.setAttribute('aria-checked', String(b.dataset.value === kind()));
      b.disabled = connected && b.dataset.value !== kind();
    }
    $('#webdav-setup').hidden = !dav;
    $('#sync-setup').hidden = !gd || googleBuiltIn;
    $('#dropbox-setup').hidden = !dbx;
    $('#sync-foot-hint').textContent = dav
      ? 'Schrift- und Druckeinstellungen bleiben pro Gerät.'
      : dbx
        ? 'Die App sieht in deiner Dropbox nur ihren eigenen Ordner (unter „Apps“). Schrift- und Druckeinstellungen bleiben pro Gerät.'
        : 'Die App sieht in deinem Drive nur ihre eigenen Liederbuch-Dateien. Schrift- und Druckeinstellungen bleiben pro Gerät.';
  }

  /** Angaben zu einem Abo: Adresse (zum Kopieren), Stand, Aktualisieren und Beenden. */
  function aboDetails(b, isActive) {
    const st = prefs.get('aboState')[b.id] || {};
    const box = document.createElement('div');
    box.className = 'abo-details';
    const url = Object.assign(document.createElement('input'), { readOnly: true, value: b.abo.url, title: 'Adresse des Abos', className: 'abo-url' });
    url.onfocus = () => url.select();
    const copy = button('Kopieren', async () => {
      try {
        await navigator.clipboard.writeText(b.abo.url);
        toast('Adresse kopiert');
      } catch {
        url.select();
      }
    });
    const urlRow = document.createElement('div');
    urlRow.className = 'abo-url-row';
    urlRow.append(url, copy);
    const facts = [
      b.abo.publisher && `von ${b.abo.publisher}`,
      `Stand ${fmtWhen(st.publishedAt)}`,
      st.count != null && `${st.count} ${st.count === 1 ? 'Lied' : 'Lieder'}`,
      b.abo.user && `angemeldet als ${b.abo.user}`,
    ];
    const info = span('hint', facts.filter(Boolean).join(' · '));
    if (st.error) info.append(Object.assign(document.createElement('span'), { className: 'warn', textContent: ` · ⚠ ${st.error}` }));
    const actions = document.createElement('div');
    actions.className = 'abo-detail-actions';
    if (isActive && refreshAbo) {
      actions.append(button('Jetzt aktualisieren', async () => {
        await refreshAbo({ quiet: false });
        renderBooks();
      }));
    }
    if (leaveAbo) actions.append(button('Abo beenden', () => leaveAbo(b) && (renderBooks(), renderBookSelect()), 'danger'));
    box.append(urlRow, info, actions);
    return box;
  }

  /** Wo ein Liederbuch abgeglichen wird, kurz (für die Liste). */
  function whereOf(b) {
    if (b.abo) return 'abonniert · nur lesen';
    const account = localStorage.getItem(bookKey(b, 'gdrive.account'));
    if (b.shared) return `geteilt · Google Drive${b.readOnly ? ' · nur lesen' : ''}${account ? ` · ${account}` : ''}`;
    const k = localStorage.getItem(bookKey(b, 'sync.provider'));
    if (k !== kindOf(b)) return 'nur auf diesem Gerät';
    if (k === 'webdav') {
      let host = '';
      try {
        host = new URL(webdavOf(b).url).host;
      } catch {
        /* egal */
      }
      return `WebDAV${host ? ` (${host})` : ''}`;
    }
    return k === 'dropbox' ? 'Dropbox' : `Google Drive${account ? ` · ${account}` : ''}`;
  }

  function renderBooks() {
    const items = listBooks().map((b) => {
      const isActive = b.id === book.id;
      const row = li(span('book-name', b.name, whereOf(b)));
      if (isActive) {
        row.classList.add('active');
        row.append(span('hint', 'geöffnet'));
      } else {
        row.append(button('Öffnen', () => switchTo(b.id)));
      }
      if (!b.abo) row.append(button('Umbenennen', () => rename(b)));
      if (b.own) row.append(button('Entfernen', () => removeOwnBook(b), 'danger'));
      if (b.shared && isActive) row.append(button('Verlassen', leaveBook, 'danger'));
      if (b.abo) row.append(aboDetails(b, isActive));
      return row;
    });
    $('#book-list').replaceChildren(...items);
  }

  function rename(b) {
    const name = prompt('Neuer Name für das Liederbuch:', b.name)?.trim();
    if (!name || name === b.name) return;
    if (listBooks().some((x) => x.id !== b.id && x.name.toLowerCase() === name.toLowerCase())) {
      toast('Ein Liederbuch mit diesem Namen gibt es schon');
      return;
    }
    renameBook(b.id, name);
    // Name gleicht mit ab: das geöffnete Buch sofort, andere beim nächsten Öffnen
    if (b.id === book.id) {
      book.name = name;
      nameStore.renamed(name);
    } else rememberRename(b, name);
    renderBooks();
    renderBookSelect();
    render();
    const synced = localStorage.getItem(bookKey(b, 'sync.provider'));
    toast(synced ? `Umbenannt in „${name}“ – gilt auch auf deinen anderen Geräten` : `Umbenannt in „${name}“`);
  }

  /** Eigenes Liederbuch von diesem Gerät entfernen (die Datei in der Cloud bleibt). */
  async function removeOwnBook(b) {
    const synced = localStorage.getItem(bookKey(b, 'sync.provider'));
    const msg = synced
      ? `„${b.name}“ von diesem Gerät entfernen? Die Lieder hier werden gelöscht – was in der Cloud liegt, bleibt erhalten.`
      : `„${b.name}“ löschen? Es ist mit keiner Cloud verbunden – seine Lieder sind dann weg.`;
    if (!confirm(msg)) return;
    if (b.id === book.id) {
      engine?.stop();
      provider?.signOut?.();
    }
    removeBook(b.id);
    indexedDB.deleteDatabase(b.dbName);
    if (b.id === book.id) return switchTo('personal');
    renderBooks();
    renderBookSelect();
    toast(`„${b.name}“ entfernt`);
  }

  async function renderMembers() {
    const box = $('#members');
    box.hidden = true;
    if (kind() !== 'gdrive' || !provider.signedIn || engine.state === 'off') return;
    try {
      info = await provider.info();
      if (!info?.capabilities?.canShare) return;
      const members = await provider.members();
      $('#members-book').textContent = book.name;
      $('#member-list').replaceChildren(...members.map((m) => {
        const owner = m.role === 'owner';
        const row = li(span('member-name', m.displayName || m.emailAddress, owner ? 'Besitzer' : m.emailAddress));
        if (!owner) {
          const role = document.createElement('select');
          role.title = 'Rechte';
          role.append(new Option('liest', 'reader'), new Option('bearbeitet', 'writer'));
          role.value = m.role === 'reader' || m.role === 'commenter' ? 'reader' : 'writer';
          role.onchange = async () => {
            try {
              await provider.setMemberRole(m.id, role.value);
              toast(role.value === 'reader' ? 'Darf jetzt nur noch lesen' : 'Darf jetzt bearbeiten');
            } catch (err) {
              toast(err.message);
            }
            renderMembers();
          };
          row.append(role);
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

  /** WebDAV-Felder übernehmen; liefert eine Fehlermeldung oder null. */
  function saveWebdav() {
    const url = $('#webdav-url').value.trim();
    const user = $('#webdav-user').value.trim();
    const pass = $('#webdav-pass').value;
    if (!url) return 'Bitte die WebDAV-Adresse eintragen';
    const problem = webdavUrlProblem(url);
    if (problem) return problem;
    const old = webdav();
    if (url !== old.url || user !== old.user || pass !== old.password) {
      localStorage.setItem(K('webdav.url'), url);
      localStorage.setItem(K('webdav.user'), user);
      if (pass) localStorage.setItem(K('webdav.pass'), pass);
      else localStorage.removeItem(K('webdav.pass'));
      build();
    }
    return null;
  }

  async function connect({ silent = false } = {}) {
    if (book.abo) {
      if (!silent) toast(`Ein Abo wird nicht mit der Cloud abgeglichen – oben zu „${personalBookName()}“ wechseln`);
      return false;
    }
    if (kind() === 'webdav') return connectWebdav();
    if (kind() === 'dropbox') return connectDropbox();
    saveSetup();
    if (!clientId()) {
      $('#sync-setup').open = true;
      $('#sync-client-id').focus();
      toast('Bitte zuerst die Google-Client-ID eintragen');
      return false;
    }
    if (!provider.signedIn) {
      // Erste Anmeldung eines Liederbuchs (auch des persönlichen): Google zeigt die Kontoauswahl –
      // jedes Buch kann ein anderes Google-Konto nutzen
      const choose = !auth.known;
      // installierte App auf iPhone/iPad: Weiterleitung statt Fenster (siehe finishGoogle)
      if (prefersRedirect()) return redirectToGoogle({ silent: auth.known, choose });
      try {
        try {
          await provider.signIn({ silent: silent || auth.known, choose });
        } catch (err) {
          if (!(silent || auth.known)) throw err;
          await provider.signIn();
        }
      } catch (err) {
        toast(`Anmelden fehlgeschlagen: ${err.message}`);
        return false;
      }
    }
    return startGoogle();
  }

  /** Angemeldet: Abgleich starten (beim ersten Mal wandern die Lieder des Geräts nach Drive). */
  async function startGoogle() {
    const first = !connectedFlag();
    localStorage.setItem(K('sync.provider'), 'gdrive');
    if (first && !book.shared) await beforeConnect?.();
    if (engine.state === 'off') engine.start();
    else await engine.sync();
    if (first) toast(`Mit Google Drive verbunden${auth.account ? ` (${auth.account})` : ''}`);
    // Konto nachtragen (Anmeldungen von vor 2.2 kennen es noch nicht) und anzeigen
    if (!auth.account) auth.ensureAccount().then(() => render()).catch(() => {});
    if (dlg.open) renderMembers();
    return true;
  }

  /** Zur Google-Anmeldung weiterleiten; extra wird bis zur Rückkehr aufbewahrt. */
  async function redirectToGoogle({ silent = false, choose = false, extra = {}, via = auth } = {}) {
    try {
      await beforeSwitch?.(); // Ungespeichertes sichern, die Seite wird gleich verlassen
      location.assign(via.loginUrl({ silent, choose, extra: { bookId: book.id, ...extra } }));
    } catch (err) {
      toast(`Anmelden fehlgeschlagen: ${err.message}`);
    }
    return false;
  }

  /** Rückkehr von der Google-Anmeldung (#access_token=… in der Adresse) auswerten. */
  async function finishGoogle() {
    let saved = null;
    try {
      saved = auth.finishLogin(location.hash);
      if (!saved) return;
    } catch (err) {
      history.replaceState(null, '', location.pathname + location.search);
      if (err.retry) return redirectToGoogle({ extra: err.saved }); // still ging nicht: mit Rückfrage
      toast(`Anmelden fehlgeschlagen: ${err.message}`);
      render();
      return;
    }
    // Token nicht in der Adresse (und im Verlauf) lassen
    history.replaceState(null, '', location.pathname + location.search);
    if (saved.join) return joinDrive(saved.join);
    if (saved.bookId === book.id && kind() === 'gdrive') await startGoogle();
  }

  // ---------- Einladung per Link öffnen (#drive=<Datei-ID>) ----------

  /** Link aus der Einladungs-Mail: <App>#drive=<Datei-ID> */
  const inviteLink = (fileId) => `${location.origin}${location.pathname}#drive=${encodeURIComponent(fileId)}`;

  function checkDriveHash() {
    const m = /^#drive=([^&]+)/.exec(location.hash);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    const fileId = decodeURIComponent(m[1]);
    const known = listBooks().find((b) => b.fileId === fileId);
    if (known) {
      if (known.id !== book.id) switchTo(known.id);
      return;
    }
    pendingJoin = fileId;
    openBooks();
  }
  let pendingJoin = null;

  /**
   * Geteiltes Liederbuch öffnen: anmelden (falls nötig), Datei in der Google-Dateiauswahl bestätigen
   * (erst dann darf die App sie lesen), Rechte abfragen, als Liederbuch eintragen.
   */
  async function joinDrive(fileId = '') {
    saveSetup();
    const ja = joinAuth();
    if (!ja.signedIn) {
      if (prefersRedirect()) return redirectToGoogle({ choose: true, via: ja, extra: { join: fileId } });
      try {
        await ja.signIn({ choose: true });
      } catch (err) {
        toast(`Anmelden fehlgeschlagen: ${err.message}`);
        return;
      }
    }
    // Der Cloud-Dialog liegt als modaler Dialog immer obenauf – die Google-Dateiauswahl käme nicht
    // davor. Also vorher schließen; bei Abbruch oder Fehler wieder öffnen.
    const reopen = [dlg, booksDlg].find((d) => d.open);
    reopen?.close();
    try {
      const picker = driveFor({ shared: true, fileId }, ja);
      const file = await picker.pickShared({ fileId });
      if (!file) {
        if (reopen) reopenDialog(reopen);
        return;
      }
      pendingJoin = null;
      const meta = await driveFor({ shared: true, fileId: file.id }, ja).info();
      const readOnly = !meta?.capabilities?.canEdit;
      const joined = addSharedBook({ fileId: file.id, name: driveBookName(file.name, meta?.owners?.[0]?.displayName), readOnly, ownAuth: true });
      // Die Anmeldung, mit der die Einladung geöffnet wurde, gehört ab jetzt diesem Liederbuch
      for (const [from, base] of [[ja.tokenKey, 'gdrive.token'], [ja.accountKey, 'gdrive.account']]) {
        const v = localStorage.getItem(from);
        if (v) localStorage.setItem(bookKey(joined, base), v);
        localStorage.removeItem(from);
      }
      toast(`„${joined.name}“ geöffnet${readOnly ? ' – nur lesen' : ''}`);
      await switchTo(joined.id);
    } catch (err) {
      if (reopen && !reopen.open) reopenDialog(reopen);
      if (/API-Schlüssel/.test(err.message)) $('#sync-setup').open = true;
      toast(`Öffnen fehlgeschlagen: ${err.message}`);
    }
  }

  /**
   * Verbindungsfehler im Dialog stehen lassen (nicht nur kurz als Meldung): was schiefging,
   * was zu tun ist, und das betroffene Feld markieren.
   */
  function showProblem(message) {
    const m = String(message || '').replace(/[.\s]+$/, '');
    let field = null;
    let tip = '';
    if (/Passwort falsch|401/.test(m)) {
      field = '#webdav-pass';
      tip = 'Benutzername und Passwort prüfen (Groß-/Kleinschreibung). Bei Nextcloud ein App-Passwort nehmen.';
    } else if (/Berechtigung|403/.test(m)) {
      field = '#webdav-user';
      tip = 'Der Benutzer darf in diesen Ordner nicht schreiben – Freigabe bzw. Rechte auf dem Server prüfen.';
    } else if (/nicht erreichbar|Adresse|PROPFIND|404|405/.test(m)) {
      field = '#webdav-url';
      tip = /PROPFIND|405/.test(m)
        ? 'Die Adresse zeigt auf keinen WebDAV-Ordner. Bei Nextcloud: …/remote.php/dav/files/NAME/Ordner/'
        : 'Tipp: Liegt der Ordner auf demselben Server wie die App (gleiche Adresse und Port), gibt es keine CORS-Probleme.';
    } else if (/Offline/.test(m)) {
      tip = 'Dieses Gerät hat gerade keine Internetverbindung.';
    }
    for (const id of ['#webdav-url', '#webdav-user', '#webdav-pass']) $(id).classList.toggle('invalid', id === field);
    $('#sync-status').dataset.state = 'error';
    $('#sync-status-title').textContent = 'Verbinden fehlgeschlagen';
    $('#sync-status-text').textContent = tip ? `${m}. ${tip}` : m;
    if (field) $(field).focus();
  }
  for (const id of ['#webdav-url', '#webdav-user', '#webdav-pass']) $(id).addEventListener('input', (e) => e.target.classList.remove('invalid'));

  async function connectWebdav() {
    const problem = saveWebdav();
    if (problem) {
      showProblem(problem);
      $('#webdav-url').classList.add('invalid');
      $('#webdav-url').focus();
      return false;
    }
    try {
      await provider.signIn();
    } catch (err) {
      if (engine.state === 'auth') render();
      showProblem(err.message);
      if (!dlg.open) toast(`Verbinden fehlgeschlagen: ${err.message}`);
      return false;
    }
    const first = !connectedFlag();
    localStorage.setItem(K('sync.provider'), 'webdav');
    if (first) await beforeConnect?.();
    if (engine.state === 'off') engine.start();
    else await engine.sync();
    if (first) toast(`Mit ${provider.host} verbunden`);
    return true;
  }

  /** Dropbox-App-Schlüssel übernehmen (neu bauen, wenn er sich geändert hat). */
  function saveDropbox() {
    const v = $('#dropbox-app-key').value.trim();
    if (v === (localStorage.getItem('dropbox.appKey') || '')) return;
    if (v) localStorage.setItem('dropbox.appKey', v);
    else localStorage.removeItem('dropbox.appKey');
    build();
  }

  /** Verbunden (nach der Anmeldung oder mit noch gültigem Langzeit-Token): Abgleich starten. */
  async function startDropbox() {
    const first = !connectedFlag();
    localStorage.setItem(K('sync.provider'), 'dropbox');
    if (first) await beforeConnect?.();
    if (engine.state === 'off') engine.start();
    else await engine.sync();
    if (first) toast('Mit Dropbox verbunden');
    return true;
  }

  /** Zu Dropbox weiterleiten; die Seite kommt danach mit ?code=… zurück (siehe finishDropbox). */
  async function connectDropbox() {
    saveDropbox();
    if (!appKey()) {
      $('#dropbox-setup').open = true;
      $('#dropbox-app-key').focus();
      toast('Bitte zuerst den Dropbox-App-Schlüssel eintragen');
      return false;
    }
    if (provider.signedIn) return startDropbox();
    try {
      await beforeSwitch?.(); // Ungespeichertes sichern, die Seite wird gleich verlassen
      location.assign(await provider.loginUrl({ bookId: book.id }, { choose: !connectedFlag() }));
    } catch (err) {
      toast(`Verbinden fehlgeschlagen: ${err.message}`);
    }
    return false;
  }

  /** Rückkehr von der Dropbox-Anmeldung (?code=…&state=… in der Adresse) auswerten. */
  async function finishDropbox() {
    const query = new URLSearchParams(location.search);
    if (!query.has('state') || !(query.has('code') || query.has('error'))) return;
    // Code nicht in der Adresse (und im Verlauf) lassen
    history.replaceState(null, '', location.pathname + location.hash);
    if (kind() !== 'dropbox') return;
    try {
      const saved = await provider.finishLogin(query);
      if (saved && saved.bookId === book.id) await startDropbox();
    } catch (err) {
      toast(`Verbinden fehlgeschlagen: ${err.message}`);
      render();
    }
  }

  // Speicherort wählen (nur solange nicht verbunden)
  $('#sync-provider').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-value]');
    if (!b || b.disabled || b.dataset.value === kind() || engine.state !== 'off') return;
    localStorage.setItem(K('sync.kind'), b.dataset.value);
    build();
    render();
    renderMembers();
  });

  $('#sync-connect').onclick = () => connect({ silent: engine?.state === 'auth' });
  $('#sync-now').onclick = () => engine.sync();
  $('#webdav-forget').onclick = () => {
    if (!confirm(`Gespeicherte WebDAV-Adresse und Zugangsdaten auf diesem Gerät löschen?\n${webdav().url}`)) return;
    for (const k of ['webdav.url', 'webdav.user', 'webdav.pass']) localStorage.removeItem(K(k));
    for (const id of ['#webdav-url', '#webdav-user', '#webdav-pass']) $(id).value = '';
    build();
    render();
    toast('WebDAV-Zugangsdaten gelöscht');
  };

  $('#sync-disconnect').onclick = () => {
    provider.signOut();
    engine.stop();
    localStorage.removeItem(K('sync.provider'));
    if (kind() === 'webdav') {
      // Passwort nicht auf dem Gerät liegen lassen; Adresse und Name bleiben für später
      localStorage.removeItem(K('webdav.pass'));
      $('#webdav-pass').value = '';
      build();
      render();
    }
    $('#members').hidden = true;
    toast('Cloud-Sync getrennt – die Lieder bleiben auf diesem Gerät');
  };

  // ---------- Neues Liederbuch ----------

  /** WebDAV-Ordner für ein neues Buch: neben dem Ordner des geöffneten Buchs, benannt nach dem Buch. */
  function webdavFolderFor(name) {
    const base = webdav().url || localStorage.getItem('webdav.url') || '';
    if (!base) return '';
    const folder = base.replace(/[^/]*\.json$/i, '').replace(/\/*$/, '');
    return `${folder.replace(/[^/]*$/, '')}${encodeURIComponent(name)}/`;
  }

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
      const created = addBook({ name });
      const where = $('#book-new-kind').value;
      if (where !== 'local') localStorage.setItem(bookKey(created, 'sync.kind'), where);
      if (where === 'webdav') {
        const w = webdav().url ? webdav() : webdavOf({ id: 'personal' });
        const url = webdavFolderFor(name);
        if (url) {
          localStorage.setItem(bookKey(created, 'webdav.url'), url);
          if (w.user) localStorage.setItem(bookKey(created, 'webdav.user'), w.user);
          if (w.password) localStorage.setItem(bookKey(created, 'webdav.pass'), w.password);
        }
      }
      if ($('#book-new-copy').checked) {
        const songs = (await repo.allRecords()).filter((r) => !r.deletedAt);
        await new SongRepository(await openIdbStore(created.dbName)).applyRemote(songs);
      }
      toast(where === 'local' ? `„${name}“ angelegt` : `„${name}“ angelegt – jetzt unter „Abgleich“ verbinden`);
      if (where !== 'local') localStorage.setItem('openSyncDialog', '1');
      await switchTo(created.id);
    } catch (err) {
      toast(`Anlegen fehlgeschlagen: ${err.message}`);
    }
  };

  $('#book-join').onclick = () => {
    saveSetup();
    joinDrive();
  };
  $('#drive-invite-ok').onclick = () => joinDrive(pendingJoin);

  async function leaveBook() {
    const owner = info?.ownedByMe || (await provider.info().catch(() => null))?.ownedByMe;
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
    const role = $('#invite-role').value;
    const message = `Du bist zum Liederbuch „${book.name}“ eingeladen${role === 'reader' ? ' (nur lesen)' : ''}. `
      + `Öffne diesen Link, melde dich mit diesem Google-Konto an und bestätige die Datei: ${inviteLink(provider.fileId)}`;
    try {
      await provider.invite(email, message, role);
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

  // ---------- Leiste „nur lesen“ (geteiltes Liederbuch mit Leserechten) ----------

  function setupReadOnlyBar() {
    document.body.dataset.readonly = 'drive';
    $('#abo-bar').hidden = false;
    $('#publish-card').hidden = true;
    $('#abo-bar-title').textContent = 'Nur lesen';
    const status = () => {
      const st = engine.state;
      $('#abo-bar-status').textContent = st === 'idle'
        ? `Google Drive · Stand ${fmtTime(engine.lastSync)}`
        : st === 'auth' ? 'Google Drive · Anmeldung nötig' : `Google Drive · ${TITLES[st]}`;
    };
    engine.addEventListener('status', status);
    status();
    $('#abo-refresh').onclick = () => (engine.state === 'auth' || engine.state === 'off' ? connect({ silent: true }) : engine.sync());
    $('#abo-leave').onclick = () => leaveBook();
    $('#abo-home').onclick = () => switchTo('personal');
  }

  // ---------- Dialog ----------

  function openDialog() {
    $('#sync-client-id').value = clientId();
    $('#sync-api-key').value = apiKey();
    $('#sync-app-id').value = appId();
    $('#sync-setup').open = !clientId();
    $('#dropbox-app-key').value = appKey();
    $('#dropbox-setup').open = !appKey();
    const w = webdav();
    $('#webdav-url').value = w.url;
    $('#webdav-user').value = w.user;
    $('#webdav-pass').value = w.password;
    render();
    renderMembers();
    dlg.showModal();
  }

  /** Liederbücher-Dialog öffnen; create: gleich das Formular „Neues Liederbuch“. */
  function openBooks({ create = false } = {}) {
    render();
    renderBooks();
    $('#book-new').open = create || $('#book-new').open;
    booksDlg.showModal();
    if (create) {
      $('#book-new-name').focus();
      $('#book-new').scrollIntoView({ block: 'center' });
    }
  }

  const reopenDialog = (d) => (d === booksDlg ? openBooks() : openDialog());

  $('#btn-books').onclick = () => {
    dlg.close();
    openBooks();
  };
  $('#btn-books-cloud').onclick = () => {
    booksDlg.close();
    openDialog();
  };

  // Abgelaufene Anmeldung: Klick auf den Cloud-Knopf erneuert sie direkt
  btn.onclick = async () => {
    if (engine?.state === 'auth' && kind() === 'gdrive' && (await connect({ silent: true }))) return;
    openDialog();
  };
  for (const d of [dlg, booksDlg]) d.addEventListener('click', (e) => e.target === d && d.close());

  build();
  render();
  renderBookSelect();
  if (book.readOnly) setupReadOnlyBar();
  // Abo: wird über das Abo aktualisiert, nie mit der eigenen Cloud abgeglichen.
  // Geteilte Liederbücher gehören immer zu Google Drive: abgleichen, sobald einmal angemeldet.
  const autoStart = book.shared ? auth.known : connectedFlag();
  if (!book.abo && autoStart && configured()) engine.start();
  // Konto des Buchs nachtragen, falls die Anmeldung von vor 2.2 stammt (für die Anzeige im Dialog)
  if (kind() === 'gdrive' && auth.signedIn && !auth.account) auth.ensureAccount().then(() => render()).catch(() => {});
  finishDropbox();
  finishGoogle();
  checkDriveHash();
  addEventListener('hashchange', checkDriveHash);
  if (localStorage.getItem('openSyncDialog')) {
    localStorage.removeItem('openSyncDialog');
    openDialog();
  }
  return {
    get engine() { return engine; },
    /** Für „Mit anderen teilen“: wo das geöffnete Buch liegt und ob es verbunden ist. */
    shareState: () => ({ kind: kind(), connected: Boolean(engine && engine.state !== 'off' && connectedFlag()), shared: Boolean(book.shared) }),
    /**
     * Cloud-Dialog öffnen. provider: Speicherort vorwählen (nur solange nicht verbunden);
     * members: zu „Mitglieder“ springen und das E-Mail-Feld aktivieren (gemeinsames Liederbuch).
     */
    async openCloud({ provider = null, members = false } = {}) {
      if (provider && provider !== kind() && (!engine || engine.state === 'off')) {
        localStorage.setItem(K('sync.kind'), provider);
        build();
      }
      openDialog();
      if (!members) return;
      await renderMembers();
      if ($('#members').hidden) return;
      $('#members').scrollIntoView({ block: 'center' });
      $('#invite-email').focus();
    },
    /** „Neues Liederbuch“ mit Speicherort und „Lieder übernehmen“ vorausgefüllt. */
    openNewBook({ where = 'local', copy = false } = {}) {
      openBooks({ create: true });
      $('#book-new-kind').value = where;
      $('#book-new-kind').dispatchEvent(new Event('change'));
      $('#book-new-copy').checked = copy;
    },
  };
}
