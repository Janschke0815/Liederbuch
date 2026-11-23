// Spielmodus: Vollbild nur mit dem Lied, automatisches Scrollen, Bildschirm bleibt an,
// Blättern per Tastatur oder Bluetooth-Fußpedal (die senden Bild-/Pfeiltasten).
//
// Tasten: siehe SHORTCUTS.play in ui/shortcuts.js. Rechnungen (Tempo, Doppelseiten) in
// core/play-scroll.js, gemerkte Werte (Schrift, Tempo pro Lied …) über prefs.js.

import { parseChordPro } from './core/chordpro.js';
import { renderSong } from './render/song-view.js';
import { applySettings, loadSettings, saveSettings } from './settings/settings.js';
import { metronome, beatsPerBar } from './metronome.js';
import { prefs } from './prefs.js';
import { SHORTCUTS, findShortcut } from './ui/shortcuts.js';
import {
  durationSeconds, pixelsPerSecond, secondsPerPage,
  pageCount as countPages, pageIndex as indexOfPage, pagePos as posOfPage, snapPos,
} from './core/play-scroll.js';
import { $ } from './ui/dom.js';

export { durationSeconds }; // alter Fundort, für bestehende Aufrufer

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;
const SPEED_MIN = 0.2;
const SPEED_MAX = 5;
const BAR_HIDE_MS = 2500;

const fmtSpeed = (f) => `${f.toFixed(1).replace('.', ',')}×`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Spielmodus einrichten (Vollbild, automatisches Scrollen, Pedal).
 * @param {{repo, getSongIds: () => Promise<string[]>, onClose: (id: string) => void}} opts
 *   getSongIds: Reihenfolge zum Blättern (aktuelle Liste bzw. später Setliste)
 */
export function setupPlayMode({ repo, getSongIds, onClose }) {
  const view = $('#play-view');
  const scroller = $('#pl-scroll');
  const sheet = $('#pl-sheet');
  const toggleBtn = $('#pl-toggle');

  let entries = []; // [{ id, transpose?, note? }]
  let index = 0;
  let song = null; // Datensatz
  let meta = {};
  let playing = false;
  let speed = 1; // Faktor
  let carry = 0; // Bruchteile von Pixeln
  let lastT = 0;
  let raf = 0;
  let hideTimer = 0;
  let wakeLock = null;
  let zoom = prefs.get('playZoom'); // allgemeine Schriftgröße
  let songZoom = 0; // Schriftgröße dieses Liedes (gemerkt), sonst 0
  let cols = prefs.get('playColumns') === '2'; // zwei Spalten, seitenweise
  let pageClock = 0; // Sekunden seit dem letzten automatischen Umblättern

  // ---------- Bildschirm wach halten ----------

  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock && !document.hidden) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => (wakeLock = null));
      }
    } catch {
      /* nicht erlaubt (z. B. Energiesparmodus) – egal */
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!view.hidden && !document.hidden) keepAwake();
  });

  // ---------- Leiste ein-/ausblenden ----------

  function showBar(autoHide = playing) {
    view.classList.remove('bar-hidden');
    clearTimeout(hideTimer);
    if (autoHide) hideTimer = setTimeout(() => view.classList.add('bar-hidden'), BAR_HIDE_MS);
  }

  // ---------- Darstellung ----------

  function applyZoom() {
    const z = songZoom || zoom;
    if (z) view.style.setProperty('--play-zoom', z.toFixed(2));
    else view.style.removeProperty('--play-zoom');
  }

  function currentZoom() {
    return songZoom || zoom || Number(getComputedStyle(view).getPropertyValue('--play-zoom')) || 1.3;
  }

  function setZoom(z) {
    const rel = pos() / Math.max(1, maxPos());
    // pro Lied merken; die letzte Wahl gilt außerdem für Lieder ohne eigene Größe
    zoom = songZoom = clamp(Math.round(z * 20) / 20, ZOOM_MIN, ZOOM_MAX);
    prefs.set('playZoom', zoom);
    if (song?.id) prefs.setIn('playZoomSong', song.id, songZoom);
    applyZoom();
    layout();
    setPos(cols ? snap(rel * maxPos()) : rel * maxPos());
  }

  // ---------- Ein- oder zweispaltig ----------
  // Zweispaltig: das Lied fließt in Spalten von Bildschirmhöhe (CSS-Mehrspaltensatz),
  // je zwei sind sichtbar; geblättert wird waagerecht um zwei Spalten.

  function layout() {
    view.classList.toggle('cols2', cols);
    $('#pl-cols').setAttribute('aria-pressed', String(cols));
    if (!cols) {
      sheet.style.height = '';
      return;
    }
    const cs = getComputedStyle(scroller);
    const avail = scroller.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    sheet.style.height = `${Math.max(100, avail / currentZoom())}px`;
  }

  /** Breite einer Doppelseite (zwei Spalten + Abstand) in Bildschirmpixeln. */
  function pageWidth() {
    const gap = parseFloat(getComputedStyle(sheet).columnGap) || 0;
    return sheet.getBoundingClientRect().width + gap * currentZoom();
  }
  const pos = () => (cols ? scroller.scrollLeft : scroller.scrollTop);
  const maxPos = () => (cols ? scroller.scrollWidth - scroller.clientWidth : scroller.scrollHeight - scroller.clientHeight);
  const setPos = (v) => {
    if (cols) scroller.scrollLeft = v;
    else scroller.scrollTop = v;
  };
  // Doppelseiten: 0, pw, 2·pw … – die letzte kann nur halb gefüllt sein (dann bis maxPos)
  const pageCount = () => (cols ? countPages(maxPos(), pageWidth()) : 1);
  const pageIndex = () => indexOfPage(pos(), maxPos(), pageWidth());
  const pagePos = (i) => posOfPage(i, maxPos(), pageWidth());
  const snap = (v) => snapPos(v, maxPos(), pageWidth());

  function setCols(on) {
    cols = on;
    prefs.set('playColumns', on ? '2' : '1');
    setPlaying(false);
    layout();
    setPos(0);
    updateProgress();
  }

  function setSpeed(f, persist = true) {
    speed = clamp(Math.round(f * 10) / 10, SPEED_MIN, SPEED_MAX);
    $('#pl-speed').textContent = fmtSpeed(speed);
    if (persist && song?.id) prefs.setIn('playSpeed', song.id, speed);
  }

  async function show(i) {
    if (!entries.length) return;
    index = clamp(i, 0, entries.length - 1);
    const entry = entries[index];
    song = await repo.get(entry.id);
    if (!song) return;
    const parsed = parseChordPro(song.chordpro);
    meta = parsed.meta;
    applySettings(sheet, loadSettings());
    const transpose = entry.transpose ?? song.transpose;
    sheet.replaceChildren(renderSong(parsed, { transpose, accidentals: song.accidentals }));
    syncDiagramButton();
    if (song.note) {
      const n = document.createElement('div');
      n.className = 'song-note';
      n.textContent = song.note;
      sheet.prepend(n);
    }
    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'play-note';
      note.textContent = entry.note;
      sheet.querySelector('.song-header')?.append(note);
    }
    // zuletzt gespielt (für die Sortierung der Liste)
    prefs.setIn('playedAt', song.id, new Date().toISOString());
    songZoom = Number(prefs.get('playZoomSong')[song.id]) || 0;
    applyZoom();
    const next = index < entries.length - 1 ? await repo.get(entries[index + 1].id) : null;
    $('#pl-title').textContent = song.title || 'Ohne Titel';
    $('#pl-pos').textContent = entries.length > 1
      ? `${index + 1} / ${entries.length}${next ? ` · Nächstes: ${next.title || 'Ohne Titel'}` : ' · Letztes Lied'}`
      : song.artist || '';
    $('#pl-prev').disabled = index === 0;
    $('#pl-next').disabled = index >= entries.length - 1;
    const endBtn = $('#pl-next-end');
    endBtn.hidden = !next;
    endBtn.textContent = next ? `Nächstes Lied: ${next.title || 'Ohne Titel'} →` : '';
    setSpeed(prefs.get('playSpeed')[song.id] || 1, false);
    // Metronom läuft weiter, aber im Tempo des neuen Liedes
    if (metronome.running) metronome.start(Number(meta.tempo) || 100, beatsPerBar(meta.time));
    syncMetro();
    layout();
    stopGlide(); // eine Blätter-Bewegung des vorigen Liedes darf hier nicht nachwirken
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
    carry = 0;
    pageClock = 0;
    updateProgress();
  }

  // ---------- Automatisch scrollen ----------

  /** Grundgeschwindigkeit: Lied läuft in seiner Dauer (Standard 3 min) einmal durch. */
  function basePxPerSecond() {
    const end = $('.play-end');
    const content = scroller.scrollHeight - end.offsetHeight + scroller.clientHeight * 0.5;
    return pixelsPerSecond(content - scroller.clientHeight, meta.duration);
  }

  function maxScroll() {
    return maxPos();
  }

  function step(t) {
    if (!playing) return;
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
    lastT = t;
    if (cols) {
      // zweispaltig: im Liedtempo umblättern, auf der letzten Doppelseite anhalten
      const secs = secondsPerPage(meta.duration, pageCount(), speed);
      pageClock += dt;
      updateProgress(pageClock / secs);
      if (pageClock >= secs) {
        pageClock = 0;
        if (pos() >= maxPos() - 2) {
          setPlaying(false);
          return;
        }
        page(1);
      }
      raf = requestAnimationFrame(step);
      return;
    }
    carry += basePxPerSecond() * speed * dt;
    const whole = Math.floor(carry);
    if (whole >= 1) {
      carry -= whole;
      scroller.scrollTop += whole;
    }
    // Ende des Liedtextes erreicht (Knopf "Nächstes Lied" sichtbar) -> anhalten
    const end = $('.play-end').getBoundingClientRect().top;
    if (end < scroller.getBoundingClientRect().bottom - 40 || scroller.scrollTop >= maxScroll() - 1) {
      setPlaying(false);
      return;
    }
    raf = requestAnimationFrame(step);
  }

  function setPlaying(on) {
    playing = on;
    cancelAnimationFrame(raf);
    toggleBtn.innerHTML = `<svg class="icon"><use href="#i-${on ? 'pause' : 'play'}"/></svg>`;
    toggleBtn.setAttribute('aria-label', on ? 'Scrollen anhalten' : 'Scrollen starten');
    if (on) setExtra(false);
    if (on) {
      lastT = 0;
      raf = requestAnimationFrame(step);
      showBar(true);
    } else {
      showBar(false);
    }
  }

  /** Fortschrittsbalken unten; zweispaltig: Seite + Anteil bis zum nächsten Umblättern */
  function updateProgress(within = 0) {
    let f;
    if (cols) {
      const pages = pageCount();
      const current = pageIndex();
      f = pages > 1 ? Math.min(1, (current + (playing ? within : 0)) / (pages - 1)) : 1;
    } else {
      const max = maxPos();
      f = max > 0 ? scroller.scrollTop / max : 0;
    }
    $('#pl-progress').style.width = `${f * 100}%`;
  }
  scroller.addEventListener('scroll', () => updateProgress(), { passive: true });

  // ---------- Blättern ----------

  // Eigene kurze Animation statt behavior:'smooth' – landet garantiert am Ziel
  let anim = 0;
  let glideTimer = 0;
  let gliding = null; // Ziel der laufenden Bewegung – schnelles Mehrfach-Blättern zählt davon weiter
  function glideTo(target, ms = 260) {
    cancelAnimationFrame(anim);
    clearTimeout(glideTimer); // sonst springt die Absicherung einer älteren Bewegung zurück
    const max = maxPos();
    const to = clamp(target, 0, max);
    const from = pos();
    gliding = to;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      setPos(from + (to - from) * (1 - (1 - k) ** 3));
      if (k < 1) anim = requestAnimationFrame(tick);
      else updateProgress();
    };
    anim = requestAnimationFrame(tick);
    glideTimer = setTimeout(() => {
      if (Math.abs(pos() - to) > 1) setPos(to);
      gliding = null;
      updateProgress();
    }, ms + 80);
  }

  function stopGlide() {
    cancelAnimationFrame(anim);
    clearTimeout(glideTimer);
    gliding = null;
  }

  function page(dir) {
    const max = maxPos();
    const here = gliding ?? pos(); // während einer Bewegung: von deren Ziel aus weiterzählen
    const atEnd = here >= max - 2;
    const atStart = here <= 2;
    if (dir > 0 && atEnd) return go(1);
    if (dir < 0 && atStart) return go(-1, { toEnd: true });
    pageClock = 0;
    if (cols) {
      glideTo(pagePos(indexOfPage(here, max, pageWidth()) + dir));
      return;
    }
    // ein Bildschirm minus etwas Überlappung, damit keine Zeile verloren geht
    glideTo(here + dir * scroller.clientHeight * 0.82);
  }

  async function go(delta, { toEnd = false } = {}) {
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    const wasPlaying = playing;
    setPlaying(false);
    await show(target);
    if (toEnd) setPos(cols ? pagePos(pageCount() - 1) : maxPos());
    if (wasPlaying && delta > 0) showBar(false);
  }

  // ---------- Öffnen / Schließen ----------

  /** list: optional feste Reihenfolge (Setliste) mit eigener Transposition/Notiz */
  async function open(currentId, list = null) {
    entries = list || (await getSongIds()).map((id) => ({ id }));
    if (!entries.length) return;
    view.hidden = false;
    view.classList.toggle('night', prefs.get('playNight'));
    $('#pl-night').setAttribute('aria-pressed', String(view.classList.contains('night')));
    applyZoom();
    syncDiagramButton();
    await show(Math.max(0, entries.findIndex((e) => e.id === currentId)));
    showBar(false);
    scroller.focus({ preventScroll: true });
    keepAwake();
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    } catch {
      /* Vollbild nicht möglich (z. B. iPhone) – egal */
    }
  }

  function close() {
    setPlaying(false);
    setExtra(false);
    metronome.stop();
    syncMetro();
    clearTimeout(hideTimer);
    view.hidden = true;
    wakeLock?.release().catch(() => {});
    wakeLock = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onClose?.(song?.id);
  }

  // ---------- Bedienelemente ----------

  $('#pl-exit').onclick = close;
  // Handy: selten gebrauchte Knöpfe hinter "⋯"
  function setExtra(open) {
    view.classList.toggle('extra-open', open);
    $('#pl-more').setAttribute('aria-expanded', String(open));
  }
  $('#pl-more').onclick = () => setExtra(!view.classList.contains('extra-open'));
  $('#pl-prev').onclick = () => go(-1);
  $('#pl-next').onclick = () => go(1);
  $('#pl-next-end').onclick = () => go(1);
  $('#pl-smaller').onclick = () => setZoom(currentZoom() - 0.1);
  $('#pl-bigger').onclick = () => setZoom(currentZoom() + 0.1);
  $('#pl-slower').onclick = () => setSpeed(speed - 0.1);
  $('#pl-faster').onclick = () => setSpeed(speed + 0.1);
  toggleBtn.onclick = () => setPlaying(!playing);
  $('#pl-cols').onclick = () => setCols(!cols);

  function syncMetro() {
    const b = $('#pl-metro');
    b.setAttribute('aria-pressed', String(metronome.running));
    b.title = `Metronom${meta.tempo ? ` ${meta.tempo} bpm` : ' (kein Tempo angegeben: 100 bpm)'}${meta.time ? `, ${meta.time}` : ''} (M)`;
    const chip = $('#time-chip');
    if (chip) chip.setAttribute('aria-pressed', String(metronome.running));
  }
  function toggleMetro() {
    metronome.toggle(Number(meta.tempo) || 100, beatsPerBar(meta.time));
    syncMetro();
  }
  $('#pl-metro').onclick = toggleMetro;

  // Griffbilder, Mundharmonika- und Gitarren-Tabs ein/aus – dieselben Einstellungen wie im
  // Einstellungsdialog. Die Tab-Knöpfe erscheinen nur, wenn das Lied solche Tabs enthält.
  const TOGGLES = { showChords: '#pl-chords', showDiagrams: '#pl-diagrams', showHarp: '#pl-harp', showTabs: '#pl-tabs' };
  function syncDiagramButton() {
    const s = loadSettings();
    for (const [key, sel] of Object.entries(TOGGLES)) $(sel).setAttribute('aria-pressed', String(s[key]));
    $('#pl-harp').hidden = !sheet.querySelector('.chord.harp');
    $('#pl-tabs').hidden = !sheet.querySelector('.block--tab');
  }
  function toggleSetting(key) {
    const rel = pos() / Math.max(1, maxPos());
    const now = loadSettings();
    const s = saveSettings({ ...now, [key]: !now[key] });
    applySettings(sheet, s);
    syncDiagramButton();
    layout();
    setPos(cols ? snap(rel * maxPos()) : rel * maxPos());
  }
  const toggleDiagrams = () => toggleSetting('showDiagrams');
  $('#pl-diagrams').onclick = toggleDiagrams;
  $('#pl-chords').onclick = () => toggleSetting('showChords');
  $('#pl-harp').onclick = () => toggleSetting('showHarp');
  $('#pl-tabs').onclick = () => toggleSetting('showTabs');
  addEventListener('resize', () => {
    if (view.hidden) return;
    const rel = pos() / Math.max(1, maxPos());
    layout();
    setPos(cols ? snap(rel * maxPos()) : rel * maxPos());
  });
  $('#pl-night').onclick = () => {
    const on = view.classList.toggle('night');
    prefs.set('playNight', on);
    $('#pl-night').setAttribute('aria-pressed', String(on));
  };

  // Tippen aufs Lied blendet die Leiste ein/aus; Bedienung in der Leiste verlängert sie.
  // Zweispaltig (dort lässt sich nicht scrollen): Tippen ins linke/rechte Drittel blättert.
  let swiped = false;
  scroller.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (swiped) {
      swiped = false;
      return;
    }
    if (cols) {
      const r = scroller.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      if (x < 0.3) return page(-1);
      if (x > 0.7) return page(1);
    }
    if (view.classList.contains('bar-hidden')) showBar(playing);
    else if (playing) view.classList.add('bar-hidden');
  });
  $('#pl-page-prev').onclick = () => page(-1);
  $('#pl-page-next').onclick = () => page(1);
  // Zweispaltig: waagerecht wischen blättert (nach links = weiter)
  let touchStart = null;
  scroller.addEventListener('pointerdown', (e) => {
    touchStart = cols && e.pointerType !== 'mouse' ? { x: e.clientX, y: e.clientY } : null;
  });
  scroller.addEventListener('pointerup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    swiped = true;
    setTimeout(() => (swiped = false), 400);
    page(dx < 0 ? 1 : -1);
  });
  scroller.addEventListener('pointercancel', () => (touchStart = null));
  // Zweispaltig: Mausrad/Touchpad blättert seitenweise (eine Seite je Dreh-Bewegung)
  let wheelSum = 0;
  let wheelBlockedUntil = 0;
  scroller.addEventListener('wheel', (e) => {
    if (!cols) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelBlockedUntil) {
      wheelBlockedUntil = now + 200; // Nachlauf des Touchpads abwarten
      return;
    }
    wheelSum += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(wheelSum) < 40) return;
    page(wheelSum > 0 ? 1 : -1);
    wheelSum = 0;
    wheelBlockedUntil = now + 450;
  }, { passive: false });
  $('#pl-bar').addEventListener('pointerdown', () => showBar(playing));
  // Von Hand scrollen hält das automatische Scrollen nicht an, verschiebt nur die Stelle
  scroller.addEventListener('wheel', () => (carry = 0), { passive: true });

  // Was die Tasten aus SHORTCUTS.play bewirken
  const KEY_ACTIONS = {
    pageDown: () => page(1),
    pageUp: () => page(-1),
    // Zweispaltig blättern →/← wie Bild↓/↑ – viele Bluetooth-Pedale senden die Pfeiltasten
    next: () => (cols ? page(1) : go(1)),
    prev: () => (cols ? page(-1) : go(-1)),
    toggle: () => setPlaying(!playing),
    bigger: () => setZoom(currentZoom() + 0.1),
    smaller: () => setZoom(currentZoom() - 0.1),
    faster: () => setSpeed(speed + 0.1),
    slower: () => setSpeed(speed - 0.1),
    metronome: toggleMetro,
    diagrams: toggleDiagrams,
    chords: () => toggleSetting('showChords'),
    harp: () => !$('#pl-harp').hidden && toggleSetting('showHarp'),
    tabs: () => !$('#pl-tabs').hidden && toggleSetting('showTabs'),
    columns: () => setCols(!cols),
    night: () => $('#pl-night').click(),
    exit: close,
  };
  // Erfassen vor allen anderen (capture), damit die Tasten der Hauptansicht nicht mitreagieren
  addEventListener('keydown', (e) => {
    if (view.hidden) return;
    const s = findShortcut(e, SHORTCUTS.play);
    if (!s) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    KEY_ACTIONS[s.id]();
  }, true);

  return { open, close, get isOpen() { return !view.hidden; } };
}
