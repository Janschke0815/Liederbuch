// Spielmodus: Vollbild nur mit dem Lied, automatisches Scrollen, Bildschirm bleibt an,
// Blättern per Tastatur oder Bluetooth-Fußpedal (die senden Bild-/Pfeiltasten).
//
// Tasten: Bild↓/↓ weiterblättern (am Ende: nächstes Lied), Bild↑/↑ zurück, →/← Lied wechseln,
//         Leertaste/Enter Scrollen an/aus, +/− Schrift, </> Tempo, N Nachtmodus, Esc beenden

import { parseChordPro } from './core/chordpro.js';
import { renderSong } from './render/song-view.js';
import { applySettings, loadSettings } from './settings/settings.js';

const $ = (s) => document.querySelector(s);

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;
const SPEED_MIN = 0.2;
const SPEED_MAX = 5;
const DEFAULT_SECONDS = 180; // angenommene Liedlänge ohne {duration}
const BAR_HIDE_MS = 2500;

/** "3:20" oder "200" -> Sekunden */
export function durationSeconds(value) {
  const s = String(value || '').trim();
  const m = /^(\d+):(\d{1,2})$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

const fmtSpeed = (f) => `${f.toFixed(1).replace('.', ',')}×`;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function loadMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    return {};
  }
}

/**
 * @param {{repo, getSongIds: () => Promise<string[]>, onClose: (id: string) => void}} opts
 *   getSongIds: Reihenfolge zum Blättern (aktuelle Liste bzw. später Setliste)
 */
export function setupPlayMode({ repo, getSongIds, onClose }) {
  const view = $('#play-view');
  const scroller = $('#pl-scroll');
  const sheet = $('#pl-sheet');
  const toggleBtn = $('#pl-toggle');

  let ids = [];
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
  let zoom = Number(localStorage.getItem('playZoom')) || 0;

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
    if (zoom) view.style.setProperty('--play-zoom', zoom.toFixed(2));
    else view.style.removeProperty('--play-zoom');
  }

  function currentZoom() {
    return zoom || Number(getComputedStyle(view).getPropertyValue('--play-zoom')) || 1.3;
  }

  function setZoom(z) {
    const top = scroller.scrollTop / Math.max(1, scroller.scrollHeight);
    zoom = clamp(Math.round(z * 20) / 20, ZOOM_MIN, ZOOM_MAX);
    localStorage.setItem('playZoom', String(zoom));
    applyZoom();
    scroller.scrollTop = top * scroller.scrollHeight;
  }

  function speedKey() {
    return song?.id;
  }

  function setSpeed(f, persist = true) {
    speed = clamp(Math.round(f * 10) / 10, SPEED_MIN, SPEED_MAX);
    $('#pl-speed').textContent = fmtSpeed(speed);
    if (persist && speedKey()) {
      const map = loadMap('playSpeed');
      map[speedKey()] = speed;
      localStorage.setItem('playSpeed', JSON.stringify(map));
    }
  }

  async function show(i) {
    if (!ids.length) return;
    index = clamp(i, 0, ids.length - 1);
    song = await repo.get(ids[index]);
    if (!song) return;
    const parsed = parseChordPro(song.chordpro);
    meta = parsed.meta;
    applySettings(sheet, loadSettings());
    sheet.replaceChildren(renderSong(parsed, { transpose: song.transpose, accidentals: song.accidentals }));
    $('#pl-title').textContent = song.title || 'Ohne Titel';
    $('#pl-pos').textContent = ids.length > 1 ? `${index + 1} von ${ids.length}` : song.artist || '';
    $('#pl-prev').disabled = index === 0;
    $('#pl-next').disabled = index >= ids.length - 1;
    const next = index < ids.length - 1 ? await repo.get(ids[index + 1]) : null;
    const endBtn = $('#pl-next-end');
    endBtn.hidden = !next;
    endBtn.textContent = next ? `Nächstes Lied: ${next.title || 'Ohne Titel'} →` : '';
    setSpeed(loadMap('playSpeed')[song.id] || 1, false);
    scroller.scrollTop = 0;
    carry = 0;
    updateProgress();
  }

  // ---------- Automatisch scrollen ----------

  /** Grundgeschwindigkeit: Lied läuft in seiner Dauer (Standard 3 min) einmal durch. */
  function basePxPerSecond() {
    const end = $('.play-end');
    const content = scroller.scrollHeight - end.offsetHeight + scroller.clientHeight * 0.5;
    const travel = Math.max(200, content - scroller.clientHeight);
    const secs = durationSeconds(meta.duration) || DEFAULT_SECONDS;
    return travel / secs;
  }

  function maxScroll() {
    return scroller.scrollHeight - scroller.clientHeight;
  }

  function step(t) {
    if (!playing) return;
    const dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
    lastT = t;
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
    if (on) {
      lastT = 0;
      raf = requestAnimationFrame(step);
      showBar(true);
    } else {
      showBar(false);
    }
  }

  function updateProgress() {
    const max = maxScroll();
    $('#pl-progress').style.width = `${max > 0 ? (scroller.scrollTop / max) * 100 : 0}%`;
  }
  scroller.addEventListener('scroll', updateProgress, { passive: true });

  // ---------- Blättern ----------

  function page(dir) {
    const max = maxScroll();
    const atEnd = scroller.scrollTop >= max - 2;
    const atStart = scroller.scrollTop <= 2;
    if (dir > 0 && atEnd) return go(1);
    if (dir < 0 && atStart) return go(-1, { toEnd: true });
    // ein Bildschirm minus etwas Überlappung, damit keine Zeile verloren geht
    scroller.scrollBy({ top: dir * scroller.clientHeight * 0.82, behavior: 'smooth' });
  }

  async function go(delta, { toEnd = false } = {}) {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    const wasPlaying = playing;
    setPlaying(false);
    await show(target);
    if (toEnd) scroller.scrollTop = maxScroll();
    if (wasPlaying && delta > 0) showBar(false);
  }

  // ---------- Öffnen / Schließen ----------

  async function open(currentId) {
    ids = await getSongIds();
    if (!ids.length) return;
    view.hidden = false;
    view.classList.toggle('night', localStorage.getItem('playNight') === '1');
    $('#pl-night').setAttribute('aria-pressed', String(view.classList.contains('night')));
    applyZoom();
    await show(Math.max(0, ids.indexOf(currentId)));
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
    clearTimeout(hideTimer);
    view.hidden = true;
    wakeLock?.release().catch(() => {});
    wakeLock = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onClose?.(song?.id);
  }

  // ---------- Bedienelemente ----------

  $('#pl-exit').onclick = close;
  $('#pl-prev').onclick = () => go(-1);
  $('#pl-next').onclick = () => go(1);
  $('#pl-next-end').onclick = () => go(1);
  $('#pl-smaller').onclick = () => setZoom(currentZoom() - 0.1);
  $('#pl-bigger').onclick = () => setZoom(currentZoom() + 0.1);
  $('#pl-slower').onclick = () => setSpeed(speed - 0.1);
  $('#pl-faster').onclick = () => setSpeed(speed + 0.1);
  toggleBtn.onclick = () => setPlaying(!playing);
  $('#pl-night').onclick = () => {
    const on = view.classList.toggle('night');
    localStorage.setItem('playNight', on ? '1' : '');
    $('#pl-night').setAttribute('aria-pressed', String(on));
  };

  // Tippen aufs Lied blendet die Leiste ein/aus; Bedienung in der Leiste verlängert sie
  scroller.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (view.classList.contains('bar-hidden')) showBar(playing);
    else if (playing) view.classList.add('bar-hidden');
  });
  $('#pl-bar').addEventListener('pointerdown', () => showBar(playing));
  // Von Hand scrollen hält das automatische Scrollen nicht an, verschiebt nur die Stelle
  scroller.addEventListener('wheel', () => (carry = 0), { passive: true });

  addEventListener('keydown', (e) => {
    if (view.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    let handled = true;
    switch (e.key) {
      case 'PageDown':
      case 'ArrowDown':
        page(1);
        break;
      case 'PageUp':
      case 'ArrowUp':
        page(-1);
        break;
      case 'ArrowRight':
        go(1);
        break;
      case 'ArrowLeft':
        go(-1);
        break;
      case ' ':
      case 'Enter':
        setPlaying(!playing);
        break;
      case '+':
      case '=':
        setZoom(currentZoom() + 0.1);
        break;
      case '-':
        setZoom(currentZoom() - 0.1);
        break;
      case '>':
      case '.':
        setSpeed(speed + 0.1);
        break;
      case '<':
      case ',':
        setSpeed(speed - 0.1);
        break;
      case 'n':
      case 'N':
        $('#pl-night').click();
        break;
      case 'Escape':
        close();
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  return { open, close, get isOpen() { return !view.hidden; } };
}
