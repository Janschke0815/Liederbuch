// Kontextmenü: Rechtsklick (Maus), langes Drücken (Touch) oder Menütaste / Umschalt+F10.
// Bedienbar mit Pfeiltasten, Enter, Esc; Untermenüs mit → / ←.
//
// Eintrag: { label, icon?, hint?, action?, disabled?, danger?, checked?, items? (Untermenü),
//            context?: () => Einträge (eigenes Menü per Rechtsklick/lang drücken/Menütaste auf dem Eintrag),
//            contextTitle? }
//          oder '-' für eine Trennlinie
const LONG_PRESS_MS = 520;
let open = null; // { el, close }

function iconSvg(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

/** Offenes Kontextmenü schließen (falls eins offen ist). */
export function closeMenu() {
  open?.close();
}

/**
 * Menü an Position (x, y) zeigen.
 * @param {Array} items
 * @param {{x: number, y: number, title?: string, parent?: HTMLElement}} at
 */
export function showMenu(items, { x, y, title, parentMenu = null } = {}) {
  if (!parentMenu) closeMenu();
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.setAttribute('role', 'menu');
  menu.tabIndex = -1;
  if (title) {
    const t = document.createElement('div');
    t.className = 'ctx-title';
    t.textContent = title;
    menu.append(t);
  }

  let sub = null; // offenes Untermenü
  const closeSub = () => {
    sub?.close();
    sub = null;
  };

  const buttons = [];
  for (const it of items.filter(Boolean)) {
    if (it === '-') {
      if (menu.lastElementChild && !menu.lastElementChild.classList.contains('ctx-sep')) {
        menu.append(Object.assign(document.createElement('div'), { className: 'ctx-sep' }));
      }
      continue;
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ctx-item' + (it.danger ? ' danger' : '');
    b.setAttribute('role', it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem');
    if (it.checked !== undefined) b.setAttribute('aria-checked', String(Boolean(it.checked)));
    b.disabled = Boolean(it.disabled);
    const ic = document.createElement('span');
    ic.className = 'ctx-icon';
    if (it.checked) ic.textContent = '✓';
    else if (it.icon) ic.append(iconSvg(it.icon));
    const label = document.createElement('span');
    label.className = 'ctx-label';
    label.textContent = it.label;
    b.append(ic, label);
    if (it.hint || it.items) {
      const h = document.createElement('span');
      h.className = 'ctx-hint';
      h.textContent = it.items ? '›' : it.hint;
      b.append(h);
    }
    if (it.items) {
      b.setAttribute('aria-haspopup', 'menu');
      const openSub = () => {
        if (sub?.owner === b) return;
        closeSub();
        const r = b.getBoundingClientRect();
        sub = showMenu(it.items, { x: r.right - 4, y: r.top - 6, parentMenu: menu });
        sub.owner = b;
      };
      b.addEventListener('mouseenter', openSub);
      b.addEventListener('click', () => {
        openSub();
        sub?.focusFirst();
      });
      b.openSub = openSub;
    } else {
      b.addEventListener('mouseenter', closeSub);
      b.addEventListener('click', async () => {
        if (b.dataset.longPressed) return; // lang gedrückt: Optionen sind schon offen
        closeMenu();
        await it.action?.();
      });
    }
    if (it.context) {
      // Optionen zu diesem Eintrag (z. B. Liederbuch umbenennen/entfernen)
      b.openContext = (cx, cy) => {
        closeMenu();
        const m = showMenu(it.context(), { x: cx, y: cy, title: it.contextTitle });
        m.focusFirst();
      };
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const kb = e.clientX === 0 && e.clientY === 0;
        const r = b.getBoundingClientRect();
        b.openContext(kb ? r.left + 16 : e.clientX, kb ? r.bottom : e.clientY);
      });
      let timer = 0;
      let start = null;
      b.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        start = { x: e.clientX, y: e.clientY };
        timer = setTimeout(() => {
          b.dataset.longPressed = '1';
          navigator.vibrate?.(15);
          b.openContext(start.x, start.y);
        }, LONG_PRESS_MS);
      });
      const cancel = (e) => {
        if (e.type === 'pointermove' && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) return;
        clearTimeout(timer);
      };
      for (const t of ['pointermove', 'pointerup', 'pointercancel']) b.addEventListener(t, cancel);
    }
    buttons.push(b);
    menu.append(b);
  }
  if (menu.lastElementChild?.classList.contains('ctx-sep')) menu.lastElementChild.remove();

  document.body.append(menu);
  // im Fenster halten
  const r = menu.getBoundingClientRect();
  const vw = innerWidth;
  const vh = innerHeight;
  let left = x;
  let top = y;
  if (left + r.width > vw - 6) left = parentMenu ? Math.max(6, x - r.width - parentMenu.offsetWidth + 8) : Math.max(6, vw - r.width - 6);
  if (top + r.height > vh - 6) top = Math.max(6, vh - r.height - 6);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  const focusable = () => buttons.filter((b) => !b.disabled);
  const api = {
    el: menu,
    owner: null,
    focusFirst: () => focusable()[0]?.focus(),
    close() {
      closeSub();
      menu.remove();
      if (!parentMenu) {
        removeEventListener('pointerdown', onOutside, true);
        removeEventListener('keydown', onKey, true);
        removeEventListener('resize', closeMenu);
        removeEventListener('blur', closeMenu);
        document.removeEventListener('scroll', onScroll, true);
        open = null;
        api.restoreFocus?.focus?.({ preventScroll: true });
      }
    },
  };

  function onOutside(e) {
    if (!e.target.closest('.ctx-menu')) closeMenu();
  }
  function onScroll(e) {
    if (!e.target.closest?.('.ctx-menu')) closeMenu();
  }
  function onKey(e) {
    const active = document.activeElement;
    const inMenu = active?.closest?.('.ctx-menu');
    const list = inMenu ? [...inMenu.querySelectorAll('.ctx-item:not(:disabled)')] : focusable();
    const i = list.indexOf(active);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (inMenu && inMenu !== menu) {
        // Untermenü schließen, zurück zum Eintrag
        const owner = sub?.owner;
        closeSub();
        owner?.focus();
      } else closeMenu();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      list[(i + d + list.length) % list.length]?.focus();
    } else if ((e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) && active?.openContext) {
      e.preventDefault();
      const r = active.getBoundingClientRect();
      active.openContext(r.left + 16, r.bottom);
    } else if (e.key === 'ArrowRight' && active?.openSub) {
      e.preventDefault();
      active.openSub();
      sub?.focusFirst();
    } else if (e.key === 'ArrowLeft' && inMenu && inMenu !== menu) {
      e.preventDefault();
      const owner = sub?.owner;
      closeSub();
      owner?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  }

  if (!parentMenu) {
    api.restoreFocus = document.activeElement;
    open = api;
    addEventListener('pointerdown', onOutside, true);
    addEventListener('keydown', onKey, true);
    addEventListener('resize', closeMenu);
    addEventListener('blur', closeMenu);
    document.addEventListener('scroll', onScroll, true);
    menu.focus({ preventScroll: true });
  }
  return api;
}

/**
 * Kontextmenü an Elemente hängen.
 * @param {HTMLElement} root   Container (Ereignisse werden delegiert)
 * @param {string} selector    welche Elemente ein Menü bekommen
 * @param {(el: HTMLElement, e: Event) => Array|null|Promise<Array|null>} build
 */
export function attachContextMenu(root, selector, build, { title } = {}) {
  const openFor = async (target, x, y, viaKeyboard = false) => {
    const items = await build(target);
    if (!items?.length) return;
    const menu = showMenu(items, { x, y, title: typeof title === 'function' ? title(target) : title });
    if (viaKeyboard) menu.focusFirst();
  };

  root.addEventListener('contextmenu', (e) => {
    const target = e.target.closest(selector);
    if (!target || !root.contains(target)) return;
    if (e.target.closest('input, textarea, [contenteditable]')) return; // dort normales Menü
    e.preventDefault();
    const kb = e.button !== 2 && e.clientX === 0 && e.clientY === 0;
    if (kb) {
      const r = target.getBoundingClientRect();
      openFor(target, r.left + 16, r.top + r.height / 2, true);
    } else openFor(target, e.clientX, e.clientY);
  });

  // Langes Drücken auf Touch-Geräten (iOS kennt kein contextmenu-Ereignis)
  let timer = 0;
  let start = null;
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const target = e.target.closest(selector);
    if (!target) return;
    start = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    timer = setTimeout(() => {
      target.dataset.longPressed = '1';
      navigator.vibrate?.(15);
      openFor(target, start.x, start.y);
    }, LONG_PRESS_MS);
  });
  const cancel = (e) => {
    if (e.type === 'pointermove' && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) return;
    clearTimeout(timer);
  };
  root.addEventListener('pointermove', cancel);
  root.addEventListener('pointerup', cancel);
  root.addEventListener('pointercancel', cancel);
  // Klick nach langem Drücken nicht zusätzlich auslösen
  root.addEventListener('click', (e) => {
    const t = e.target.closest(selector);
    if (t?.dataset.longPressed) {
      delete t.dataset.longPressed;
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}
