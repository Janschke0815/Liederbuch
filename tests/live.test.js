import { describe, it, expect } from './runner.js';
import {
  encodeLength, decodeLength, encodeConnect, encodeSubscribe, encodePublish, parsePackets, parsePublish,
} from '../src/live/mqtt.js';
import { newCode, normalizeCode, formatCode, deriveRoom, seal, unseal } from '../src/live/live-crypto.js';
import { isNewer } from '../src/live/live.js';

const bytes = (u8) => [...u8];

describe('Live: MQTT-Pakete', () => {
  it('Restlänge wie im Standard (0, 127, 128, 16383, 16384)', () => {
    expect(encodeLength(0)).toEqual([0]);
    expect(encodeLength(127)).toEqual([127]);
    expect(encodeLength(128)).toEqual([0x80, 1]);
    expect(encodeLength(16383)).toEqual([0xff, 0x7f]);
    expect(encodeLength(16384)).toEqual([0x80, 0x80, 1]);
    for (const n of [0, 5, 128, 300, 20000, 2_000_000]) expect(decodeLength(encodeLength(n), 0).value).toBe(n);
    expect(decodeLength([0x80], 0)).toBe(null); // unvollständig
  });

  it('CONNECT und SUBSCRIBE haben die richtigen Kopfbytes', () => {
    const c = encodeConnect('ab', 60);
    expect(bytes(c)).toEqual([0x10, 14, 0, 4, 77, 81, 84, 84, 4, 2, 0, 60, 0, 2, 97, 98]);
    const s = encodeSubscribe(1, 't');
    expect(bytes(s)).toEqual([0x82, 6, 0, 1, 0, 1, 116, 0]);
  });

  it('PUBLISH hin und zurück, auch mit retain und langer Nutzlast', () => {
    const payload = new Uint8Array(5000).map((_, i) => i % 251);
    const p = encodePublish('liederbuch/live/x', payload, true);
    expect(p[0]).toBe(0x31);
    const { packets, rest } = parsePackets(p);
    expect(packets.length).toBe(1);
    expect(rest.length).toBe(0);
    const msg = parsePublish(packets[0].flags, packets[0].body);
    expect(msg.topic).toBe('liederbuch/live/x');
    expect(msg.retain).toBe(true);
    expect(bytes(msg.payload)).toEqual(bytes(payload));
  });

  it('mehrere und halbe Pakete in einem Rahmen', () => {
    const a = encodePublish('a', new Uint8Array([1, 2]));
    const b = encodePublish('b', new Uint8Array([3]));
    const both = new Uint8Array([...a, ...b]);
    const first = parsePackets(both.subarray(0, a.length + 2));
    expect(first.packets.length).toBe(1);
    expect(first.rest.length).toBe(2); // Rest von b wartet auf mehr
    const second = parsePackets(new Uint8Array([...first.rest, ...both.subarray(a.length + 2)]));
    expect(parsePublish(second.packets[0].flags, second.packets[0].body).topic).toBe('b');
  });
});

describe('Live: Raum-Code', () => {
  it('neue Codes: 8 Zeichen ohne verwechselbare Zeichen', () => {
    for (let i = 0; i < 50; i++) {
      const c = newCode();
      expect(c.length).toBe(8);
      expect(/[01OIL]/.test(c)).toBe(false);
      expect(normalizeCode(c)).toBe(c);
    }
  });

  it('Eingabe säubern und prüfen', () => {
    expect(normalizeCode('k7mq-2xpa')).toBe('K7MQ2XPA');
    expect(normalizeCode(' K7MQ 2XPA ')).toBe('K7MQ2XPA');
    expect(normalizeCode('K7MQ2XP')).toBe(null);
    expect(normalizeCode('K7MQ2XP0')).toBe(null); // 0 gibt es nicht
    expect(formatCode('K7MQ2XPA')).toBe('K7MQ-2XPA');
  });
});

describe('Live: Verschlüsselung', () => {
  it('gleicher Code → gleiches Thema; Nachricht nur mit dem richtigen Code lesbar', async () => {
    const a = await deriveRoom('K7MQ2XPA');
    const b = await deriveRoom('K7MQ2XPA');
    const other = await deriveRoom('K7MQ2XPB');
    expect(a.topic).toBe(b.topic);
    expect(a.topic === other.topic).toBe(false);
    expect(a.topic.includes('K7MQ')).toBe(false); // Code steht nicht im Thema
    const sealed = await seal(a.key, { t: 'song', song: { chordpro: '{title: Hallo}\n[G]la' } });
    expect(new TextDecoder().decode(sealed).includes('Hallo')).toBe(false);
    expect((await unseal(b.key, sealed)).song.chordpro).toBe('{title: Hallo}\n[G]la');
    let failed = false;
    try {
      await unseal(other.key, sealed);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});

describe('Live: Reihenfolge', () => {
  it('doppelte und ältere Nachrichten werden verworfen', () => {
    const m1 = { from: 'a', seq: 1000 };
    expect(isNewer(null, m1)).toBe(true);
    expect(isNewer(m1, { from: 'a', seq: 1000 })).toBe(false); // vom zweiten Server
    expect(isNewer(m1, { from: 'a', seq: 999 })).toBe(false);
    expect(isNewer(m1, { from: 'a', seq: 1001 })).toBe(true);
    // Vorsinger hat neu geladen (neue ID): neuere Zeit wird angenommen
    expect(isNewer({ from: 'a', seq: 100_000 }, { from: 'b', seq: 100_500 })).toBe(true);
  });
});
