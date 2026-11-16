// Text einfügen: Akkorde-über-Text (z. B. von Ultimate Guitar) oder ChordPro wird zu Liedern.
// Auch Strg+V irgendwo in der App und das Lesezeichen „Ins Liederbuch“ landen hier.

import { parseChordPro } from '../core/chordpro.js';
import { pastedToSongs } from '../formats/paste-import.js';
import { bookmarkletHref, readUgHash, ugDataToText } from '../formats/ug-bookmarklet.js';
import { renderSong } from '../render/song-view.js';
import { applySettings, loadSettings } from '../settings/settings.js';
import { repo, services } from './app-state.js';
import { $, $$, el, anyDialogOpen, closeOnBackdrop, isTyping, toast } from './dom.js';
import { addSongs, countDuplicates } from './add-songs.js';
import { setView } from './view.js';

const dialog = $('#import-dialog');
const preview = $('#imp-preview');
let existing = []; // vorhandene Lieder, für den Hinweis auf Doppelte

/** Eingefügter Text -> Lieder (Titel/Interpret aus den Feldern gelten nur bei einem Lied). */
function pastedSongs() {
  return pastedToSongs($('#imp-text').value, { title: $('#imp-title').value.trim(), artist: $('#imp-artist').value.trim() });
}

function infoText(songs) {
  const n = songs.length;
  if (!n) return '';
  if (n > 1) return `${n} Lieder erkannt: ${songs.map((s) => s.title || 'Ohne Titel').join(', ')}`;
  const [s] = songs;
  return `1 Lied${s.title ? `: ${s.title}${s.artist ? ' – ' + s.artist : ''}` : ' (Titel unten eintragen oder im Editor ergänzen)'}`;
}

function renderPreview() {
  const songs = pastedSongs();
  const n = songs.length;
  $('#imp-ok').disabled = !n;
  $('#imp-ok').textContent = n > 1 ? `${n} Lieder anlegen` : 'Als neues Lied anlegen';
  // Erkanntes als Platzhalter zeigen; bei mehreren Liedern gelten die Felder nicht
  const auto = n === 1 ? pastedToSongs($('#imp-text').value)[0] : null;
  for (const [id, key] of [['#imp-title', 'title'], ['#imp-artist', 'artist']]) {
    $(id).disabled = n > 1;
    $(id).placeholder = n > 1 ? 'aus dem Text' : auto?.[key] ? `erkannt: ${auto[key]}` : '';
  }
  // schon vorhandene Lieder gleich hier anzeigen (gefragt wird beim Anlegen)
  const dups = countDuplicates(existing, songs);
  const info = $('#imp-info');
  info.textContent = infoText(songs) + (dups ? (n === 1 ? ' – ⚠ gibt es schon im Liederbuch' : ` – ⚠ ${dups} davon gibt es schon`) : '');
  info.classList.toggle('warn', dups > 0);
  if (!n) {
    preview.replaceChildren(el('p', { className: 'empty', textContent: 'Links Text einfügen – hier erscheint das Ergebnis.' }));
    return;
  }
  preview.replaceChildren(...songs.flatMap((s, i) => [...(i ? [el('hr')] : []), renderSong(parseChordPro(s.chordpro))]));
}

let timer;
dialog.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(renderPreview, 120);
});

/** Einfügen-Dialog öffnen, optional mit Text. */
export async function openImport(text = '') {
  existing = await repo.list();
  $('#imp-title').value = '';
  $('#imp-artist').value = '';
  $('#imp-text').value = text;
  applySettings(preview, loadSettings());
  renderPreview();
  dialog.showModal();
  $('#imp-text').focus();
  if (text) $('#imp-ok').focus();
}
$('#btn-import').onclick = () => openImport();

// Strg+V irgendwo in der App (außerhalb von Eingabefeldern): Einfügen-Dialog mit dem Text
document.addEventListener('paste', (e) => {
  if (isTyping(document.activeElement) || anyDialogOpen()) return;
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!text.trim()) return;
  e.preventDefault();
  openImport(text);
});

dialog.addEventListener('close', async () => {
  if (dialog.returnValue !== 'ok') return;
  const songs = pastedSongs();
  if (!songs.length) return;
  const r = await addSongs(songs.map((s) => ({ chordpro: s.chordpro })));
  if (!r) return;
  if (songs.length === 1 && r.firstId) {
    setView('editor');
    toast(r.replaced ? 'Vorhandenes Lied ersetzt – bitte im Editor prüfen' : 'Umgewandelt – bitte im Editor prüfen');
  } else toast(r.message || 'Nichts angelegt');
});

// ---------- Lesezeichen „Ins Liederbuch“ (Ultimate Guitar) ----------
// Das Lesezeichen öffnet die App mit #ug=… in der Adresse: Einfügen-Dialog vorausfüllen.
// Angelegt wird erst, wenn man im Dialog bestätigt.

async function takeUgFromHash() {
  if (!location.hash.startsWith('#ug=')) return;
  const data = readUgHash(location.hash);
  history.replaceState(null, '', location.pathname + location.search); // Daten nicht in der Adresse lassen
  if (!data) {
    toast('Die Daten vom Lesezeichen waren unvollständig – bitte noch einmal versuchen');
    return;
  }
  await services.started;
  const text = ugDataToText(data);
  for (const d of $$('dialog[open]')) if (d !== dialog) d.close('cancel');
  if (dialog.open) {
    $('#imp-text').value = text;
    renderPreview();
  } else openImport(text);
  window.focus();
}
addEventListener('hashchange', takeUgFromHash);
/** Beim Start: kam die App über das Lesezeichen? */
export const checkBookmarkHash = takeUgFromHash;

const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
function openBookmarkDialog() {
  $('#ugm-link').href = bookmarkletHref(appUrl());
  $('#ugm-target').textContent = appUrl();
  $('#ugm-local').hidden = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  $('#ug-bookmark-dialog').showModal();
}
$('#imp-bookmark').onclick = () => {
  dialog.close('cancel');
  openBookmarkDialog();
};
// Ein Klick hier in der App würde nichts finden: Hinweis statt Ausführen
$('#ugm-link').addEventListener('click', (e) => {
  e.preventDefault();
  toast('In die Lesezeichenleiste ziehen – dann auf einer Ultimate-Guitar-Seite anklicken');
});
$('#ugm-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(bookmarkletHref(appUrl()));
    toast('Code kopiert – jetzt als Adresse eines Lesezeichens einfügen');
  } catch {
    toast('Kopieren nicht möglich – bitte am PC einrichten');
  }
};
closeOnBackdrop('#ug-bookmark-dialog');
