// Kleines ZIP-Modul ohne fremde Bibliothek.
//   createZip: Dateien unkomprimiert („stored“) einpacken – Textdateien sind klein, und so öffnet
//              jedes Programm (Windows-Explorer, macOS, Handy) die Datei.
//   readZip:   liest „stored“ und „deflate“ (so packen Windows, macOS und die meisten Programme),
//              entpackt mit DecompressionStream des Browsers.
// Dateinamen in UTF-8 (Kennzeichen gesetzt, damit Umlaute überall stimmen).

const enc = new TextEncoder();

let crcTable = null;
export function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Zeit im DOS-Format (lokale Zeit, 2-Sekunden-Schritte). */
function dosTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/**
 * @param {{name: string, data: string|Uint8Array, date?: Date}[]} files  Pfade mit „/“
 * @returns {Uint8Array}
 */
export function createZip(files, now = new Date()) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const { time, date } = dosTime(f.date || now);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true); // Version zum Entpacken
    local.setUint16(6, 0x0800, true); // Namen in UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);

    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Beginnt die Datei wie ein ZIP? */
export const isZip = (bytes) => bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;

function decodeName(bytes, utf8) {
  if (utf8) return new TextDecoder().decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes); // ältere Programme ohne UTF-8-Kennzeichen
  }
}

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Dieser Browser kann keine gepackten ZIP-Dateien öffnen');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<{name: string, data: Uint8Array}[]>}  nur Dateien, keine Ordner
 */
export async function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error('Keine gültige ZIP-Datei');
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP-Datei ist beschädigt');
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true); // gepackte Größe
    const size = view.getUint32(p + 24, true); // ungepackte Größe
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decodeName(bytes.subarray(p + 46, p + 46 + nameLen), flags & 0x0800);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue; // Ordner
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = bytes.subarray(start, start + compSize);
    let data;
    if (method === 0) data = raw.slice();
    else if (method === 8) data = await inflate(raw);
    else throw new Error(`„${name}“: Packverfahren ${method} wird nicht unterstützt`);
    if (data.length !== size) throw new Error(`„${name}“: ZIP-Datei ist beschädigt`);
    files.push({ name, data });
  }
  return files;
}
