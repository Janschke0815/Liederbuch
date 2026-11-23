// Live-Raum: Der Vorsinger schickt das aktuelle Lied (Text + Tonart), alle Mitsinger bekommen es.
//
// Transport: öffentliche MQTT-Server (zwei parallel, falls einer ausfällt). Die letzte Lied-Nachricht
// wird dort aufgehoben („retain“), so sehen später Dazukommende sofort das aktuelle Lied.
// Alles ist mit dem Schlüssel aus dem Raum-Code verschlüsselt (live-crypto.js).
//
// Nachrichten (verschlüsselt):
//   Thema <topic>     { v: 1, t: 'song', from, seq, song: { chordpro }, transpose, accidentals }
//                     { v: 1, t: 'end', from, seq }
//   Thema <topic>/p   { v: 1, t: 'here', from }   Mitsinger melden sich alle 20 s (Zähler beim Vorsinger)

import { MqttClient } from './mqtt.js';
import { deriveRoom, seal, unseal } from './live-crypto.js';

/** Öffentliche Vermittlungs-Server (WebSocket über TLS). */
export const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];

const HERE_EVERY_MS = 20_000;
const HERE_VALID_MS = 50_000;

/**
 * Ist msg neuer als die zuletzt angenommene Nachricht? (Beide Server liefern jede Nachricht.)
 * Gleicher Absender: höhere Nummer. Anderer Absender (Vorsinger hat neu geladen): späterer Zeitpunkt.
 * @param {{from: string, seq: number} | null} last
 */
export function isNewer(last, msg) {
  if (!last) return true;
  if (msg.from === last.from) return msg.seq > last.seq;
  return msg.seq > last.seq - 60_000; // seq ist ein Zeitstempel in ms; kleine Uhrabweichungen erlauben
}

/**
 * Raum betreten. role 'lead': senden; 'follow': empfangen.
 * Ereignisse: 'status' (detail: 'connecting' | 'online' | 'offline'), 'song' (detail: Nachricht),
 *             'end', 'listeners' (detail: Anzahl Mitsinger, nur beim Vorsinger)
 */
export class LiveRoom extends EventTarget {
  /** @param {string} code  Raum-Code (normalisiert) */
  constructor(code, role, { brokers = BROKERS } = {}) {
    super();
    this.code = code;
    this.role = role;
    this.brokers = brokers;
    this.id = crypto.randomUUID().slice(0, 8);
    this.clients = [];
    this.last = null; // zuletzt gesendete (lead) bzw. angenommene (follow) Lied-Nachricht
    this.seq = 0;
    this.listeners = new Map(); // Mitsinger-ID -> zuletzt gesehen
    this.status = 'connecting';
    this.timers = [];
  }

  /** Verbinden. */
  async start() {
    const { topic, key } = await deriveRoom(this.code);
    this.topic = topic;
    this.key = key;
    for (const url of this.brokers) {
      const c = new MqttClient(url);
      c.addEventListener('state', (e) => {
        if (e.detail === 'open') this.#onOpen(c);
        this.#updateStatus();
      });
      c.addEventListener('message', (e) => this.#onMessage(e.detail));
      c.subscribe(this.role === 'lead' ? `${topic}/p` : topic);
      c.connect();
      this.clients.push(c);
    }
    if (this.role === 'follow') this.timers.push(setInterval(() => this.#sayHere(), HERE_EVERY_MS));
    else this.timers.push(setInterval(() => this.#countListeners(), 10_000));
    // Handy wieder wach oder Netz zurück: nicht bis zum nächsten Versuch warten
    this.wake = () => !document.hidden && this.clients.forEach((c) => c.retryNow());
    addEventListener('online', this.wake);
    document.addEventListener('visibilitychange', this.wake);
  }

  #updateStatus() {
    const s = this.clients.some((c) => c.state === 'open') ? 'online'
      : this.clients.some((c) => c.state === 'connecting') ? 'connecting' : 'offline';
    if (s === this.status) return;
    this.status = s;
    this.dispatchEvent(new CustomEvent('status', { detail: s }));
  }

  async #onOpen(client) {
    // Vorsinger: nach (Neu-)Verbindung das aktuelle Lied wieder hinterlegen
    if (this.role === 'lead' && this.last) client.publish(this.topic, await seal(this.key, this.last), { retain: true });
    if (this.role === 'follow') this.#sayHere(client);
  }

  async #sayHere(only) {
    const data = await seal(this.key, { v: 1, t: 'here', from: this.id });
    for (const c of only ? [only] : this.clients) c.publish(`${this.topic}/p`, data);
  }

  #countListeners() {
    const now = Date.now();
    for (const [id, at] of this.listeners) if (now - at > HERE_VALID_MS) this.listeners.delete(id);
    this.dispatchEvent(new CustomEvent('listeners', { detail: this.listeners.size }));
  }

  async #onMessage({ topic, payload }) {
    if (!payload.length) return; // gelöschte aufgehobene Nachricht
    let msg;
    try {
      msg = await unseal(this.key, payload);
    } catch {
      return; // nicht für uns (oder verändert)
    }
    if (msg?.v !== 1) return;
    if (this.role === 'lead') {
      if (topic.endsWith('/p') && msg.t === 'here' && msg.from) {
        const isNew = !this.listeners.has(msg.from);
        this.listeners.set(msg.from, Date.now());
        if (isNew) this.#countListeners();
      }
      return;
    }
    if (msg.t !== 'song' && msg.t !== 'end') return;
    if (!isNewer(this.last, msg)) return;
    this.last = msg;
    this.dispatchEvent(new CustomEvent(msg.t, { detail: msg }));
  }

  #nextSeq() {
    this.seq = Math.max(this.seq + 1, Date.now());
    return this.seq;
  }

  /**
   * Vorsinger: Lied an alle schicken (wird auf den Servern für Nachzügler aufgehoben).
   * @param {{chordpro: string, transpose?: number, accidentals?: string}} s
   */
  async sendSong({ chordpro, transpose = 0, accidentals = 'auto' }) {
    if (this.last?.song?.chordpro === chordpro && this.last.transpose === transpose && this.last.accidentals === accidentals) return;
    this.last = { v: 1, t: 'song', from: this.id, seq: this.#nextSeq(), song: { chordpro }, transpose, accidentals };
    const data = await seal(this.key, this.last);
    for (const c of this.clients) c.publish(this.topic, data, { retain: true });
  }

  /** Raum verlassen; der Vorsinger beendet ihn für alle. */
  async stop() {
    for (const t of this.timers) clearInterval(t);
    removeEventListener('online', this.wake);
    document.removeEventListener('visibilitychange', this.wake);
    if (this.role === 'lead') {
      const data = await seal(this.key, { v: 1, t: 'end', from: this.id, seq: this.#nextSeq() });
      for (const c of this.clients) {
        c.publish(this.topic, data);
        c.publish(this.topic, new Uint8Array(0), { retain: true }); // aufgehobenes Lied löschen
      }
      await new Promise((r) => setTimeout(r, 300)); // Nachrichten noch hinausgehen lassen
    }
    for (const c of this.clients) c.close();
    this.clients = [];
  }
}
