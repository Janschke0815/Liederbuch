// Kopfleiste: angeheftete Aktionen beschriftet neben dem Menü „⋯“ (breiter Bildschirm).
//
// Es gibt nur eine Liste – die Einträge im Menü „⋯“. Angeheftete stehen zusätzlich als Knopf in der
// Leiste (der den Menüeintrag auslöst) und fehlen dann im Menü (data-quick). Welche und in welcher
// Reihenfolge: ⋯ → Leiste anpassen, oder Rechtsklick auf einen Eintrag bzw. Knopf.
// Reicht der Platz nicht, zeigt die Leiste nur Symbole, dann rutschen die letzten Knöpfe ins Menü.

import { attachContextMenu } from '../context-menu.js';
import { cleanPins, movePin, togglePin } from '../core/toolbar-pins.js';
import { prefs } from '../prefs.js';
import { $, closeOnBackdrop } from './dom.js';

/** Kurze Beschriftung in der Leiste (im Menü steht die lange). */
const SHORT = {
  'btn-import': 'Einfügen', 'btn-open': 'Öffnen', 'btn-share': 'Teilen', 'btn-print': 'Drucken', 'btn-live': 'Live',
  'btn-export': 'Sichern', 'btn-trash': 'Papierkorb', 'btn-install': 'Installieren', 'btn-settings': 'Einstellungen',
  'btn-keys': 'Tastenkürzel',
};

const toolbar = $('.toolbar');
const bar = $('#quick-actions');
const menu = $('#actions');
const menuBtn = $('#btn-menu');
const dlg = $('#toolbar-dialog');
const list = $('#toolbar-list');

// Nur Einträge, die im aktuellen Funktionsumfang sichtbar sind (src/modes.js: data-expert, data-harp-tool)
const menuItems = () => [...menu.querySelectorAll('button[id]:not([data-fixed])')]
  .filter((b) => !b.matches(':root[data-mode-simple] [data-expert], :root[data-mode-noharp] [data-harp-tool]'));
const labelOf = (b) => b.querySelector('.label')?.textContent.trim() || b.id;
const pins = () => cleanPins(prefs.get('toolbarPins'), menuItems().map((b) => b.id));
const barShown = () => getComputedStyle(bar).display !== 'none';

function save(p) {
  prefs.set('toolbarPins', p);
  render();
  if (dlg.open) renderDialog();
}

/** Knöpfe der Leiste neu aufbauen. */
function render() {
  for (const b of menuItems()) delete b.dataset.quick;
  bar.replaceChildren(...pins().map((id) => {
    const target = $(`#${id}`);
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.for = id;
    b.title = target.title;
    b.hidden = target.hidden;
    b.append(target.querySelector('.icon').cloneNode(true),
      Object.assign(document.createElement('span'), { className: 'label', textContent: SHORT[id] || labelOf(target) }));
    b.onclick = () => target.click();
    return b;
  }));
  fit();
}

/** Ragt die Kopfleiste über den Rand? (Buchname dabei in voller Breite gerechnet.) */
function overflowing() {
  toolbar.classList.add('measuring');
  const over = toolbar.scrollWidth > toolbar.clientWidth + 1
    || menuBtn.getBoundingClientRect().right > toolbar.getBoundingClientRect().right + 1;
  toolbar.classList.remove('measuring');
  return over;
}

/** Bei Platzmangel erst nur Symbole, dann die letzten Knöpfe zurück ins Menü. */
function fit() {
  const btns = [...bar.children];
  bar.classList.remove('compact');
  for (const b of btns) {
    b.classList.remove('overflow');
    $(`#${b.dataset.for}`).dataset.quick = '';
  }
  if (!barShown() || !overflowing()) return;
  bar.classList.add('compact');
  for (let i = btns.length - 1; i >= 0 && overflowing(); i--) {
    btns[i].classList.add('overflow');
    delete $(`#${btns[i].dataset.for}`).dataset.quick;
  }
}

// ---------- Dialog „Leiste anpassen“ ----------

function renderDialog() {
  const p = pins();
  const rest = menuItems().map((b) => b.id).filter((id) => !p.includes(id));
  list.replaceChildren(...[...p, ...rest].map((id) => {
    const target = $(`#${id}`);
    const pinned = p.includes(id);
    const li = document.createElement('li');
    li.className = pinned ? 'pinned' : '';
    const check = Object.assign(document.createElement('input'), { type: 'checkbox', checked: pinned });
    check.onchange = () => save(togglePin(pins(), id));
    const label = document.createElement('label');
    label.append(check, target.querySelector('.icon').cloneNode(true), labelOf(target));
    li.append(label);
    if (pinned) {
      const i = p.indexOf(id);
      const move = (dir, text, title) => {
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'icon-btn', textContent: text, title });
        b.setAttribute('aria-label', `${labelOf(target)}: ${title}`);
        b.disabled = (dir < 0 && i === 0) || (dir > 0 && i === p.length - 1);
        b.onclick = () => save(movePin(pins(), id, dir));
        return b;
      };
      li.append(move(-1, '↑', 'weiter nach vorn'), move(1, '↓', 'weiter nach hinten'));
    }
    return li;
  }));
}

$('#btn-toolbar').onclick = () => {
  renderDialog();
  dlg.showModal();
};
$('#toolbar-reset').onclick = () => {
  prefs.remove('toolbarPins');
  render();
  renderDialog();
};
closeOnBackdrop('#toolbar-dialog');

// ---------- Rechtsklick: anheften / lösen / verschieben ----------

function pinItems(id, { inBar = false } = {}) {
  if (!barShown()) return null; // Handy: keine Leiste zum Anheften
  const p = pins();
  const pinned = p.includes(id);
  return [
    { label: pinned ? 'Von der Leiste lösen' : 'An die Leiste anheften', icon: 'panel', action: () => save(togglePin(pins(), id)) },
    inBar && { label: 'Nach links', icon: 'left', disabled: p.indexOf(id) === 0, action: () => save(movePin(pins(), id, -1)) },
    inBar && { label: 'Nach rechts', icon: 'right', disabled: p.indexOf(id) === p.length - 1, action: () => save(movePin(pins(), id, 1)) },
    '-',
    { label: 'Leiste anpassen …', action: () => $('#btn-toolbar').click() },
  ];
}
attachContextMenu(menu, 'button[id]:not([data-fixed])', (b) => pinItems(b.id));
attachContextMenu(bar, 'button[data-for]', (b) => pinItems(b.dataset.for, { inBar: true }));

// ---------- Start und Größenänderung ----------

render();
addEventListener('modeschange', render); // Expertenmodus an/aus: z. B. „Live“ kommt in die Leiste bzw. verschwindet
// Installieren erscheint erst, wenn der Browser es anbietet
new MutationObserver(render).observe($('#btn-install'), { attributes: true, attributeFilter: ['hidden'] });
// Platz ändert sich mit dem Fenster, dem Buchnamen (kommt erst nach dem Start), LIVE- und Cloud-Anzeige
new ResizeObserver(() => fit()).observe(toolbar);
new MutationObserver(() => fit()).observe(toolbar, {
  subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'],
});
document.fonts?.ready.then(fit);
