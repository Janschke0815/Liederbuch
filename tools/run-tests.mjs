// Tests ohne Browserfenster: `npm test` (lokal und in der GitHub Action).
//
// Startet Vite, öffnet tests/index.html in einem kopflosen Chromium-Browser (Chrome, Chromium oder
// Edge – kein zusätzliches Paket nötig, gesteuert über das DevTools-Protokoll mit Node's WebSocket)
// und liest das Ergebnis aus window.__testResults. Danach eine Layout-Prüfung: Auf Handy-Breiten
// (320 und 375 px) darf die Kopfleiste nicht über den Rand ragen (wie in 2.2.1 passiert).
//
// Browser selbst wählen: CHROME_PATH=/pfad/zu/chrome npm test
// Exit-Code 1, wenn etwas fehlschlägt.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const TIMEOUT_MS = 120_000;
const CI = Boolean(process.env.GITHUB_ACTIONS);

/** In der GitHub Action: Fehler als Anmerkung (steht dann direkt am Lauf, ohne Log zu öffnen). */
function annotate(title, message) {
  if (!CI) return;
  const esc = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::error title=${esc(title).replace(/[:,]/g, ' ')}::${esc(message).slice(0, 4000)}`);
}

/** Pfad zu einem Chromium-Browser auf diesem Rechner. */
function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Kein Chrome/Chromium/Edge gefunden – Pfad mit CHROME_PATH angeben');
  return found;
}

/** Browser kopflos starten; liefert die WebSocket-Adresse der DevTools. */
function launch(exe, profile) {
  const args = [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-extensions',
    ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
    'about:blank',
  ];
  const proc = spawn(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const ws = new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`Browser startet nicht:\n${buf}`)), 30_000);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.on('exit', (code) => reject(new Error(`Browser beendet (${code}):\n${buf}`)));
  });
  return { proc, ws };
}

/** Minimaler DevTools-Client: send(method, params, sessionId) -> Ergebnis. */
async function connect(url) {
  const sock = new WebSocket(url);
  await new Promise((resolve, reject) => {
    sock.onopen = resolve;
    sock.onerror = () => reject(new Error('Keine Verbindung zum Browser'));
  });
  let next = 1;
  const waiting = new Map();
  sock.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    const w = msg.id && waiting.get(msg.id);
    if (!w) return;
    waiting.delete(msg.id);
    if (msg.error) w.reject(new Error(`${msg.error.message} (${w.method})`));
    else w.resolve(msg.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = next++;
    waiting.set(id, { resolve, reject, method });
    sock.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  return { send, close: () => sock.close() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Neue Seite; liefert Hilfen zum Laden und Auswerten. */
async function openPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => cdp.send(method, params, sessionId);
  await s('Runtime.enable');
  const evaluate = async (expression) => {
    const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  /** Warten, bis expression etwas liefert (oder Zeit um). */
  const waitFor = async (expression, ms = TIMEOUT_MS) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const v = await evaluate(expression).catch(() => null);
      if (v) return v;
      await sleep(250);
    }
    throw new Error(`Zeitüberschreitung beim Warten auf: ${expression}`);
  };
  return { s, evaluate, waitFor };
}

async function unitTests(page, base) {
  await page.s('Page.navigate', { url: `${base}tests/` });
  const r = await page.waitFor('window.__testResults');
  for (const f of r.failures) {
    console.log(`  ✘ ${f.suite} › ${f.test}\n      ${String(f.error).split('\n').join('\n      ')}`);
    annotate(`Test: ${f.suite} › ${f.test}`, f.error);
  }
  console.log(`Tests: ${r.passed} bestanden, ${r.failed} fehlgeschlagen`);
  return r.failed === 0;
}

/** Kopfleiste auf Handy-Breiten: nichts darf über den Rand ragen. */
async function layoutCheck(page, base) {
  let ok = true;
  for (const [width, name] of [[320, ''], [375, ''], [320, 'Lagerfeuerlieder vom Sommerfest']]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height: 740, deviceScaleFactor: 2, mobile: true });
    await page.s('Page.navigate', { url: base });
    await page.waitFor("document.querySelector('#book-select') && !document.querySelector('#book-select').hidden");
    await page.evaluate(`(() => {
      ${name ? `localStorage.setItem('personalName', ${JSON.stringify(name)});` : "localStorage.removeItem('personalName');"}
      location.reload();
    })()`);
    await sleep(500);
    await page.waitFor("document.querySelector('#book-select') && !document.querySelector('#book-select').hidden");
    await sleep(800); // Schriften, Breite der Auswahl
    const m = await page.evaluate(`(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect();
      return { vw: innerWidth, doc: document.documentElement.scrollWidth, menu: r('#btn-menu')?.right, cloud: r('#btn-cloud')?.right };
    })()`);
    const fits = m.doc <= m.vw && m.menu <= m.vw && m.cloud <= m.vw;
    console.log(`  ${fits ? '✔' : '✘'} Kopfleiste ${width} px${name ? ' (langer Name)' : ''}: Seite ${m.doc} px, Menü-Knopf endet bei ${Math.round(m.menu)} px`);
    if (!fits) {
      ok = false;
      annotate(`Kopfleiste ${width} px`, `Seite ${m.doc} px breit, Menü-Knopf endet bei ${Math.round(m.menu)} px (Fenster ${m.vw} px)`);
    }
  }
  await page.evaluate("localStorage.removeItem('personalName')");
  console.log(`Layout: ${ok ? 'passt' : 'ragt über den Rand'}`);
  return ok;
}

async function main() {
  const server = await createServer({ server: { port: 5190, strictPort: false }, logLevel: 'error' });
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const profile = mkdtempSync(join(tmpdir(), 'liederbuch-test-'));
  const exe = findBrowser();
  const { proc, ws } = launch(exe, profile);
  let ok = false;
  try {
    const cdp = await connect(await ws);
    const page = await openPage(cdp);
    await page.s('Page.enable');
    const unitOk = await unitTests(page, base);
    const layoutOk = await layoutCheck(page, base);
    ok = unitOk && layoutOk;
    cdp.close();
  } finally {
    proc.kill();
    await server.close();
    await sleep(300);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* Windows gibt das Profil manchmal etwas später frei */
    }
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  annotate('npm test abgebrochen', err.stack || err.message || err);
  process.exit(1);
});
