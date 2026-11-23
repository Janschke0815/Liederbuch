// „Mit anderen teilen“: ein Einstieg, der zuerst fragt, ob die anderen mitbearbeiten (gemeinsames
// Liederbuch über Google Drive) oder nur lesen sollen (Abo) – und dann in den passenden bestehenden
// Ablauf führt (Cloud-Dialog „Mitglieder“, „Neues Liederbuch“, „Veröffentlichen …“).

import { book, readOnly, services } from './app-state.js';
import { $, closeOnBackdrop } from './dom.js';

const dlg = $('#sharewith-dialog');

function showStep(two) {
  $('#sw-choose').hidden = two;
  $('#sw-step2').hidden = !two;
  $('#sw-back').hidden = !two;
  $('#sw-next').hidden = two;
}

function open() {
  $('#sw-book').textContent = book.name;
  $('#sw-readonly').hidden = !readOnly;
  for (const r of dlg.querySelectorAll('input[name="sw-mode"]')) r.disabled = readOnly;
  dlg.querySelector('input[name="sw-mode"][value="edit"]').checked = true;
  $('#sw-next').disabled = readOnly;
  showStep(false);
  if (!dlg.open) dlg.showModal();
}

/** Zweiter Schritt mit Text und Knöpfen [label, Aktion]. */
function step2(text, actions) {
  $('#sw-step2-text').textContent = text;
  $('#sw-step2-actions').replaceChildren(...actions.map(([label, action, primary]) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label, className: primary ? 'primary' : '' });
    b.onclick = () => {
      dlg.close();
      action();
    };
    return b;
  }));
  showStep(true);
}

function shareEditable() {
  const sync = services.sync;
  const { kind, connected, shared } = sync.shareState();
  if (kind === 'gdrive' && (connected || shared)) {
    dlg.close();
    sync.openCloud({ members: true }); // „Mitglieder“: E-Mail eingeben, einladen
    return;
  }
  if (kind === 'webdav' && connected) {
    step2('Dieses Liederbuch liegt auf einem WebDAV-Server (z. B. Nextcloud). Zum gemeinsamen Bearbeiten den Ordner auf dem Server mit den anderen teilen; alle tragen unter Cloud dieselbe Adresse ein. Bequemer mit Einladung per E-Mail geht es mit Google Drive.', [
      ['Cloud-Einstellungen öffnen', () => sync.openCloud(), true],
      ['Neues gemeinsames Liederbuch (Google Drive)', () => sync.openNewBook({ where: 'gdrive', copy: true })],
    ]);
    return;
  }
  const busy = connected && kind !== 'gdrive'; // z. B. mit Dropbox verbunden: erst trennen
  step2(busy
    ? 'Gemeinsame Liederbücher laufen über Google Drive. Dieses Buch gleicht gerade über Dropbox ab – zum Umstellen unter Cloud erst „Trennen“, dann Google Drive wählen. Oder ein neues gemeinsames Liederbuch anlegen und die Lieder übernehmen.'
    : 'Gemeinsame Liederbücher laufen über Google Drive: Du legst das Buch in dein Drive und lädst die anderen per E-Mail ein.', [
    [busy ? 'Cloud-Einstellungen öffnen' : 'Dieses Buch auf Google Drive umstellen', () => sync.openCloud({ provider: 'gdrive' }), true],
    ['Neues gemeinsames Liederbuch anlegen', () => sync.openNewBook({ where: 'gdrive', copy: true })],
  ]);
}

$('#sw-next').onclick = () => {
  if (dlg.querySelector('input[name="sw-mode"]:checked').value === 'edit') return shareEditable();
  dlg.close();
  $('#btn-publish').click(); // bestehender Ablauf „Veröffentlichen …“
};
$('#sw-back').onclick = () => showStep(false);
$('#sw-song').onclick = () => {
  dlg.close();
  $('#btn-share').click();
};
$('#sw-live').onclick = () => {
  dlg.close();
  $('#btn-live').click();
};
$('#btn-sharewith').onclick = open;
$('#sync-sharewith').onclick = () => {
  $('#sync-dialog').close();
  open();
};
closeOnBackdrop('#sharewith-dialog');
