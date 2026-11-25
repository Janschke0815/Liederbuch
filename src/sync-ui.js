// Cloud: Knopf in der Kopfleiste, Dialog (verbinden, Mitglieder, einladen), Abgleich des geöffneten
// Liederbuchs und die Leiste „nur lesen“. Die Liederbücher selbst (Auswahl oben, Verwaltung, Neues
// Liederbuch) stehen in books-ui.js; setupSync richtet beides ein.
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
  listBooks, addSharedBook, removeBook, driveBookName, bookKey, personalBookName, unknownDriveBooks, adoptDriveBook,
} from './books.js';
import { setupBooks } from './books-ui.js';
import { $, el, textButton, textSpan } from './ui/dom.js';
import { BookNameStore, driveFileName, slimName } from './sync/book-name.js';
import { connectedVia, syncKindOf, webdavOf } from './sync/book-settings.js';
import { clearInvite, fetchInvites, postInvite } from './sync/invite-box.js';
import { prefs } from './prefs.js';

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
 * Cloud-Dialog und Abgleich einrichten (Google Drive, Dropbox oder WebDAV, gemeinsame Liederbücher).
 * @param {{repo, book, beforeSync: () => Promise<void>, beforeConnect?: () => Promise<void>,
 *          beforeSwitch: () => Promise<void>, toast: Function,
 *          leaveAbo?: (entry: object) => boolean, refreshAbo?: (o: {quiet: boolean}) => Promise<void>}} opts
 *   leaveAbo/refreshAbo: Abo beenden bzw. aktualisieren (aus ui/abo.js)
 */
export function setupSync({ repo, extra = [], book, beforeSync, beforeConnect, beforeSwitch, toast, leaveAbo, refreshAbo }) {
  const dlg = $('#sync-dialog'); // Cloud: Abgleich, Mitglieder, Veröffentlichen des geöffneten Buchs
  const booksDlg = $('#books-dialog'); // Liederbücher (books-ui.js) – hier nur für die Google-Dateiauswahl
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
  // Speicherort und Zugangsdaten des geöffneten Buchs (sync/book-settings.js)
  const kind = () => syncKindOf(book);
  const connectedFlag = () => connectedVia(book) === kind();
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
      if (engine.state === 'idle' && !lookedForBooks) offerDriveBooks();
      // Google Drive: Datei heißt wie das Buch („Liederbuch – DPSG Liederbuch.json“)
      if (engine.state === 'idle' && provider.ensureName) {
        provider.ensureName(driveFileName(book, book.name)).catch((err) => console.warn('Drive-Datei umbenennen:', err));
      }
    });
  }

  // Ein anderes Gerät hat das Buch umbenannt: Namen überall nachziehen
  nameStore.addEventListener('remote-name', (e) => {
    books.refresh();
    render();
    toast(`Liederbuch heißt jetzt „${e.detail}“ (auf einem anderen Gerät umbenannt)`);
  });

  // ---------- Weitere eigene Liederbücher in Drive (z. B. am Laptop angelegt) ----------

  let lookedForBooks = false;
  const OFFERED = 'gdrive.offeredBooks'; // schon angebotene Datei-IDs (nicht bei jedem Start nachfragen)

  /**
   * Nach dem Abgleich: Gibt es im selben Google-Konto Liederbücher, die dieses Gerät nicht kennt?
   * Dann anbieten, sie hinzuzufügen. force: auch schon einmal angebotene (beim Verbinden).
   */
  async function offerDriveBooks({ force = false } = {}) {
    lookedForBooks = true;
    if (kind() !== 'gdrive' || !auth?.signedIn) return;
    let found;
    try {
      found = await unknownInDrive();
    } catch (err) {
      console.warn('Liederbücher in Drive suchen:', err);
      return;
    }
    const offered = new Set(JSON.parse(localStorage.getItem(OFFERED) || '[]'));
    const fresh = force ? found : found.filter((f) => !offered.has(f.fileId));
    if (!fresh.length) return;
    const names = fresh.map((f) => `„${driveBookName(f.name)}“`).join(', ');
    toast(fresh.length === 1 ? `In deinem Google Drive liegt noch das Liederbuch ${names}`
      : `In deinem Google Drive liegen noch ${fresh.length} Liederbücher: ${names}`, {
      action: 'Hinzufügen',
      ms: 12000,
      onAction: () => adoptAll(fresh),
    });
    // erst nach einer Weile als angeboten merken (eine andere Meldung kann diese verdrängen)
    setTimeout(() => localStorage.setItem(OFFERED, JSON.stringify([...offered, ...fresh.map((f) => f.fileId)])), 12000);
  }

  /** Eigene Liederbuch-Dateien im Google-Konto des geöffneten Buchs, die dieses Gerät nicht kennt. */
  async function unknownInDrive() {
    return unknownDriveBooks(await provider.listOwnBooks());
  }

  /** Gefundene Drive-Liederbücher eintragen (mit der Anmeldung des geöffneten Buchs). */
  function adoptAll(files) {
    const tokenKey = K('gdrive.token');
    const from = { token: localStorage.getItem(tokenKey), account: localStorage.getItem(K('gdrive.account')), global: tokenKey === 'gdrive.token' };
    files.forEach((f) => adoptDriveBook(f, from));
    books.refresh();
    const names = files.map((f) => `„${driveBookName(f.name)}“`).join(', ');
    toast(`${names} hinzugefügt – oben in der Liederbuch-Auswahl`, { ms: 6000 });
  }

  // Knopf „In Google Drive suchen“ im Dialog Liederbücher
  $('#book-find').onclick = async () => {
    if (kind() !== 'gdrive' || !connectedFlag()) {
      return toast('Erst das geöffnete Liederbuch mit Google Drive verbinden (Cloud) – gesucht wird in dessen Google-Konto', { ms: 6000 });
    }
    if (!auth.signedIn && !(await connect({ silent: true }))) return;
    try {
      const found = await unknownInDrive();
      if (found.length) adoptAll(found);
      else toast(`Keine weiteren Liederbücher in Google Drive${auth.account ? ` (${auth.account})` : ''}`, { ms: 6000 });
    } catch (err) {
      toast(`Suche in Google Drive fehlgeschlagen: ${err.message}`, { ms: 8000 });
    }
  };

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
    // Abo: wird nie mit der Cloud abgeglichen – keine Einstellungen zum Abgleich zeigen
    $('#sync-config').hidden = Boolean(book.abo);
    $('#sync-card').classList.toggle('muted', Boolean(book.abo));
    $('#publish-from').textContent = book.name;
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
        const row = el('li', {}, textSpan('member-name', m.displayName || m.emailAddress, owner ? 'Besitzer' : m.emailAddress));
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
          row.append(textButton('Entfernen', async () => {
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
    if (first) setTimeout(() => offerDriveBooks({ force: true }), 3000); // nach der Meldung „verbunden“
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
    books.open();
  }
  let pendingJoin = null;

  // ---------- Einladungs-Briefkasten (sync/invite-box.js) ----------
  // Beim Start für alle Google-Adressen dieses Geräts nachsehen; eine Einladung erscheint als Meldung
  // und im Dialog Liederbücher (oben, mit Öffnen und Ablehnen).

  let pendingInvite = null; // { fileId, name, from, email, role, at }
  let moreInvites = [];

  /** Google-Adressen, mit denen auf diesem Gerät schon angemeldet wurde. */
  function knownAccounts() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^gdrive\.account(:|$)/.test(k) && localStorage.getItem(k)) out.push(localStorage.getItem(k));
    }
    return out;
  }

  /** Nächste offene Einladung zeigen (falls keine andere gerade ansteht). */
  function showNextInvite() {
    if (pendingJoin || !moreInvites.length) return;
    pendingInvite = moreInvites.shift();
    pendingJoin = pendingInvite.fileId;
    books.refresh();
    const who = pendingInvite.from ? `${pendingInvite.from} hat dich` : 'Du wurdest';
    toast(`${who} zum Liederbuch „${pendingInvite.name || 'Gemeinsames Liederbuch'}“ eingeladen`, {
      action: 'Ansehen', ms: 15000, onAction: () => books.open(),
    });
  }

  async function checkInvites() {
    const emails = knownAccounts();
    if (!emails.length || !clientId()) return;
    let found;
    try {
      found = await fetchInvites(emails);
    } catch (err) {
      console.warn('Einladungen nachsehen:', err);
      return;
    }
    const known = new Set(listBooks().map((b) => b.fileId).filter(Boolean));
    const declined = new Set(prefs.get('invitesDeclined'));
    for (const inv of found) {
      // schon angenommen (auch auf diesem Gerät über den Link): wegräumen
      if (known.has(inv.fileId)) clearInvite(inv.email, inv.fileId).catch(() => {});
    }
    moreInvites = found.filter((inv) => !known.has(inv.fileId) && !declined.has(inv.fileId));
    showNextInvite();
  }

  /** Einladung ablehnen: nicht mehr zeigen und aus dem Briefkasten nehmen. */
  function declineInvite() {
    if (!pendingInvite) return;
    const inv = pendingInvite;
    prefs.set('invitesDeclined', [...prefs.get('invitesDeclined'), inv.fileId].slice(-50));
    clearInvite(inv.email, inv.fileId).catch(() => {});
    pendingInvite = null;
    pendingJoin = null;
    toast(`Einladung zu „${inv.name || 'Gemeinsames Liederbuch'}“ abgelehnt`);
    showNextInvite();
  }

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
      if (pendingInvite?.fileId === file.id) {
        clearInvite(pendingInvite.email, file.id).catch(() => {});
        pendingInvite = null;
      }
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

  /** Gemeinsames Liederbuch auf diesem Gerät entfernen. */
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
      // zusätzlich in den Briefkasten: die App der Person zeigt die Einladung beim nächsten Start
      postInvite({ email, fileId: provider.fileId, name: book.name, from: auth.account || '', role })
        .catch((err) => console.warn('Einladung in den Briefkasten legen:', err));
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

  const reopenDialog = (d) => (d === booksDlg ? books.open() : openDialog());

  $('#btn-books').onclick = () => {
    dlg.close();
    books.open();
  };

  // Abgelaufene Anmeldung: Klick auf den Cloud-Knopf erneuert sie direkt
  btn.onclick = async () => {
    if (engine?.state === 'auth' && kind() === 'gdrive' && (await connect({ silent: true }))) return;
    openDialog();
  };
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());

  // Liederbücher (books-ui.js): bekommt vom Cloud-Teil nur, was es braucht
  const books = setupBooks({
    book, repo, toast, beforeSync, beforeSwitch, leaveAbo, refreshAbo,
    cloud: {
      openDialog,
      leaveBook,
      renamed(name) {
        nameStore.renamed(name);
        render();
      },
      stop() {
        engine?.stop();
        provider?.signOut?.();
      },
      join: joinDrive,
      pendingJoin: () => pendingJoin,
      pendingInvite: () => pendingInvite,
      declineInvite,
      googleReady: () => Boolean(clientId()),
    },
  });
  const { switchTo } = books;

  build();
  render();
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
  setTimeout(checkInvites, 3000); // nach dem Start, ohne ihn aufzuhalten
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
    openNewBook: books.openNew,
  };
}
