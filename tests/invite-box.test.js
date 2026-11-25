import { describe, it, expect } from './runner.js';
import {
  clearInvite, fetchInvites, inviteBox, inviteTopic, normalizeEmail, postInvite, INVITE_MAX_AGE_MS,
} from '../src/sync/invite-box.js';
import { seal } from '../src/live/live-crypto.js';

/** Nachgebauter MQTT-Server: hebt „retain“-Nachrichten auf, versteht „+“ am Ende des Themas. */
function fakeBroker() {
  const retained = new Map();
  const clients = new Set();
  const matches = (filter, topic) => (filter.endsWith('/+')
    ? topic.startsWith(filter.slice(0, -1)) && !topic.slice(filter.length - 1).includes('/')
    : filter === topic);
  class Client extends EventTarget {
    constructor(url) {
      super();
      this.url = url;
      this.topics = new Set();
      this.state = 'closed';
    }

    connect() {
      clients.add(this);
      setTimeout(() => {
        this.state = 'open';
        this.dispatchEvent(new CustomEvent('state', { detail: 'open' }));
      }, 5);
    }

    subscribe(filter) {
      this.topics.add(filter);
      for (const [topic, payload] of retained) {
        if (matches(filter, topic)) this.dispatchEvent(new CustomEvent('message', { detail: { topic, payload, retain: true } }));
      }
    }

    publish(topic, payload, { retain = false } = {}) {
      if (retain) {
        if (payload.length) retained.set(topic, payload);
        else retained.delete(topic);
      }
      for (const c of clients) {
        if (c !== this && [...c.topics].some((f) => matches(f, topic))) {
          c.dispatchEvent(new CustomEvent('message', { detail: { topic, payload, retain: false } }));
        }
      }
      return true;
    }

    close() {
      clients.delete(this);
      this.state = 'closed';
    }
  }
  return { Client, retained };
}

const fast = (b) => ({ brokers: ['wss://a', 'wss://b'], Client: b.Client, waitMs: 200, lingerMs: 30 });

describe('Einladungs-Briefkasten', () => {
  it('E-Mail-Adresse vereinheitlicht (Gmail ohne Punkte und +Zusatz)', () => {
    expect([normalizeEmail(' Anna.Muster@GMail.com '), normalizeEmail('a.b+band@googlemail.com'), normalizeEmail('X.Y@gmx.de')])
      .toEqual(['annamuster@gmail.com', 'ab@gmail.com', 'x.y@gmx.de']);
  });

  it('Thema verrät weder Adresse noch Datei; gleiche Adresse → gleicher Briefkasten', async () => {
    const a = await inviteBox('Anna.Muster@gmail.com');
    const b = await inviteBox('annamuster@gmail.com');
    expect(a.base).toBe(b.base);
    expect(/^liederbuch\/invite\/[0-9a-f]{32}$/.test(a.base)).toBe(true);
    const t = await inviteTopic(a.base, 'file-123');
    expect(t.startsWith(`${a.base}/`) && !t.includes('file-123')).toBe(true);
  });

  it('ablegen, abholen, wegräumen – je Liederbuch eine Einladung, neueste zuerst', async () => {
    const broker = fakeBroker();
    expect(await postInvite({ email: 'anna@gmx.de', fileId: 'f1', name: 'Band', from: 'ben@x.de' }, fast(broker))).toBe(true);
    await postInvite({ email: 'ANNA@gmx.de', fileId: 'f2', name: 'Chor', from: 'ben@x.de', role: 'reader' }, fast(broker));
    await postInvite({ email: 'carl@gmx.de', fileId: 'f3', name: 'Fremd' }, fast(broker));
    const got = await fetchInvites(['anna@gmx.de'], fast(broker));
    expect(got.map((i) => [i.name, i.fileId, i.role, i.from])).toEqual([['Chor', 'f2', 'reader', 'ben@x.de'], ['Band', 'f1', 'writer', 'ben@x.de']]);
    expect(got[0].email).toBe('anna@gmx.de');
    await clearInvite('anna@gmx.de', 'f2', fast(broker));
    expect((await fetchInvites(['anna@gmx.de'], fast(broker))).map((i) => i.fileId)).toEqual(['f1']);
    expect(await fetchInvites([], fast(broker))).toEqual([]);
  });

  it('abgelaufene und fremde Nachrichten zählen nicht', async () => {
    const broker = fakeBroker();
    const { base, key } = await inviteBox('anna@gmx.de');
    broker.retained.set(await inviteTopic(base, 'alt'), await seal(key, { v: 1, t: 'invite', fileId: 'alt', name: 'Alt', at: Date.now() - INVITE_MAX_AGE_MS - 1 }));
    broker.retained.set(`${base}/kaputt`, new Uint8Array([1, 2, 3]));
    const other = await inviteBox('carl@gmx.de');
    broker.retained.set(`${base}/falscher-schluessel`, await seal(other.key, { v: 1, t: 'invite', fileId: 'x', at: Date.now() }));
    expect(await fetchInvites(['anna@gmx.de'], fast(broker))).toEqual([]);
  });

  it('kein Server erreichbar: ablegen meldet false', async () => {
    class Dead extends EventTarget {
      connect() {}
      close() {}
    }
    expect(await postInvite({ email: 'a@b.de', fileId: 'f', name: 'x' }, { brokers: ['wss://a'], Client: Dead, waitMs: 50, lingerMs: 0 })).toBe(false);
  });
});
