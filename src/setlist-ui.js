// Setlisten in der linken Spalte: Übersicht, Bearbeiten (Reihenfolge, Notiz, eigene
// Transposition), Spielen und Drucken in Setlisten-Reihenfolge.

import { attachContextMenu } from './context-menu.js';
import { $ } from './ui/dom.js';
import { prefs } from './prefs.js';

const h = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};
const icon = (name) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
};
const fmtT = (t) => (t > 0 ? `+${t}` : String(t));
const count = (n) => `${n} ${n === 1 ? 'Lied' : 'Lieder'}`;

/**
 * @param {{repo, sets, getCurrentId: () => string|null, openSong: (id) => Promise<void>,
 *          play, printSongs: (songs, options) => Promise<void>, toast: Function}} opts
 */
export function setupSetlists({ repo, sets, getCurrentId, openSong, play, printSongs, toast }) {
  const tabSongs = $('#tab-songs');
  const tabSets = $('#tab-sets');
  let openId = prefs.get('openSetlist') || null;
  let expanded = null; // songId-Index mit offenem Bearbeiten-Feld
  let songMap = new Map();

  // ---------- Reiter ----------

  function setTab(tab) {
    for (const b of document.querySelectorAll('.list-tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    tabSongs.hidden = tab !== 'songs';
    tabSets.hidden = tab !== 'sets';
    prefs.set('listTab', tab);
    if (tab === 'sets') render();
  }
  for (const b of document.querySelectorAll('.list-tabs button')) b.onclick = () => setTab(b.dataset.tab);

  // ---------- Übersicht ----------

  async function renderOverview() {
    const all = await sets.list();
    const items = all.map((s) => {
      const li = h('li');
      const btn = h('button', 'song-item');
      btn.type = 'button';
      btn.append(h('span', 'song-item-title', s.name || 'Ohne Namen'), h('span', 'set-row-count', count(s.items.length)));
      btn.dataset.set = s.id;
      btn.onclick = () => openSet(s.id);
      li.append(btn);
      return li;
    });
    if (!items.length) {
      items.push(h('li', 'list-empty', 'Noch keine Setlisten. Eine Setliste ist eine Liedauswahl in fester Reihenfolge – z. B. für einen Auftritt.'));
    }
    $('#set-list').replaceChildren(...items);
  }

  $('#set-new').onclick = async () => {
    const s = await sets.create(`Setliste ${new Date().toLocaleDateString('de')}`);
    await openSet(s.id);
    $('#set-name').select();
    $('#set-name').focus();
  };

  // ---------- Einzelne Setliste ----------

  async function openSet(id) {
    openId = id;
    expanded = null;
    if (id) prefs.set('openSetlist', id);
    else prefs.remove('openSetlist');
    await render();
  }

  $('#set-back').onclick = () => openSet(null);

  let nameTimer;
  $('#set-name').addEventListener('input', () => {
    clearTimeout(nameTimer);
    const id = openId;
    nameTimer = setTimeout(() => sets.update(id, { name: $('#set-name').value }), 400);
  });

  $('#set-delete').onclick = async () => {
    const s = await sets.get(openId);
    if (!s) return;
    await sets.remove(s.id);
    await openSet(null);
    toast(`Setliste „${s.name}“ gelöscht`, {
      action: 'Rückgängig',
      onAction: async () => {
        await sets.restore(s.id);
        await openSet(s.id);
      },
    });
  };

  async function current() {
    return openId ? sets.get(openId) : null;
  }

  async function saveItems(items) {
    await sets.update(openId, { items });
    await render();
  }

  function itemRow(item, index, all, activeId) {
    const song = songMap.get(item.songId);
    const li = h('li', 'set-item');
    li.dataset.index = index;
    if (!song) li.classList.add('missing');
    if (song && song.id === activeId) li.classList.add('active');

    const row = h('div', 'set-item-row');
    const main = h('button', 'set-item-main');
    main.type = 'button';
    const sub = h('span', 'set-item-sub');
    if (item.transpose !== null) sub.append(h('span', 'chip', `Transp. ${fmtT(item.transpose)}`));
    sub.append(item.note || song?.artist || '');
    main.append(h('span', 'set-num', `${index + 1}.`), h('span', 'set-item-title', song ? song.title || 'Ohne Titel' : '(gelöscht)'), sub);
    main.onclick = () => song && openSong(song.id);
    main.disabled = !song;

    const more = h('button', 'set-item-more');
    more.type = 'button';
    more.title = 'Bearbeiten · ziehen zum Verschieben';
    more.setAttribute('aria-expanded', String(expanded === index));
    more.append(icon('more'));
    more.onclick = () => {
      expanded = expanded === index ? null : index;
      render();
    };
    row.append(main, more);
    li.append(row);

    // Ziehen zum Umsortieren
    li.draggable = true;
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/x-set-index', String(index));
      e.dataTransfer.effectAllowed = 'move';
      li.classList.add('dragging');
    });
    li.addEventListener('dragend', () => li.classList.remove('dragging'));
    li.addEventListener('dragover', (e) => {
      if (![...e.dataTransfer.types].includes('text/x-set-index')) return;
      e.preventDefault();
      li.classList.add('drop-before');
    });
    li.addEventListener('dragleave', () => li.classList.remove('drop-before'));
    li.addEventListener('drop', (e) => {
      const from = Number(e.dataTransfer.getData('text/x-set-index'));
      li.classList.remove('drop-before');
      if (Number.isNaN(from) || from === index) return;
      e.preventDefault();
      e.stopPropagation();
      const items = [...all];
      const [moved] = items.splice(from, 1);
      items.splice(from < index ? index - 1 : index, 0, moved);
      expanded = null;
      saveItems(items);
    });

    if (expanded === index) li.append(itemPanel(item, index, all, song));
    return li;
  }

  function itemPanel(item, index, all, song) {
    const panel = h('div', 'set-item-panel');
    const update = (changes) => saveItems(all.map((it, i) => (i === index ? { ...it, ...changes } : it)));

    // Transposition nur für diese Setliste
    const tr = h('div', 'tools');
    const stepper = h('div', 'stepper');
    const effective = item.transpose ?? song?.transpose ?? 0;
    const down = h('button', '', '−');
    const val = h('output', 'set-tr', item.transpose === null ? `wie Lied (${fmtT(song?.transpose || 0)})` : fmtT(item.transpose));
    const up = h('button', '', '+');
    down.type = up.type = 'button';
    down.onclick = () => update({ transpose: effective - 1 });
    up.onclick = () => update({ transpose: effective + 1 });
    stepper.append(down, val, up);
    tr.append(h('span', '', 'Transposition'), stepper);
    if (item.transpose !== null) {
      const reset = h('button', 'link-btn', 'wie Lied');
      reset.type = 'button';
      reset.onclick = () => update({ transpose: null });
      tr.append(reset);
    }

    const noteLabel = h('label', '', 'Notiz (z. B. „Capo 2“, „Einsatz Gitarre“)');
    const note = h('input');
    note.value = item.note;
    note.maxLength = 500;
    let t;
    note.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => sets.update(openId, { items: all.map((it, i) => (i === index ? { ...it, note: note.value } : it)) }), 500);
    });
    note.addEventListener('change', () => update({ note: note.value }));
    noteLabel.append(note);

    const tools = h('div', 'tools');
    const move = (delta) => {
      const j = index + delta;
      if (j < 0 || j >= all.length) return;
      const items = [...all];
      [items[index], items[j]] = [items[j], items[index]];
      expanded = j;
      saveItems(items);
    };
    const upBtn = h('button', '', '↑ nach oben');
    const downBtn = h('button', '', '↓ nach unten');
    const del = h('button', 'danger', 'Entfernen');
    for (const b of [upBtn, downBtn, del]) b.type = 'button';
    upBtn.disabled = index === 0;
    downBtn.disabled = index === all.length - 1;
    upBtn.onclick = () => move(-1);
    downBtn.onclick = () => move(1);
    del.onclick = () => {
      expanded = null;
      saveItems(all.filter((_, i) => i !== index));
    };
    tools.append(upBtn, downBtn, del);

    panel.append(tr, noteLabel, tools);
    return panel;
  }

  async function renderDetail(s) {
    if (document.activeElement !== $('#set-name')) $('#set-name').value = s.name;
    const activeId = getCurrentId();
    $('#set-items').replaceChildren(...s.items.map((it, i) => itemRow(it, i, s.items, activeId)));
    if (!s.items.length) {
      $('#set-items').append(h('li', 'list-empty', 'Noch leer – unten Lieder hinzufügen.'));
    }
    const missing = s.items.filter((i) => !songMap.has(i.songId)).length;
    $('#set-count').textContent = count(s.items.length) + (missing ? ` · ${missing} gelöscht` : '');
    $('#set-play').disabled = $('#set-print').disabled = s.items.length === missing;
  }

  // ---------- Lieder hinzufügen ----------

  const addSearch = $('#set-add-search');
  async function renderAddResults() {
    const q = addSearch.value.trim();
    if (!q) {
      $('#set-add-results').replaceChildren();
      return;
    }
    const s = await current();
    const inSet = new Set(s?.items.map((i) => i.songId));
    const found = (await repo.list({ query: q })).slice(0, 12);
    $('#set-add-results').replaceChildren(...found.map((song) => {
      const li = h('li');
      const b = h('button', '', song.title || 'Ohne Titel');
      b.type = 'button';
      if (song.artist) b.append(h('small', '', song.artist));
      if (inSet.has(song.id)) b.append(h('small', '', '· schon drin'));
      b.onclick = async () => {
        const cur = await current();
        await sets.update(openId, { items: [...cur.items, { songId: song.id, transpose: null, note: '' }] });
        addSearch.value = '';
        renderAddResults();
        await render();
        toast(`„${song.title}“ hinzugefügt`);
        addSearch.focus();
      };
      li.append(b);
      return li;
    }));
    if (!found.length) $('#set-add-results').append(h('li', 'hint', 'Kein Lied gefunden'));
  }
  addSearch.addEventListener('input', renderAddResults);
  addSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#set-add-results button')?.click();
    } else if (e.key === 'Escape') {
      addSearch.value = '';
      renderAddResults();
    }
  });

  // ---------- Spielen / Drucken ----------

  async function entries() {
    const s = await current();
    return (s?.items || [])
      .filter((i) => songMap.has(i.songId))
      .map((i) => ({ id: i.songId, transpose: i.transpose, note: i.note }));
  }

  $('#set-play').onclick = async () => {
    const list = await entries();
    if (!list.length) return;
    const cur = getCurrentId();
    play.open(list.some((e) => e.id === cur) ? cur : list[0].id, list);
  };

  $('#set-print').onclick = async () => {
    const s = await current();
    const list = (await entries()).map((e) => {
      const song = songMap.get(e.id);
      return { ...song, transpose: e.transpose ?? song.transpose };
    });
    await printSongs(list, { title: s.name, subtitle: 'Setliste', useSavedTranspose: true });
  };

  // ---------- Darstellen ----------

  async function render() {
    if (tabSets.hidden) return;
    songMap = new Map((await repo.list()).map((s) => [s.id, s]));
    const s = await current();
    if (openId && !s) openId = null;
    $('#sets-overview').hidden = Boolean(s);
    $('#set-detail').hidden = !s;
    if (s) await renderDetail(s);
    else await renderOverview();
  }

  // ---------- Kontextmenüs ----------

  async function playFrom(songId) {
    const list = await entries();
    if (list.length) play.open(songId, list);
  }

  attachContextMenu($('#set-items'), '.set-item', async (li) => {
    const s = await current();
    if (!s) return null;
    const index = Number(li.dataset.index);
    const item = s.items[index];
    const song = songMap.get(item?.songId);
    const move = async (to) => {
      const items = [...s.items];
      const [m] = items.splice(index, 1);
      items.splice(to, 0, m);
      expanded = null;
      await saveItems(items);
    };
    return [
      { label: 'Öffnen', icon: 'eye', disabled: !song, action: () => openSong(song.id) },
      { label: 'Ab hier spielen', icon: 'stage', disabled: !song, action: () => playFrom(song.id) },
      '-',
      { label: 'Nach oben', disabled: index === 0, action: () => move(index - 1) },
      { label: 'Nach unten', disabled: index === s.items.length - 1, action: () => move(index + 1) },
      { label: 'An den Anfang', disabled: index === 0, action: () => move(0) },
      { label: 'Ans Ende', disabled: index === s.items.length - 1, action: () => move(s.items.length - 1) },
      '-',
      { label: 'Notiz & Transposition …', icon: 'edit', action: () => { expanded = index; render(); } },
      { label: 'Aus Setliste entfernen', icon: 'x', danger: true, action: () => { expanded = null; saveItems(s.items.filter((_, i) => i !== index)); } },
    ];
  }, { title: (li) => li.querySelector('.set-item-title')?.textContent || '' });

  attachContextMenu($('#set-list'), '.song-item[data-set]', async (btn) => {
    const s = await sets.get(btn.dataset.set);
    if (!s) return null;
    return [
      { label: 'Öffnen', icon: 'eye', action: () => openSet(s.id) },
      {
        label: 'Spielen', icon: 'stage', disabled: !s.items.length,
        action: async () => {
          songMap = new Map((await repo.list()).map((x) => [x.id, x]));
          const list = s.items.filter((i) => songMap.has(i.songId)).map((i) => ({ id: i.songId, transpose: i.transpose, note: i.note }));
          if (list.length) play.open(list[0].id, list);
        },
      },
      {
        label: 'Duplizieren', icon: 'paste',
        action: async () => {
          const copy = await sets.create(`${s.name} (Kopie)`, s.items);
          await openSet(copy.id);
          toast('Kopie der Setliste angelegt');
        },
      },
      '-',
      {
        label: 'Löschen', icon: 'trash', danger: true,
        action: async () => {
          await sets.remove(s.id);
          await render();
          toast(`Setliste „${s.name}“ gelöscht`, {
            action: 'Rückgängig',
            onAction: async () => {
              await sets.restore(s.id);
              await render();
            },
          });
        },
      },
    ];
  }, { title: (btn) => btn.querySelector('.song-item-title')?.textContent || '' });

  sets.addEventListener('remote-change', render);
  addEventListener('songopened', () => render());
  repo.addEventListener('remote-change', render);
  repo.addEventListener('change', () => {
    // Titel können sich geändert haben; nur neu zeichnen, wenn sichtbar
    clearTimeout(render.t);
    render.t = setTimeout(render, 300);
  });

  setTab(prefs.get('listTab') === 'sets' ? 'sets' : 'songs');

  /** Liste neu zeichnen, z. B. wenn ein anderes Lied geöffnet wurde (Markierung). */
  return {
    refresh: render,
    /** Reiter "Setlisten" zeigen und eine Setliste öffnen */
    open: async (id) => {
      setTab('sets');
      await openSet(id);
    },
  };
}
