// „Für eine Gruppe veröffentlichen“: Lieder (alle, nach Tag oder aus einer Setliste) als Abo-Datei in
// den WebDAV-Ordner legen oder herunterladen, und den Einladungslink zum Weitergeben zeigen.
// Was zuletzt veröffentlicht wurde, merkt sich die App (prefs: aboPublished) – erneut veröffentlichen
// ersetzt die Datei, der Link bleibt gleich.

import { aboLink, aboToText, buildAboPayload, randomFilePart } from '../formats/abo.js';
import { cleanFileName } from '../formats/song-files.js';
import { prefs } from '../prefs.js';
import { webdavFileUrl } from '../sync/webdav.js';
import { WebdavClient } from '../sync/webdav-client.js';
import { book, readOnly, repo, sets } from './app-state.js';
import { $, $$, download, toast } from './dom.js';
import { flushSave } from './song.js';

const dialog = $('#publish-dialog');
const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
const radio = (name) => $(`input[name="${name}"]:checked`).value;
const webdav = () => ({
  url: localStorage.getItem('webdav.url') || '',
  user: localStorage.getItem('webdav.user') || '',
  password: localStorage.getItem('webdav.pass') || '',
});
const saved = () => prefs.get('aboPublished')[book.id] || {};

/** Lieder und Setlisten, die nach der aktuellen Auswahl mitgehen. */
async function selection() {
  const scope = radio('pub-scope');
  const allSets = await sets.list();
  if (scope === 'tag') {
    const tag = $('#pub-tag').value;
    return { songs: tag ? await repo.list({ tag }) : [], setlists: allSets };
  }
  if (scope === 'setlist') {
    const set = allSets.find((s) => s.id === $('#pub-setlist').value);
    if (!set) return { songs: [], setlists: [] };
    const songs = (await Promise.all(set.items.map((i) => repo.get(i.songId)))).filter(Boolean);
    return { songs, setlists: [set] };
  }
  return { songs: await repo.list(), setlists: allSets };
}

async function update() {
  const target = radio('pub-target');
  $('#pub-url-row').hidden = target !== 'file';
  const { songs } = await selection();
  $('#pub-count').textContent = `${songs.length} ${songs.length === 1 ? 'Lied' : 'Lieder'}`;
  const urlOk = target !== 'file' || /^https?:\/\/\S+$/.test($('#pub-url').value.trim());
  $('#pub-ok').disabled = !songs.length || !$('#pub-private').checked || !urlOk || !$('#pub-name').value.trim();
}

function showLink(fileUrl) {
  const link = aboLink(appUrl(), fileUrl);
  $('#pub-link').value = link;
  $('#pub-share').hidden = !navigator.share;
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
  // Ziel: WebDAV (mit Anmeldung geschützt), wenn eingerichtet – sonst Datei
  $('#pub-target-webdav-row').hidden = !dav.url;
  try {
    $('#pub-webdav-host').textContent = dav.url ? new URL(dav.url).host : '';
  } catch {
    $('#pub-webdav-host').textContent = '';
  }
  const target = s.target || (dav.url ? 'webdav' : 'file');
  for (const r of $$('input[name="pub-target"]')) r.checked = r.value === target;
  $('#pub-url').value = s.target === 'file' && s.url ? s.url : `${appUrl()}abo/${cleanFileName($('#pub-name').value).replace(/\s+/g, '-')}-${randomFilePart()}.json`;
  $('#pub-private').checked = false;
  $('#pub-result').hidden = !s.url;
  if (s.url) showLink(s.url);
  await update();
  dialog.showModal();
}

async function publish() {
  $('#pub-ok').disabled = true;
  try {
    const name = $('#pub-name').value.trim();
    const meta = { name, publisher: $('#pub-publisher').value, description: $('#pub-desc').value };
    const { songs, setlists } = await selection();
    const text = aboToText(buildAboPayload(songs, setlists, meta));
    const target = radio('pub-target');
    let fileUrl;
    if (target === 'webdav') {
      const dav = webdav();
      const base = webdavFileUrl(dav.url).replace(/[^/]*$/, '');
      fileUrl = `${base}Abo/${encodeURIComponent(cleanFileName(name))}.json`;
      const client = new WebdavClient({ ...dav, fetch: globalThis.fetch.bind(globalThis), host: new URL(base).host });
      await client.put(fileUrl, text, {}, [base, `${base}Abo/`]);
      toast(`Veröffentlicht: ${songs.length} ${songs.length === 1 ? 'Lied' : 'Lieder'} im WebDAV-Ordner „Abo“`);
    } else {
      fileUrl = $('#pub-url').value.trim();
      download(decodeURIComponent(fileUrl.split('/').pop()) || 'liederbuch-abo.json', text, 'application/json');
      toast('Datei heruntergeladen – jetzt an die angegebene Adresse legen (geschützter Ordner)');
    }
    const scope = radio('pub-scope');
    const value = scope === 'tag' ? $('#pub-tag').value : scope === 'setlist' ? $('#pub-setlist').value : '';
    prefs.setIn('aboPublished', book.id, { ...meta, scope, value, target, url: fileUrl, publishedAt: new Date().toISOString() });
    showLink(fileUrl);
  } catch (err) {
    toast(`Veröffentlichen fehlgeschlagen: ${err.message}`);
  } finally {
    await update();
  }
}

dialog.addEventListener('input', () => update());
dialog.addEventListener('change', () => update());
$('#pub-ok').onclick = publish;
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
