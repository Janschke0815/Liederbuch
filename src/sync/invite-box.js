// Einladungs-Briefkasten: Wer jemanden zu einem gemeinsamen Liederbuch (Google Drive) einlädt, legt
// zusätzlich eine kleine Nachricht auf den Vermittlungs-Servern des Live-Modus ab. Die App der
// eingeladenen Person schaut beim Start für ihre Google-Adresse(n) nach und zeigt die Einladung –
// ohne Link aus einer E-Mail. (Die Datei einmal in der Google-Auswahl bestätigen muss man trotzdem:
// Erst dann darf die App sie lesen.)
//
// Thema und Schlüssel kommen aus der E-Mail-Adresse (PBKDF2): Der Server sieht weder Adresse noch
// Liederbuch. Je Liederbuch ein eigenes Unterthema, aufgehoben mit „retain“; abgeholt wird mit „+“.
// Wer die Adresse kennt, kann die Nachricht lesen – darin stehen nur Name, Absender und Datei-ID.
//
//   Thema liederbuch/invite/<aus E-Mail>/<aus Datei-ID>
//   Nachricht (verschlüsselt) { v: 1, t: 'invite', fileId, name, from, role, at }

import { MqttClient } from '../live/mqtt.js';
import { BROKERS } from '../live/live.js';
import { seal, unseal } from '../live/live-crypto.js';

const SALT = new TextEncoder().encode('liederbuch-invite-v1');
const ITERATIONS = 100_000;
/** Einladungen älter als das werden nicht mehr gezeigt (und weggeräumt). */
export const INVITE_MAX_AGE_MS = 60 * 24 * 3600 * 1000;

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/** E-Mail-Adresse vereinheitlichen (Groß/Klein, Leerzeichen; bei Gmail ohne Punkte im Namen). */
export function normalizeEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  const m = /^([^@]+)@(gmail\.com|googlemail\.com)$/.exec(e);
  return m ? `${m[1].replace(/\./g, '').replace(/\+.*$/, '')}@gmail.com` : e;
}

/**
 * Briefkasten einer Adresse: Themen-Anfang und Schlüssel.
 * @param {string} email
 * @returns {Promise<{base: string, key: CryptoKey}>}
 */
export async function inviteBox(email) {
  const raw = new TextEncoder().encode(normalizeEmail(email));
  const base = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: SALT, iterations: ITERATIONS }, base, 384,
  ));
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { base: `liederbuch/invite/${hex(bits.slice(32))}`, key };
}

/** Unterthema für ein Liederbuch (aus der Datei-ID, damit der Server sie nicht sieht). */
export async function inviteTopic(base, fileId) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`invite:${fileId}`)));
  return `${base}/${hex(h.slice(0, 12))}`;
}

/**
 * Mit allen Servern verbinden, fn für jede offene Verbindung ausführen, dann trennen.
 * @param {(client: MqttClient) => void} fn
 * @param {{brokers?: string[], waitMs?: number, lingerMs?: number, Client?: typeof MqttClient}} opts
 *   waitMs: so lange auf Verbindungen warten; lingerMs: danach noch offen bleiben (Nachrichten empfangen)
 * @returns {Promise<number>}  Anzahl erreichter Server
 */
export async function withBrokers(fn, { brokers = BROKERS, waitMs = 6000, lingerMs = 400, Client = MqttClient } = {}) {
  const clients = brokers.map((url) => new Client(url));
  let reached = 0;
  await Promise.all(clients.map((c) => new Promise((resolve) => {
    const timer = setTimeout(resolve, waitMs);
    c.addEventListener('state', (e) => {
      if (e.detail !== 'open') return;
      clearTimeout(timer);
      reached++;
      fn(c);
      resolve();
    });
    c.connect();
  })));
  await new Promise((r) => setTimeout(r, lingerMs));
  for (const c of clients) c.close();
  return reached;
}

/**
 * Einladung in den Briefkasten der eingeladenen Person legen.
 * @param {{email: string, fileId: string, name: string, from?: string, role?: string}} invite
 * @param {object} [opts]  wie withBrokers
 * @returns {Promise<boolean>}  mindestens ein Server hat sie angenommen
 */
export async function postInvite({ email, fileId, name, from = '', role = 'writer' }, opts = {}) {
  const { base, key } = await inviteBox(email);
  const topic = await inviteTopic(base, fileId);
  const data = await seal(key, { v: 1, t: 'invite', fileId, name, from, role, at: Date.now() });
  const reached = await withBrokers((c) => c.publish(topic, data, { retain: true }), opts);
  return reached > 0;
}

/**
 * Einladung wegräumen (angenommen, abgelehnt oder zurückgenommen).
 * @param {string} email
 * @param {string} fileId
 * @param {object} [opts]  wie withBrokers
 */
export async function clearInvite(email, fileId, opts = {}) {
  const { base } = await inviteBox(email);
  const topic = await inviteTopic(base, fileId);
  await withBrokers((c) => c.publish(topic, new Uint8Array(0), { retain: true }), opts);
}

/**
 * Briefkästen nachsehen.
 * @param {string[]} emails  eigene Google-Adressen auf diesem Gerät
 * @param {object} [opts]  wie withBrokers (lingerMs: wie lange auf aufgehobene Nachrichten gewartet wird)
 * @returns {Promise<{email: string, fileId: string, name: string, from: string, role: string, at: number}[]>}
 *   neueste zuerst, je Liederbuch einmal, ohne abgelaufene
 */
export async function fetchInvites(emails, opts = {}) {
  const boxes = await Promise.all([...new Set(emails.map(normalizeEmail).filter(Boolean))]
    .map(async (email) => ({ email, ...(await inviteBox(email)) })));
  if (!boxes.length) return [];
  const found = new Map();
  const pending = [];
  const onMessage = (e) => {
    const { topic, payload } = e.detail;
    const box = boxes.find((b) => topic.startsWith(`${b.base}/`));
    if (!box || !payload.length) return;
    pending.push(unseal(box.key, payload).then((msg) => {
      if (msg?.v !== 1 || msg.t !== 'invite' || !msg.fileId) return;
      if (!(Date.now() - msg.at < INVITE_MAX_AGE_MS)) return;
      const old = found.get(msg.fileId);
      if (!old || old.at < msg.at) found.set(msg.fileId, { email: box.email, ...msg });
    }).catch(() => {}));
  };
  await withBrokers((c) => {
    c.addEventListener('message', onMessage);
    for (const b of boxes) c.subscribe(`${b.base}/+`);
  }, { lingerMs: 2500, ...opts });
  await Promise.all(pending);
  return [...found.values()]
    .sort((a, b) => b.at - a.at)
    .map(({ email, fileId, name, from, role, at }) => ({ email, fileId, name: String(name || ''), from: String(from || ''), role: role || 'writer', at }));
}
