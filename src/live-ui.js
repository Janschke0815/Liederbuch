// Live-Modus: Dialog (Vorsingen / Mitsingen), „LIVE“-Anzeige in der Kopfleiste, Mitsinger-Ansicht
// im Spielmodus. Verbindung und Verschlüsselung: live/live.js, live/live-crypto.js.
//
// Vorsinger: Jedes Lied, das er öffnet oder im Spielmodus zeigt (auch Änderungen und Tonart), geht an
// alle. Der Raum-Code bleibt beim Neuladen erhalten (sessionStorage 'liveLead').
// Mitsinger: Beitritt per Link „…#live=CODE“ (QR-Code) oder Code-Eingabe; das Lied erscheint im
// Spielmodus, mit eigener Zusatz-Tonart und „Übernehmen“ ins eigene Liederbuch.

import { LiveRoom } from './live/live.js';
import { newCode, normalizeCode, formatCode } from './live/live-crypto.js';
import { parseChordPro } from './core/chordpro.js';
import { readOnly, repo, services, state } from './ui/app-state.js';
import { $, closeOnBackdrop, toast } from './ui/dom.js';

const LEAD_KEY = 'liveLead';

/** Live-Modus einrichten (nach setupPlayMode, braucht services.play). */
export function setupLive() {
  const dlg = $('#live-dialog');
  let room = null;
  let offset = 0; // eigene Zusatz-Tonart als Mitsinger
  let lastSong = null; // zuletzt empfangene Lied-Nachricht (Mitsinger)

  const joinLink = (code) => `${location.href.split('#')[0]}#live=${code}`;

  function showSection(which) {
    for (const id of ['live-start', 'live-leading', 'live-waiting']) $(`#${id}`).hidden = id !== which;
    const stop = $('#live-stop');
    stop.hidden = which === 'live-start';
    stop.textContent = room?.role === 'lead' ? 'Live beenden' : 'Verlassen';
  }

  function statusText() {
    if (!room) return '';
    if (room.status === 'connecting') return 'Verbinde …';
    if (room.status === 'offline') return '⚠ Keine Verbindung – bitte Internet prüfen. Es wird weiter versucht.';
    if (room.role === 'lead') {
      const n = room.count || 0;
      return `Verbunden · ${n === 0 ? 'noch niemand dabei' : n === 1 ? '1 Mitsinger' : `${n} Mitsinger`}`;
    }
    return lastSong ? 'Verbunden' : 'Verbunden – warte auf das erste Lied des Vorsingers …';
  }

  function refresh() {
    $('#live-status').textContent = statusText();
    $('#live-wait-status').textContent = statusText();
    const pill = $('#live-pill');
    pill.hidden = !room;
    if (!room) return;
    pill.classList.toggle('offline', room.status !== 'online');
    $('#live-pill-text').textContent = room.role === 'lead' && room.count ? `LIVE · ${room.count}` : 'LIVE';
  }

  function listen(r) {
    r.addEventListener('status', refresh);
    r.addEventListener('listeners', (e) => {
      r.count = e.detail;
      refresh();
    });
  }

  /** Raum verlassen (Vorsinger: für alle beenden). */
  async function leave({ quiet = false } = {}) {
    const r = room;
    if (!r) return;
    room = null;
    lastSong = null;
    if (r.role === 'lead') sessionStorage.removeItem(LEAD_KEY);
    refresh();
    showSection('live-start');
    await r.stop();
    if (!quiet) toast(r.role === 'lead' ? 'Live-Modus beendet' : 'Live-Modus verlassen');
  }

  // ---------- Vorsingen ----------

  async function startLead(code = newCode()) {
    await leave({ quiet: true });
    room = new LiveRoom(code, 'lead');
    room.count = 0;
    listen(room);
    sessionStorage.setItem(LEAD_KEY, code);
    await room.start();
    renderLeading();
    sendCurrent();
    refresh();
  }

  async function renderLeading() {
    $('#live-code-show').textContent = formatCode(room.code);
    $('#live-share').hidden = !navigator.share;
    showSection('live-leading');
    // QR-Code-Paket erst beim Vorsingen laden (Mitsinger und alle anderen brauchen es nicht)
    const { default: qrcode } = await import('qrcode-generator');
    const qr = qrcode(0, 'M');
    qr.addData(joinLink(room.code));
    qr.make();
    $('#live-qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  $('#live-copy').onclick = async () => {
    const link = joinLink(room.code);
    try {
      await navigator.clipboard.writeText(link);
      toast('Link kopiert – z. B. in den Gruppen-Chat schicken');
    } catch {
      prompt('Link zum Beitreten:', link);
    }
  };
  $('#live-share').onclick = () => navigator.share({
    title: 'Liederbuch – live mitsingen',
    text: `Sing mit! Code ${formatCode(room.code)}`,
    url: joinLink(room.code),
  }).catch(() => {});

  /** Lied an alle (nur als Vorsinger). */
  const send = (s) => room?.role === 'lead' && s?.chordpro && room.sendSong(s);
  const songState = (s) => ({ chordpro: s.chordpro, transpose: s.transpose || 0, accidentals: s.accidentals || 'auto' });
  const sendCurrent = () => state.current && send(songState(state.current));

  addEventListener('songopened', () => !services.play.isOpen && sendCurrent());
  addEventListener('playsong', (e) => send(e.detail)); // Spielmodus, auch Setlisten mit eigener Tonart
  // Text oder Tonart geändert: kurz warten (Tippen), dann den frischen Stand schicken
  let changeTimer = 0;
  repo.addEventListener('change', () => {
    if (room?.role !== 'lead') return;
    clearTimeout(changeTimer);
    changeTimer = setTimeout(async () => {
      if (services.play.isOpen || !state.current) return;
      const fresh = await repo.get(state.current.id);
      if (fresh) send(songState(fresh));
    }, 700);
  });

  // ---------- Mitsingen ----------

  async function join(code) {
    await leave({ quiet: true });
    offset = 0;
    lastSong = null;
    const r = new LiveRoom(code, 'follow');
    room = r;
    listen(r);
    r.addEventListener('song', (e) => {
      lastSong = e.detail;
      if (dlg.open) dlg.close();
      showSong();
      refresh();
    });
    r.addEventListener('end', () => {
      toast('Der Vorsinger hat den Live-Modus beendet');
      services.play.liveEnded();
      if (room === r) {
        room = null;
        refresh();
        showSection('live-start');
      }
      r.stop();
    });
    showSection('live-waiting');
    if (!dlg.open) dlg.showModal();
    await r.start();
    refresh();
  }

  function showSong() {
    const m = lastSong;
    const { meta } = parseChordPro(m.song.chordpro);
    services.play.showLive({
      song: { chordpro: m.song.chordpro, title: meta.title, accidentals: m.accidentals },
      transpose: (m.transpose || 0) + offset,
    }, {
      offset,
      onLeave: () => leave(),
      onOffset: (d) => {
        offset = Math.max(-11, Math.min(11, offset + d));
        showSong();
      },
      onAdopt: adopt,
    });
  }

  async function adopt() {
    if (!lastSong) return;
    if (readOnly) {
      toast('Dieses Liederbuch ist nur zum Lesen – öffne ein eigenes, um Lieder zu übernehmen');
      return;
    }
    const { chordpro } = lastSong.song;
    const title = parseChordPro(chordpro).meta.title || 'Lied';
    if ((await repo.list()).some((s) => s.chordpro === chordpro)) {
      toast(`„${title}“ ist schon in deinem Liederbuch`);
      return;
    }
    await repo.create(chordpro, { transpose: lastSong.transpose || 0, accidentals: lastSong.accidentals || 'auto' });
    toast(`„${title}“ ist jetzt in deinem Liederbuch`);
  }

  // ---------- Dialog ----------

  function openDialog() {
    if (room?.role === 'lead') renderLeading();
    else showSection(room ? 'live-waiting' : 'live-start');
    refresh();
    dlg.showModal();
  }
  $('#btn-live').onclick = openDialog;
  $('#live-pill').onclick = openDialog;
  closeOnBackdrop('#live-dialog');

  $('#live-lead').onclick = () => startLead();
  const tryJoin = () => {
    const code = normalizeCode($('#live-code').value);
    if (!code) {
      toast('Bitte den 8-stelligen Code des Vorsingers eingeben (z. B. K7MQ-2XPA)');
      $('#live-code').focus();
      return;
    }
    join(code);
  };
  $('#live-join').onclick = tryJoin;
  $('#live-code').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); // sonst schließt das Formular den Dialog
    tryJoin();
  });
  $('#live-stop').onclick = () => {
    dlg.close();
    if (room?.role === 'follow' && services.play.isLive) services.play.close(); // ruft leave()
    else leave();
  };

  // ---------- Start: Beitritts-Link oder laufender Vorsinger-Raum ----------

  const fromHash = /^#live=([\w-]+)/i.exec(location.hash);
  if (fromHash) {
    history.replaceState(null, '', location.href.split('#')[0]);
    const code = normalizeCode(fromHash[1]);
    if (code) join(code);
    else toast('Der Live-Link ist unvollständig – bitte den Code von Hand eingeben');
  } else {
    const code = normalizeCode(sessionStorage.getItem(LEAD_KEY));
    // services.started setzt app.js erst nach setupLive() – darum einen Takt später darauf warten
    if (code) Promise.resolve().then(() => services.started).then(() => startLead(code)).then(() => toast('Live-Modus läuft weiter'));
  }
}
