// Cloud-Knopf, Liederbuch-Auswahl und Dialog (verbinden, gemeinsame Liederbücher, Mitglieder).
//
// Google Drive: Anmeldung mit google-auth.js (Fenster, auf iPhone/iPad per Weiterleitung), Speichern mit
// google-drive.js. Einladung per E-Mail mit Link <App>#drive=<Datei-ID>: Wer ihn öffnet, meldet sich
// an, bestätigt die Datei in der Google-Dateiauswahl und hat das Liederbuch – mit Leserechten nur
// zum Lesen (Google verweigert dann das Schreiben, die App sperrt das Bearbeiten).

import { SyncEngine, SYNC_FORMAT, SYNC_VERSION, ReadOnlyError } from './sync/sync-engine.js';
import { GoogleAuth, googleRedirectUri, prefersRedirect } from './sync/google-auth.js';
import { GoogleDriveProvider } from './sync/google-drive.js';
import { WebDavProvider, webdavUrlProblem } from './sync/webdav.js';
import { DropboxProvider, dropboxRedirectUri } from './sync/dropbox.js';
import { GOOGLE_CLIENT_ID, GOOGLE_API_KEY, GOOGLE_APP_ID, DROPBOX_APP_KEY } from './sync/config.js';
import {
  listBooks, setActiveBook, addSharedBook, removeBook, driveBookName, fileNameForBook,
} from './books.js';
import { prefs } from './prefs.js';
import { slimRecord } from './storage/repository.js';
import { $ } from './ui/dom.js';

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
  const dlg = $('#sync-dialog');
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
  // Gemeinsame Liederbücher laufen immer über Google Drive; das persönliche wahlweise über
  // Dropbox oder WebDAV
  const kind = () => {
    const k = localStorage.getItem('sync.kind');
    return book.shared || !['webdav', 'dropbox'].includes(k) ? 'gdrive' : k;
  };
  const connectedFlag = () => localStorage.getItem('sync.provider') === kind();
  const webdav = () => ({
    url: localStorage.getItem('webdav.url') || '',
    user: localStorage.getItem('webdav.user') || '',
    password: localStorage.getItem('webdav.pass') || '',
  });
  const configured = () => ({ webdav: Boolean(webdav().url), dropbox: Boolean(appKey()) })[kind()] ?? Boolean(clientId());

  let provider = null;
  let engine = null;
  let auth = null; // Google-Anmeldung
  let info = null; // Name/Rechte der Drive-Datei des aktiven Liederbuchs

  const googleAuth = () => new GoogleAuth({ clientId: clientId() });
  const driveFor = (b) => new GoogleDriveProvider({ auth, apiKey: apiKey(), appId: appId(), book: b });

  function build() {
    engine?.stop();
    const k = kind();
    auth = googleAuth();
    provider = k === 'webdav'
      ? new WebDavProvider(webdav())
      : k === 'dropbox'
        ? new DropboxProvider({ appKey: appKey() })
        : driveFor(book);
    engine = new SyncEngine(repo, provider, { beforeSync, extra, readOnly: Boolean(book.readOnly) });
    engine.addEventListener('status', render);
    engine.addEventListener('status', () => {
      if (engine.state === 'error' && engine.error instanceof ReadOnlyError) markRole('reader');
      if (engine.state === 'idle' && book.shared && !roleChecked) checkRole();
    });
  }

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

  function renderBookSelect() {
    const books = listBooks();
    const sel = $('#book-select');
    sel.replaceChildren(...books.map((b) => new Option(b.abo || b.readOnly ? `${b.name} (nur lesen)` : b.shared ? `${b.name} 👥` : b.name, b.id, false, b.id === book.id)));
    const several = books.length > 1;
    sel.hidden = !several;
    $('#app-name').hidden = several;
    sel.onchange = () => switchTo(sel.value);
  }

  // ---------- Status ----------

  function render() {
    const state = engine?.state || 'off';
    const dav = kind() === 'webdav';
    const dbx = kind() === 'dropbox';
    const gd = !dav && !dbx;
    const where = dav ? `WebDAV (${provider.host})` : dbx ? 'Dropbox' : 'Google Drive';
    let text = '';
    if (state === 'idle') text = `${where} · zuletzt abgeglichen ${fmtTime(engine.lastSync)}`;
    else if (state === 'syncing') text = where;
    else if (state === 'offline') text = 'Änderungen werden abgeglichen, sobald wieder Verbindung besteht.';
    else if (state === 'auth') {
      text = dav
        ? `${engine.error?.message || 'Anmeldung fehlgeschlagen'}. Zugangsdaten prüfen und „Neu anmelden“ tippen – deine Lieder bleiben erhalten.`
        : `Die ${dbx ? 'Dropbox' : 'Google'}-Anmeldung ist abgelaufen. „Neu anmelden“ tippen – deine Lieder bleiben erhalten.`;
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
    $('#sync-status-title').textContent = book.abo ? `${book.name}: Abo` : `${book.name}: ${TITLES[state]}`;
    $('#sync-status-text').textContent = text;

    const connected = state !== 'off';
    const usable = connected && state !== 'auth';
    $('#sync-disconnect').hidden = !connected;
    $('#sync-now').hidden = !usable;
    $('#sync-connect').hidden = usable;
    $('#sync-connect').textContent = state === 'auth' ? 'Neu anmelden' : gd ? 'Mit Google anmelden' : 'Verbinden';
    // Gemeinsame Liederbücher laufen immer über Google Drive – egal, wo das persönliche abgleicht;
    // Anlegen und Öffnen melden bei Bedarf selbst bei Google an
    const canShare = !book.abo && Boolean(clientId());
    $('#book-actions').hidden = !canShare;
    $('#book-new').hidden = !canShare;
    // Abo: wird nie mit der Cloud abgeglichen – keine Einstellungen zum Abgleich zeigen
    $('#sync-config').hidden = Boolean(book.abo);
    $('#sync-card').classList.toggle('muted', Boolean(book.abo));
    $('#publish-from').textContent = book.name;
    $('#book-offline-hint').hidden = canShare || Boolean(book.abo);
    $('#book-webdav-hint').hidden = gd || Boolean(book.abo);
    $('#book-webdav-hint').textContent = `Gemeinsame Liederbücher laufen über Google Drive (Anmeldung beim Anlegen oder Öffnen) – „${book.name}“ gleicht weiter über ${dav ? 'WebDAV' : 'Dropbox'} ab.`;
    $('#book-new-from').textContent = book.name;
    $('#drive-invite').hidden = !pendingJoin;
    for (const id of ['#sync-client-id', '#sync-api-key', '#sync-app-id']) $(id).disabled = usable;
    for (const id of ['#webdav-url', '#webdav-user', '#webdav-pass']) $(id).disabled = usable;
    $('#dropbox-app-key').disabled = usable;
    // alte Adresse wieder loswerden (nur, solange nicht verbunden)
    $('#webdav-forget').hidden = connected || !webdav().url;

    // Speicherort: nur fürs persönliche Liederbuch und nur, solange nicht verbunden
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

  function renderBooks() {
    const items = listBooks().map((b) => {
      const isActive = b.id === book.id;
      const row = li(span('book-name', b.name, b.abo ? 'abonniert · nur lesen' : b.readOnly ? 'geteilt · nur lesen' : b.shared ? 'gemeinsam' : 'persönlich'));
      if (isActive) {
        row.classList.add('active');
        row.append(span('hint', 'geöffnet'));
      } else {
        row.append(button('Öffnen', () => switchTo(b.id)));
      }
      if (b.shared && isActive) row.append(button('Verlassen', leaveBook, 'danger'));
      if (b.abo) row.append(aboDetails(b, isActive));
      return row;
    });
    $('#book-list').replaceChildren(...items);
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
      localStorage.setItem('webdav.url', url);
      localStorage.setItem('webdav.user', user);
      if (pass) localStorage.setItem('webdav.pass', pass);
      else localStorage.removeItem('webdav.pass');
      build();
    }
    return null;
  }

  async function connect({ silent = false } = {}) {
    if (book.abo) {
      if (!silent) toast('Ein Abo wird nicht mit der Cloud abgeglichen – oben zu „Mein Liederbuch“ wechseln');
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
      // installierte App auf iPhone/iPad: Weiterleitung statt Fenster (siehe finishGoogle)
      if (prefersRedirect()) return redirectToGoogle({ silent: auth.known });
      try {
        try {
          await provider.signIn({ silent: silent || auth.known });
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
    // sync.provider merkt nur den Speicherort des persönlichen Liederbuchs – ein gemeinsames darf
    // ihn nicht überschreiben (sonst verbindet sich z. B. WebDAV dort nicht mehr von selbst)
    const first = !book.shared && !connectedFlag();
    if (!book.shared) localStorage.setItem('sync.provider', 'gdrive');
    if (first && !book.shared) await beforeConnect?.();
    if (engine.state === 'off') engine.start();
    else await engine.sync();
    if (first) toast('Mit Google Drive verbunden');
    if (dlg.open) renderMembers();
    return true;
  }

  /** Zur Google-Anmeldung weiterleiten; extra wird bis zur Rückkehr aufbewahrt. */
  async function redirectToGoogle({ silent = false, extra = {} } = {}) {
    try {
      await beforeSwitch?.(); // Ungespeichertes sichern, die Seite wird gleich verlassen
      location.assign(auth.loginUrl({ silent, extra: { bookId: book.id, ...extra } }));
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
    openDialog();
  }
  let pendingJoin = null;

  /**
   * Bei Google angemeldet sein – unabhängig davon, wo das persönliche Liederbuch abgleicht
   * (gemeinsame Liederbücher laufen immer über Google Drive, auch wenn das persönliche auf WebDAV
   * oder Dropbox liegt). true: angemeldet; false: abgebrochen oder zur Anmeldung weitergeleitet.
   */
  async function ensureGoogle(extra = {}) {
    if (auth.signedIn) return true;
    saveSetup();
    if (!clientId()) {
      toast('Für gemeinsame Liederbücher fehlt die Google-Einrichtung');
      return false;
    }
    if (!auth.clientId) auth = googleAuth(); // Client-ID erst eben eingetragen
    if (prefersRedirect()) {
      await redirectToGoogle({ silent: auth.known, extra });
      return false;
    }
    try {
      await auth.signIn({ silent: auth.known }).catch((err) => (auth.known ? auth.signIn() : Promise.reject(err)));
      return true;
    } catch (err) {
      toast(`Anmelden fehlgeschlagen: ${err.message}`);
      return false;
    }
  }

  /**
   * Geteiltes Liederbuch öffnen: anmelden (falls nötig), Datei in der Google-Dateiauswahl bestätigen
   * (erst dann darf die App sie lesen), Rechte abfragen, als Liederbuch eintragen.
   */
  async function joinDrive(fileId = '') {
    if (!(await ensureGoogle({ join: fileId }))) return;
    // Der Cloud-Dialog liegt als modaler Dialog immer obenauf – die Google-Dateiauswahl käme nicht
    // davor. Also vorher schließen; bei Abbruch oder Fehler wieder öffnen.
    const reopen = dlg.open;
    if (reopen) dlg.close();
    try {
      const picker = driveFor({ shared: true, fileId });
      const file = await picker.pickShared({ fileId });
      if (!file) {
        if (reopen) openDialog();
        return;
      }
      pendingJoin = null;
      const meta = await driveFor({ shared: true, fileId: file.id }).info();
      const readOnly = !meta?.capabilities?.canEdit;
      const joined = addSharedBook({ fileId: file.id, name: driveBookName(file.name, meta?.owners?.[0]?.displayName), readOnly });
      toast(`„${joined.name}“ geöffnet${readOnly ? ' – nur lesen' : ''}`);
      await switchTo(joined.id);
    } catch (err) {
      if (reopen && !dlg.open) openDialog();
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
    localStorage.setItem('sync.provider', 'webdav');
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
    localStorage.setItem('sync.provider', 'dropbox');
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
      location.assign(await provider.loginUrl({ bookId: book.id }));
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
    localStorage.setItem('sync.kind', b.dataset.value);
    build();
    render();
    renderMembers();
  });

  $('#sync-connect').onclick = () => connect({ silent: engine?.state === 'auth' });
  $('#sync-now').onclick = () => engine.sync();
  $('#webdav-forget').onclick = () => {
    if (!confirm(`Gespeicherte WebDAV-Adresse und Zugangsdaten auf diesem Gerät löschen?\n${webdav().url}`)) return;
    for (const k of Object.keys(localStorage)) if (/^webdav\./.test(k)) localStorage.removeItem(k);
    for (const id of ['#webdav-url', '#webdav-user', '#webdav-pass']) $(id).value = '';
    build();
    render();
    toast('WebDAV-Zugangsdaten gelöscht');
  };

  $('#sync-disconnect').onclick = () => {
    provider.signOut();
    engine.stop();
    if (!book.shared) localStorage.removeItem('sync.provider');
    if (kind() === 'webdav') {
      // Passwort nicht auf dem Gerät liegen lassen; Adresse und Name bleiben für später
      localStorage.removeItem('webdav.pass');
      $('#webdav-pass').value = '';
      build();
      render();
    }
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
    if (!(await ensureGoogle())) return;
    try {
      await beforeSync?.();
      const songs = $('#book-new-copy').checked
        ? (await repo.allRecords()).filter((r) => !r.deletedAt).map(slimRecord)
        : [];
      const data = { format: SYNC_FORMAT, version: SYNC_VERSION, updatedAt: new Date().toISOString(), songs };
      const file = await driveFor({ shared: false }).createShared(fileNameForBook(name), data);
      const created = addSharedBook({ fileId: file.id, name });
      toast(`„${name}“ angelegt – jetzt Mitglieder einladen`);
      localStorage.setItem('openSyncDialog', '1');
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
    renderBooks();
    renderMembers();
    dlg.showModal();
  }

  // Abgelaufene Anmeldung: Klick auf den Cloud-Knopf erneuert sie direkt
  btn.onclick = async () => {
    if (engine?.state === 'auth' && kind() === 'gdrive' && (await connect({ silent: true }))) return;
    openDialog();
  };
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());

  build();
  render();
  renderBookSelect();
  if (book.readOnly) setupReadOnlyBar();
  // Abo: wird über das Abo aktualisiert, nie mit der eigenen Cloud abgeglichen.
  // Geteilte Liederbücher gehören immer zu Google Drive: abgleichen, sobald einmal angemeldet.
  const autoStart = book.shared ? auth.known : connectedFlag();
  if (!book.abo && autoStart && configured()) engine.start();
  finishDropbox();
  finishGoogle();
  checkDriveHash();
  addEventListener('hashchange', checkDriveHash);
  if (localStorage.getItem('openSyncDialog')) {
    localStorage.removeItem('openSyncDialog');
    openDialog();
  }
  return { get engine() { return engine; } };
}
