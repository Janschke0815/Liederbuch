// Papierkorb: gelöschte Lieder wiederherstellen oder endgültig löschen.

import { repo } from './app-state.js';
import { $, el, closeOnBackdrop, toast } from './dom.js';
import { flushSave, openSong } from './song.js';

const dialog = $('#trash-dialog');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('de', { day: 'numeric', month: 'short', year: 'numeric' });

async function render() {
  const items = await repo.trash();
  $('#trash-list').replaceChildren(...items.map((s) => {
    const name = el('span', { className: 'book-name', textContent: s.title || 'Ohne Titel' },
      el('small', { textContent: `gelöscht am ${fmtDate(s.deletedAt)}${s.artist ? ' · ' + s.artist : ''}` }));
    const restore = el('button', { type: 'button', textContent: 'Wiederherstellen' });
    restore.onclick = async () => {
      await repo.restore(s.id);
      await openSong(s.id);
      toast(`„${s.title || 'Ohne Titel'}“ wiederhergestellt`);
      render();
    };
    const purge = el('button', { type: 'button', textContent: 'Endgültig', className: 'danger' });
    purge.onclick = async () => {
      if (!confirm(`„${s.title || 'Ohne Titel'}“ endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await repo.purge(s.id);
      render();
    };
    return el('li', {}, name, restore, purge);
  }));
  if (!items.length) $('#trash-list').append(el('li', { className: 'list-empty', textContent: 'Der Papierkorb ist leer.' }));
  $('#trash-empty').hidden = !items.length;
}

$('#btn-trash').onclick = async () => {
  await flushSave();
  await render();
  dialog.showModal();
};
$('#trash-empty').onclick = async () => {
  const items = await repo.trash();
  if (!confirm(`${items.length} ${items.length === 1 ? 'Lied' : 'Lieder'} endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
  for (const s of items) await repo.purge(s.id);
  render();
  toast('Papierkorb geleert');
};
closeOnBackdrop(dialog);
