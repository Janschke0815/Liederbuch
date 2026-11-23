// Raum-Code und Verschlüsselung für den Live-Modus.
//
// Der Raum-Code (8 Zeichen, z. B. „K7MQ-2XPA“) ist zugleich das Geheimnis: Aus ihm werden das Thema
// auf dem Vermittlungs-Server und der AES-Schlüssel abgeleitet. Der Server sieht nur ein zufällig
// wirkendes Thema und verschlüsselte Bytes – weder Code noch Lied.

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // ohne 0/O, 1/I/L – gut abzutippen
const CODE_LEN = 8;
const SALT = new TextEncoder().encode('liederbuch-live-v1');
const ITERATIONS = 100_000; // bremst das Durchprobieren von Codes

/** Neuer zufälliger Raum-Code (8 Zeichen, ~40 Bit). */
export function newCode() {
  let code = '';
  const buf = new Uint8Array(1);
  while (code.length < CODE_LEN) {
    crypto.getRandomValues(buf);
    if (buf[0] < 248) code += ALPHABET[buf[0] % ALPHABET.length]; // 248 = 8·31: gleichverteilt
  }
  return code;
}

/** Eingabe säubern („k7mq 2xpa“, „K7MQ-2XPA“ → „K7MQ2XPA“); null, wenn es kein gültiger Code ist. */
export function normalizeCode(input) {
  const c = String(input || '').toUpperCase().replace(/[\s-]/g, '');
  return c.length === CODE_LEN && [...c].every((ch) => ALPHABET.includes(ch)) ? c : null;
}

/** „K7MQ2XPA“ → „K7MQ-2XPA“ */
export const formatCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Thema und Schlüssel zu einem Raum-Code.
 * @returns {Promise<{topic: string, key: CryptoKey}>}
 */
export async function deriveRoom(code) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: SALT, iterations: ITERATIONS }, base, 384,
  ));
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { topic: `liederbuch/live/${hex(bits.slice(32))}`, key };
}

/** Objekt verschlüsseln → Bytes (12 Byte Zufallswert + AES-GCM). */
export async function seal(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv, 0);
  out.set(ct, 12);
  return out;
}

/** Bytes entschlüsseln → Objekt; wirft bei falschem Schlüssel oder veränderten Daten. */
export async function unseal(key, bytes) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(plain));
}
