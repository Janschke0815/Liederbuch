// „Für eine Gruppe veröffentlichen“: Lieder (alle, nach Tag oder aus einer Setliste) als Abo-Datei in
// den Sync-Ordner (WebDAV) legen oder herunterladen, und den Einladungslink zum Weitergeben zeigen.
// Was zuletzt veröffentlicht wurde, merkt sich die App (prefs: aboPublished) – erneut veröffentlichen
// ersetzt die Datei, der Link bleibt gleich.
//
// Automatisch veröffentlichen (nur Sync-Ordner): Ändern sich Lieder oder Setlisten, wird kurz danach
// von selbst neu veröffentlicht – mit derselben Auswahl wie beim letzten Mal.

import { aboLink, aboToText, buildAboPayload, randomFilePart } from '../formats/abo.js';
import { cleanFileName } from '../formats/song-files.js';
import { prefs } from '../prefs.js';
import { webdavFileUrl } from '../sync/webdav.js';
import { WebdavClient } from '../sync/webdav-client.js';
import { book, readOnly, repo, sets } from './app-state.js';
import { $, $$, download, toast } from './dom.js';
import { flushSave } from './song.js';

const AUTO_DELAY_MS = 20 * 1000; // nach der letzten Änderung so lange warten, dann veröffentlichen

const dialog = $('#publish-dialog');
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
const radio = (name) => $(`input[name="${name}"]:checked`).value;
/** WebDAV-Zugang – nur, wenn die App gerade darüber abgleicht (keine alte, irgendwann gespeicherte Adresse). */
const webdav = () => {
  const active = localStorage.getItem('sync.provider') === 'webdav' && localStorage.getItem('sync.kind') === 'webdav';
  return {
    url: active ? localStorage.getItem('webdav.url') || '' : '',
    user: localStorage.getItem('webdav.user') || '',
    password: localStorage.getItem('webdav.pass') || '',
  };
};
const saved = () => prefs.get('aboPublished')[book.id] || {};
const plural = (n) => `${n} ${n === 1 ? 'Lied' : 'Lieder'}`;
const fmtTime = (iso) => new Date(iso).toLocaleString('de', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Lieder und Setlisten einer Auswahl.
 * @param {'all'|'tag'|'setlist'} scope
 * @param {string} value  Tag bzw. Setlisten-ID
 */
async function selectionOf(scope, value) {
  const allSets = await sets.list();
  if (scope === 'tag') return { songs: value ? await repo.list({ tag: value }) : [], setlists: allSets };
  if (scope === 'setlist') {
    const set = allSets.find((s) => s.id === value);
    if (!set) return { songs: [], setlists: [] };
    const songs = (await Promise.all(set.items.map((i) => repo.get(i.songId)))).filter(Boolean);
    return { songs, setlists: [set] };
  }
  return { songs: await repo.list(), setlists: allSets };
}

/** Auswahl, wie sie gerade im Dialog steht. */
function formScope() {
  const scope = radio('pub-scope');
  return { scope, value: scope === 'tag' ? $('#pub-tag').value : scope === 'setlist' ? $('#pub-setlist').value : '' };
}

/** Abo-Datei in den Sync-Ordner (Unterordner „Abo“) schreiben. Liefert die Adresse der Datei. */
async function putToWebdav(name, text) {
  const dav = webdav();
  if (!dav.url) throw new Error('Die App gleicht gerade nicht über einen WebDAV-Ordner ab');
  const base = webdavFileUrl(dav.url).replace(/[^/]*$/, '');
  const fileUrl = `${base}Abo/${encodeURIComponent(cleanFileName(name))}.json`;
  const client = new WebdavClient({ ...dav, fetch: (...a) => globalThis.fetch(...a), host: new URL(base).host });
  await client.put(fileUrl, text, {}, [base, `${base}Abo/`]);
  return fileUrl;
}

// ---------- Dialog ----------

// Vorgeschlagene Adresse (und damit der Dateiname beim Herunterladen) folgt dem eingetragenen Namen –
// bis man die Adresse selbst ändert oder schon unter einer Adresse veröffentlicht hat (Link bleibt gleich).
let urlFollowsName = true;
let filePart = '';

/** Adresse aus dem Namen vorschlagen: …/abo/<Name>-<Zufall>.json */
function suggestedUrl() {
  const slug = cleanFileName($('#pub-name').value).replace(/\s+/g, '-') || 'Liederbuch';
  return `${appUrl()}abo/${slug}-${filePart}.json`;
}

async function update() {
  const target = radio('pub-target');
  $('#pub-url-row').hidden = target !== 'file';
  // automatisch geht nur in den Sync-Ordner – eine heruntergeladene Datei legt man selbst ab
  $('#pub-auto').disabled = target !== 'webdav';
  if (target !== 'webdav') $('#pub-auto').checked = false;
  const { scope, value } = formScope();
  const { songs } = await selectionOf(scope, value);
  $('#pub-count').textContent = plural(songs.length);
  const urlOk = target !== 'file' || /^https?:\/\/\S+$/.test($('#pub-url').value.trim());
  $('#pub-ok').disabled = !songs.length || !$('#pub-private').checked || !urlOk || !$('#pub-name').value.trim();
}

function showResult(s) {
  $('#pub-link').value = aboLink(appUrl(), s.url);
  $('#pub-share').hidden = !navigator.share;
  $('#pub-when').textContent = s.publishedAt
    ? `Zuletzt veröffentlicht: ${fmtTime(s.publishedAt)}${s.auto ? ' · wird automatisch aktualisiert' : ''}`
    : '';
  $('#pub-result').hidden = false;
}

async function open() {
  if (readOnly) return;
  await flushSave();
  const s = saved();
  const dav = webdav();
  $('#pub-name').value = s.name || book.name;
  $('#pub-publisher').value = s.publisher || '';
  $('#pub-desc').value = s.description || '';
  const tags = await repo.tags();
  $('#pub-tag').replaceChildren(...tags.map((t) => new Option(`${t.tag} (${t.count})`, t.tag)));
  const allSets = await sets.list();
  $('#pub-setlist').replaceChildren(...allSets.map((x) => new Option(x.name || 'Ohne Namen', x.id)));
  for (const r of $$('input[name="pub-scope"]')) {
    r.checked = r.value === (s.scope || 'all');
    r.disabled = (r.value === 'tag' && !tags.length) || (r.value === 'setlist' && !allSets.length);
  }
  if (s.scope === 'tag') $('#pub-tag').value = s.value;
  if (s.scope === 'setlist') $('#pub-setlist').value = s.value;
  // Ziel: Sync-Ordner (mit Anmeldung geschützt), wenn die App darüber abgleicht – sonst Datei
  $('#pub-target-webdav-row').hidden = !dav.url;
  const target = dav.url && s.target !== 'file' ? 'webdav' : 'file';
  for (const r of $$('input[name="pub-target"]')) r.checked = r.value === target;
  filePart = randomFilePart();
  urlFollowsName = !(s.target === 'file' && s.url);
  $('#pub-url').value = urlFollowsName ? suggestedUrl() : s.url;
  $('#pub-auto').checked = Boolean(s.auto);
  $('#pub-private').checked = false;
  $('#pub-result').hidden = !s.url;
  if (s.url) showResult(s);
  await update();
  dialog.showModal();
}

async function publishFromDialog() {
  $('#pub-ok').disabled = true;
  try {
    const name = $('#pub-name').value.trim();
    const meta = { name, publisher: $('#pub-publisher').value, description: $('#pub-desc').value };
    const { scope, value } = formScope();
    const { songs, setlists } = await selectionOf(scope, value);
    const text = aboToText(buildAboPayload(songs, setlists, meta));
    const target = radio('pub-target');
    let url;
    if (target === 'webdav') {
      url = await putToWebdav(name, text);
      toast(`Veröffentlicht: ${plural(songs.length)} im Sync-Ordner „Abo“`);
    } else {
      url = $('#pub-url').value.trim();
      download(decodeURIComponent(url.split('/').pop()) || 'liederbuch-abo.json', text, 'application/json');
      toast('Datei heruntergeladen – jetzt an die angegebene Adresse legen (geschützter Ordner)');
    }
    if (target === 'file') urlFollowsName = false; // ab jetzt gilt diese Adresse (Einladungslink)
    const s = { ...meta, scope, value, target, url, auto: target === 'webdav' && $('#pub-auto').checked, publishedAt: new Date().toISOString() };
    prefs.setIn('aboPublished', book.id, s);
    showResult(s);
    setupAuto();
  } catch (err) {
    toast(`Veröffentlichen fehlgeschlagen: ${err.message}`);
  } finally {
    await update();
  }
}

dialog.addEventListener('input', (e) => {
  if (e.target.id === 'pub-url') urlFollowsName = false;
  if (e.target.id === 'pub-name' && urlFollowsName) $('#pub-url').value = suggestedUrl();
  update();
});
dialog.addEventListener('change', () => update());
$('#pub-ok').onclick = publishFromDialog;
$('#pub-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('#pub-link').value);
    toast('Einladungslink kopiert – nur an die Gruppe schicken');
  } catch {
    $('#pub-link').select();
  }
};
$('#pub-share').onclick = () => navigator.share?.({ title: $('#pub-name').value, url: $('#pub-link').value }).catch(() => {});
$('#btn-publish').onclick = () => {
  $('#sync-dialog').close();
  open();
};

// ---------- Automatisch veröffentlichen ----------

let autoTimer = 0;
let autoOn = false;
let lastError = '';

/**
 * Mit der gemerkten Auswahl neu veröffentlichen (ohne Dialog). Fehler werden einmal gemeldet,
 * nicht bei jedem Versuch.
 * @returns {Promise<boolean>} hat es geklappt?
 */
export async function republish() {
  const s = saved();
  if (!s.auto || s.target !== 'webdav') return false;
  try {
    const { songs, setlists } = await selectionOf(s.scope, s.value);
    const url = await putToWebdav(s.name, aboToText(buildAboPayload(songs, setlists, s)));
    prefs.setIn('aboPublished', book.id, { ...s, url, publishedAt: new Date().toISOString() });
    lastError = '';
    return true;
  } catch (err) {
    if (err.message !== lastError) toast(`Abo „${s.name}“ konnte nicht automatisch veröffentlicht werden: ${err.message}`);
    lastError = err.message;
    return false;
  }
}

/** Nach einer Änderung etwas warten (es wird oft mehrmals hintereinander gespeichert), dann veröffentlichen. */
function scheduleRepublish() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(republish, AUTO_DELAY_MS);
}

/** Beobachten einschalten, wenn für dieses Liederbuch „automatisch“ gewählt ist. */
function setupAuto() {
  if (autoOn || readOnly || !saved().auto) return;
  autoOn = true;
  repo.addEventListener('change', scheduleRepublish);
  sets.addEventListener('change', scheduleRepublish);
  // auch Änderungen von anderen Geräten (z. B. ein Bandmitglied ändert über den Sync-Ordner)
  repo.addEventListener('remote-change', scheduleRepublish);
  sets.addEventListener('remote-change', scheduleRepublish);
  // Seite wird geschlossen: Ausstehendes noch schnell veröffentlichen
  addEventListener('pagehide', () => {
    if (autoTimer) republish();
  });
}
setupAuto();
