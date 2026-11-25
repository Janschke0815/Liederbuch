// Liederbücher: Auswahl in der Kopfleiste (mit Optionen per Rechtsklick), Dialog „Liederbücher“
// (Liste, Umbenennen, Entfernen, Abo-Angaben) und „Neues Liederbuch“. Der Abgleich mit der Cloud steht
// in sync-ui.js – das richtet diesen Teil ein und reicht über `cloud` herein, was es dafür braucht.

import { listBooks, setActiveBook, addBook, renameBook, removeBook, bookKey } from './books.js';
import { prefs } from './prefs.js';
import { SongRepository } from './storage/repository.js';
import { openIdbStore } from './storage/stores.js';
import { rememberRename } from './sync/book-name.js';
import { connectedVia, syncKindOf, webdavOf } from './sync/book-settings.js';
import { showMenu } from './context-menu.js';
import { $, el, textButton, textSpan } from './ui/dom.js';

const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('de', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');

/** Name in Auswahl und Menü: „(nur lesen)“ bzw. 👥 für gemeinsame Bücher. */
const bookLabel = (b) => (b.abo || b.readOnly ? `${b.name} (nur lesen)` : b.shared ? `${b.name} 👥` : b.name);

/** Wo ein Liederbuch abgeglichen wird, kurz (für die Liste). */
function whereOf(b) {
  if (b.abo) return 'abonniert · nur lesen';
  const account = localStorage.getItem(bookKey(b, 'gdrive.account'));
  if (b.shared) return `geteilt · Google Drive${b.readOnly ? ' · nur lesen' : ''}${account ? ` · ${account}` : ''}`;
  const k = connectedVia(b);
  if (k !== syncKindOf(b)) return 'nur auf diesem Gerät';
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

/** WebDAV-Ordner für ein neues Buch: neben dem Ordner des Vorbilds, benannt nach dem Buch. */
function webdavFolderFor(baseUrl, name) {
  if (!baseUrl) return '';
  const folder = baseUrl.replace(/[^/]*\.json$/i, '').replace(/\/*$/, '');
  return `${folder.replace(/[^/]*$/, '')}${encodeURIComponent(name)}/`;
}

/**
 * Liederbuch-Auswahl und -Verwaltung einrichten.
 * @param {object} opts
 * @param {object} opts.book   das geöffnete Liederbuch
 * @param {object} opts.repo   seine Lieder (für „Lieder übernehmen“)
 * @param {Function} opts.toast
 * @param {() => Promise<void>} [opts.beforeSync]    Ungespeichertes sichern (vor „Neues Liederbuch“)
 * @param {() => Promise<void>} [opts.beforeSwitch]  Ungespeichertes sichern (vor dem Wechsel)
 * @param {(b: object) => boolean} [opts.leaveAbo]   Abo beenden (ui/abo.js)
 * @param {(o: {quiet: boolean}) => Promise<void>} [opts.refreshAbo]  Abo aktualisieren (ui/abo.js)
 * @param {{openDialog: Function, leaveBook: Function, renamed: (name: string) => void, stop: Function,
 *          join: (fileId?: string) => void, pendingJoin: () => string|null, googleReady: () => boolean,
 *          pendingInvite?: () => {fileId: string, name: string, from: string, email: string}|null,
 *          declineInvite?: () => void}} opts.cloud
 *   Cloud-Teil (sync-ui.js): Dialog öffnen, gemeinsames Buch verlassen, Umbenennung abgleichen, Abgleich
 *   anhalten, Einladung öffnen, offene Einladung, Google eingerichtet?, Einladung aus dem Briefkasten
 *   (sync/invite-box.js) und ablehnen
 * @returns {{open: (o?: {create?: boolean}) => void, openNew: (o?: {where?: string, copy?: boolean}) => void,
 *            refresh: () => void, switchTo: (id: string) => Promise<void>}}
 */
export function setupBooks({ book, repo, toast, beforeSync, beforeSwitch, leaveAbo, refreshAbo, cloud }) {
  const dlg = $('#books-dialog');

  async function switchTo(id) {
    await beforeSwitch?.();
    setActiveBook(id);
    location.reload();
  }

  /** Auswahl oben und Liste im Dialog neu zeichnen (nach Umbenennen, Entfernen, Abo beenden). */
  function refresh() {
    renderSelect();
    if (dlg.open) renderList();
  }

  // ---------- Auswahl in der Kopfleiste ----------

  /** Optionen zu einem Liederbuch (Rechtsklick bzw. lang drücken in der Auswahl). */
  function bookOptions(b) {
    const isActive = b.id === book.id;
    return [
      !isActive && { label: 'Öffnen', icon: 'open', action: () => switchTo(b.id) },
      !b.abo && { label: 'Umbenennen …', icon: 'edit', action: () => rename(b) },
      isActive && { label: 'Cloud: Abgleich & Teilen …', icon: 'cloud', action: () => cloud.openDialog() },
      '-',
      b.own && { label: 'Entfernen …', icon: 'trash', danger: true, action: () => removeOwnBook(b) },
      b.shared && isActive && { label: 'Verlassen …', icon: 'trash', danger: true, action: () => cloud.leaveBook() },
      b.abo && leaveAbo && { label: 'Abo beenden …', icon: 'trash', danger: true, action: () => leaveAbo(b) && refresh() },
      '-',
      { label: 'Liederbücher verwalten …', action: () => open() },
    ];
  }

  /** Liederbuch-Auswahl in der Kopfleiste: eigenes Menü, damit jedes Buch Optionen per Rechtsklick hat. */
  function renderSelect() {
    const btn = $('#book-select');
    btn.querySelector('.book-select-name').textContent = bookLabel(book);
    btn.hidden = false;
    $('#app-name').hidden = true;
    const openAt = () => {
      const r = btn.getBoundingClientRect();
      return { x: r.left, y: r.bottom + 4 };
    };
    btn.onclick = () => {
      showMenu([
        ...listBooks().map((b) => ({
          label: bookLabel(b),
          checked: b.id === book.id,
          action: () => b.id !== book.id && switchTo(b.id),
          context: () => bookOptions(b),
          contextTitle: b.name,
        })),
        '-',
        { label: 'Neues Liederbuch …', icon: 'plus', action: () => open({ create: true }) },
        { label: 'Liederbücher verwalten …', action: () => open() },
      ], { ...openAt(), title: 'Liederbücher' }).focusFirst();
    };
    // Rechtsklick auf den Namen oben: Optionen zum geöffneten Buch
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      showMenu(bookOptions(book), { ...openAt(), title: book.name }).focusFirst();
    };
  }

  // ---------- Dialog „Liederbücher“ ----------

  /** Angaben zu einem Abo: Adresse (zum Kopieren), Stand, Aktualisieren und Beenden. */
  function aboDetails(b, isActive) {
    const st = prefs.get('aboState')[b.id] || {};
    const url = el('input', { readOnly: true, value: b.abo.url, title: 'Adresse des Abos', className: 'abo-url' });
    url.onfocus = () => url.select();
    const copy = textButton('Kopieren', async () => {
      try {
        await navigator.clipboard.writeText(b.abo.url);
        toast('Adresse kopiert');
      } catch {
        url.select();
      }
    });
    const facts = [
      b.abo.publisher && `von ${b.abo.publisher}`,
      `Stand ${fmtWhen(st.publishedAt)}`,
      st.count != null && `${st.count} ${st.count === 1 ? 'Lied' : 'Lieder'}`,
      b.abo.user && `angemeldet als ${b.abo.user}`,
    ];
    const info = textSpan('hint', facts.filter(Boolean).join(' · '));
    if (st.error) info.append(el('span', { className: 'warn', textContent: ` · ⚠ ${st.error}` }));
    const actions = el('div', { className: 'abo-detail-actions' });
    if (isActive && refreshAbo) {
      actions.append(textButton('Jetzt aktualisieren', async () => {
        await refreshAbo({ quiet: false });
        renderList();
      }));
    }
    if (leaveAbo) actions.append(textButton('Abo beenden', () => leaveAbo(b) && refresh(), 'danger'));
    return el('div', { className: 'abo-details' }, el('div', { className: 'abo-url-row' }, url, copy), info, actions);
  }

  function renderList() {
    $('#book-list').replaceChildren(...listBooks().map((b) => {
      const isActive = b.id === book.id;
      const row = el('li', {}, textSpan('book-name', b.name, whereOf(b)));
      if (isActive) {
        row.classList.add('active');
        row.append(textSpan('hint', 'geöffnet'));
      } else {
        row.append(textButton('Öffnen', () => switchTo(b.id)));
      }
      if (!b.abo) row.append(textButton('Umbenennen', () => rename(b)));
      if (b.own) row.append(textButton('Entfernen', () => removeOwnBook(b), 'danger'));
      if (b.shared && isActive) row.append(textButton('Verlassen', () => cloud.leaveBook(), 'danger'));
      if (b.abo) row.append(aboDetails(b, isActive));
      return row;
    }));
    $('#book-new-from').textContent = book.name;
    $('#book-actions').hidden = !cloud.googleReady();
    $('#drive-invite').hidden = !cloud.pendingJoin();
    // Einladung aus dem Briefkasten: Name, Absender und Konto dazuschreiben, Ablehnen anbieten
    const inv = cloud.pendingInvite?.();
    $('#drive-invite-title').textContent = inv
      ? `Einladung zum Liederbuch „${inv.name || 'Gemeinsames Liederbuch'}“${inv.from ? ` von ${inv.from}` : ''}`
      : 'Einladung zu einem geteilten Liederbuch';
    $('#drive-invite-account').textContent = inv ? ` (${inv.email})` : '';
    $('#drive-invite-no').hidden = !inv;
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
      cloud.renamed(name);
    } else rememberRename(b, name);
    refresh();
    toast(connectedVia(b) ? `Umbenannt in „${name}“ – gilt auch auf deinen anderen Geräten` : `Umbenannt in „${name}“`);
  }

  /** Eigenes Liederbuch von diesem Gerät entfernen (die Datei in der Cloud bleibt). */
  async function removeOwnBook(b) {
    const msg = connectedVia(b)
      ? `„${b.name}“ von diesem Gerät entfernen? Die Lieder hier werden gelöscht – was in der Cloud liegt, bleibt erhalten.`
      : `„${b.name}“ löschen? Es ist mit keiner Cloud verbunden – seine Lieder sind dann weg.`;
    if (!confirm(msg)) return;
    if (b.id === book.id) cloud.stop();
    removeBook(b.id);
    indexedDB.deleteDatabase(b.dbName);
    if (b.id === book.id) return switchTo('personal');
    refresh();
    toast(`„${b.name}“ entfernt`);
  }

  /** Liederbücher-Dialog öffnen; create: gleich das Formular „Neues Liederbuch“. */
  function open({ create = false } = {}) {
    renderList();
    $('#book-new').open = create || $('#book-new').open;
    dlg.showModal();
    if (create) {
      $('#book-new-name').focus();
      $('#book-new').scrollIntoView({ block: 'center' });
    }
  }

  // ---------- Neues Liederbuch ----------

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
        // Zugangsdaten vom geöffneten Buch übernehmen, sonst vom persönlichen
        const w = webdavOf(book).url ? webdavOf(book) : webdavOf({ id: 'personal' });
        const url = webdavFolderFor(webdavOf(book).url || localStorage.getItem('webdav.url') || '', name);
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

  /** „Neues Liederbuch“ mit Speicherort und „Lieder übernehmen“ vorausgefüllt. */
  function openNew({ where = 'local', copy = false } = {}) {
    open({ create: true });
    $('#book-new-kind').value = where;
    $('#book-new-kind').dispatchEvent(new Event('change'));
    $('#book-new-copy').checked = copy;
  }

  // ---------- Einladung öffnen, Wechsel zum Cloud-Dialog ----------

  $('#book-join').onclick = () => cloud.join();
  $('#drive-invite-ok').onclick = () => cloud.join(cloud.pendingJoin());
  $('#drive-invite-no').onclick = () => {
    cloud.declineInvite?.();
    renderList();
  };
  $('#btn-books-cloud').onclick = () => {
    dlg.close();
    cloud.openDialog();
  };
  dlg.addEventListener('click', (e) => e.target === dlg && dlg.close());

  renderSelect();
  return { open, openNew, refresh, switchTo };
}
