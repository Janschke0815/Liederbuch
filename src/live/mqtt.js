// Kleiner MQTT-3.1.1-Client über WebSocket – genau so viel, wie der Live-Modus braucht:
// verbinden, abonnieren, senden (QoS 0, optional „retain“ = Server hebt die letzte Nachricht auf),
// Lebenszeichen und automatisches Neuverbinden. Eine fertige Bibliothek wäre rund zehnmal so groß.
//
// Die Paket-Funktionen (encode…/parse…) sind rein und getestet (tests/live.test.js).

const enc = new TextEncoder();
const dec = new TextDecoder();

const TYPE = { CONNECT: 1, CONNACK: 2, PUBLISH: 3, SUBSCRIBE: 8, SUBACK: 9, PINGREQ: 12, PINGRESP: 13, DISCONNECT: 14 };

/** Restlänge als MQTT-Zahl (7 Bit je Byte, oberstes Bit = es folgt noch eins). */
export function encodeLength(n) {
  const out = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    out.push(b);
  } while (n > 0);
  return out;
}

/** Restlänge lesen; null, wenn die Bytes dafür noch nicht da sind. */
export function decodeLength(bytes, offset) {
  let value = 0;
  let mult = 1;
  for (let i = 0; i < 4; i++) {
    if (offset + i >= bytes.length) return null;
    const b = bytes[offset + i];
    value += (b & 0x7f) * mult;
    if (!(b & 0x80)) return { value, size: i + 1 };
    mult *= 128;
  }
  throw new Error('MQTT: ungültige Länge');
}

const str = (s) => {
  const b = enc.encode(s);
  return [b.length >> 8, b.length & 0xff, ...b];
};

function packet(first, body) {
  const out = new Uint8Array(1 + encodeLength(body.length).length + body.length);
  const len = encodeLength(body.length);
  out[0] = first;
  out.set(len, 1);
  out.set(body, 1 + len.length);
  return out;
}

/** CONNECT mit „clean session“. */
export function encodeConnect(clientId, keepAlive = 60) {
  return packet(TYPE.CONNECT << 4, [...str('MQTT'), 4, 0x02, keepAlive >> 8, keepAlive & 0xff, ...str(clientId)]);
}

/** SUBSCRIBE auf ein Thema (QoS 0). */
export function encodeSubscribe(packetId, topic) {
  return packet((TYPE.SUBSCRIBE << 4) | 0x02, [packetId >> 8, packetId & 0xff, ...str(topic), 0]);
}

/** PUBLISH (QoS 0); payload: Uint8Array. Leere Nutzlast mit retain löscht die aufgehobene Nachricht. */
export function encodePublish(topic, payload, retain = false) {
  const t = str(topic);
  const body = new Uint8Array(t.length + payload.length);
  body.set(t, 0);
  body.set(payload, t.length);
  return packet((TYPE.PUBLISH << 4) | (retain ? 1 : 0), body);
}

export const PINGREQ = new Uint8Array([TYPE.PINGREQ << 4, 0]);
export const DISCONNECT = new Uint8Array([TYPE.DISCONNECT << 4, 0]);

/**
 * Vollständige Pakete aus einem Puffer lösen (ein WebSocket-Rahmen kann mehrere oder halbe enthalten).
 * @returns {{packets: {type: number, flags: number, body: Uint8Array}[], rest: Uint8Array}}
 */
export function parsePackets(buf) {
  const packets = [];
  let pos = 0;
  while (pos + 2 <= buf.length) {
    const len = decodeLength(buf, pos + 1);
    if (!len) break;
    const start = pos + 1 + len.size;
    const end = start + len.value;
    if (end > buf.length) break;
    packets.push({ type: buf[pos] >> 4, flags: buf[pos] & 0x0f, body: buf.subarray(start, end) });
    pos = end;
  }
  return { packets, rest: buf.slice(pos) };
}

/** PUBLISH-Inhalt (QoS 0 oder 1/2 – die Paket-ID wird übersprungen). */
export function parsePublish(flags, body) {
  const tlen = (body[0] << 8) | body[1];
  const topic = dec.decode(body.subarray(2, 2 + tlen));
  const qos = (flags >> 1) & 3;
  const start = 2 + tlen + (qos ? 2 : 0);
  return { topic, payload: body.slice(start), retain: Boolean(flags & 1) };
}

/**
 * Verbindung zu einem MQTT-Server über WebSocket, verbindet sich bei Abbruch selbst neu.
 * Ereignisse: 'state' (detail: 'connecting' | 'open' | 'closed'), 'message' (detail: {topic, payload, retain}).
 */
export class MqttClient extends EventTarget {
  /** @param {string} url  z. B. wss://broker.example.org:8884/mqtt */
  constructor(url, { clientId = `lb-${Math.random().toString(36).slice(2, 12)}`, keepAlive = 60 } = {}) {
    super();
    this.url = url;
    this.clientId = clientId;
    this.keepAlive = keepAlive;
    this.state = 'closed';
    this.topics = new Set();
    this.ws = null;
    this.buf = new Uint8Array(0);
    this.nextId = 1;
    this.retry = 0;
    this.stopped = true;
    this.timers = {};
  }

  #setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.dispatchEvent(new CustomEvent('state', { detail: s }));
  }

  /** Verbinden (und bei Abbruch selbst wieder verbinden, bis close()). */
  connect() {
    this.stopped = false;
    this.#open();
  }

  #open() {
    clearTimeout(this.timers.retry);
    this.#setState('connecting');
    let ws;
    try {
      ws = new WebSocket(this.url, 'mqtt');
    } catch {
      this.#scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => ws.send(encodeConnect(this.clientId, this.keepAlive));
    ws.onmessage = (e) => this.#receive(new Uint8Array(e.data));
    ws.onclose = () => {
      if (this.ws !== ws) return;
      clearInterval(this.timers.ping);
      this.ws = null;
      this.buf = new Uint8Array(0);
      this.#setState('closed');
      if (!this.stopped) this.#scheduleRetry();
    };
    ws.onerror = () => ws.close();
  }

  #scheduleRetry() {
    const wait = Math.min(15000, 1000 * 2 ** this.retry++);
    this.timers.retry = setTimeout(() => !this.stopped && this.#open(), wait);
  }

  #receive(chunk) {
    const all = new Uint8Array(this.buf.length + chunk.length);
    all.set(this.buf, 0);
    all.set(chunk, this.buf.length);
    const { packets, rest } = parsePackets(all);
    this.buf = rest;
    for (const p of packets) {
      if (p.type === TYPE.CONNACK) {
        if (p.body[1] !== 0) {
          this.ws?.close();
          continue;
        }
        this.retry = 0;
        this.#setState('open');
        for (const t of this.topics) this.ws.send(encodeSubscribe(this.#id(), t));
        clearInterval(this.timers.ping);
        this.timers.ping = setInterval(() => this.ws?.readyState === 1 && this.ws.send(PINGREQ), (this.keepAlive * 1000) / 2);
      } else if (p.type === TYPE.PUBLISH) {
        this.dispatchEvent(new CustomEvent('message', { detail: parsePublish(p.flags, p.body) }));
      }
    }
  }

  #id() {
    this.nextId = (this.nextId % 65535) + 1;
    return this.nextId;
  }

  /** Abgebrochene Verbindung sofort neu versuchen (z. B. Handy wieder wach, Netz wieder da). */
  retryNow() {
    if (this.stopped || this.state !== 'closed') return;
    this.retry = 0;
    this.#open();
  }

  /** Thema abonnieren (gilt auch nach jedem Neuverbinden). */
  subscribe(topic) {
    this.topics.add(topic);
    if (this.state === 'open') this.ws.send(encodeSubscribe(this.#id(), topic));
  }

  /** Senden; ohne Verbindung wird nichts gepuffert (false). */
  publish(topic, payload, { retain = false } = {}) {
    if (this.state !== 'open') return false;
    this.ws.send(encodePublish(topic, payload, retain));
    return true;
  }

  /** Verbindung beenden (kein Neuverbinden mehr). */
  close() {
    this.stopped = true;
    clearTimeout(this.timers.retry);
    clearInterval(this.timers.ping);
    const ws = this.ws;
    this.ws = null;
    if (ws?.readyState === 1) ws.send(DISCONNECT);
    ws?.close();
    this.#setState('closed');
  }
}
