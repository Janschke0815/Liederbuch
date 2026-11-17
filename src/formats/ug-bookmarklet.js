// Lesezeichen „Ins Liederbuch“ (Bookmarklet): läuft auf der Ultimate-Guitar-Seite, die man
// gerade selbst ansieht, liest Titel, Interpret, Capo, Tonart, Stimmung, Tempo und den Liedtext
// aus und öffnet das Liederbuch mit dem Einfügen-Dialog (Daten in der Adresse hinter #ug=,
// sie gehen an keinen Server). Es wird nichts automatisch abgerufen – wie Kopieren und
// Einfügen, nur ohne Handarbeit.
//
// Das Lesezeichen selbst sammelt nur Rohdaten; die Umwandlung in Einfügetext passiert hier in
// der App (ugDataToText). So wirken Verbesserungen sofort, ohne das Lesezeichen neu anzulegen.

/**
 * Läuft als Lesezeichen auf der fremden Seite. Muss für sich allein lauffähig sein (wird als
 * Text eingebettet): keine Importe, keine Kommentare im Rumpf, jede Anweisung mit Semikolon.
 */
function liederbuchBookmarklet(app) {
  var d = {};
  try {
    var p = window.UGAPP && window.UGAPP.store && window.UGAPP.store.page && window.UGAPP.store.page.data;
    if (!p) {
      var js = document.querySelector('.js-store');
      if (js) p = JSON.parse(js.getAttribute('data-content')).store.page.data;
    }
    var t = (p && p.tab) || {};
    var v = (p && p.tab_view) || {};
    if (v.wiki_tab && v.wiki_tab.content) {
      var m = v.meta || {};
      var s = (v.strummings || [])[0] || {};
      d = {
        title: t.song_name, artist: t.artist_name, type: t.type, capo: m.capo,
        key: m.tonality || t.tonality_name, tuning: m.tuning && m.tuning.value,
        bpm: s.bpm, content: v.wiki_tab.content,
      };
    }
  } catch (e) {
    d = {};
  }
  if (!d.content) {
    var sel = String(window.getSelection() || '');
    if (sel.trim()) d = { content: sel };
    else {
      var pres = [].slice.call(document.querySelectorAll('pre')).sort(function (a, b) {
        return b.innerText.length - a.innerText.length;
      });
      if (pres[0] && pres[0].innerText.trim().length > 40) d = { content: pres[0].innerText };
    }
    var mt = /^(.*?)\s+(?:ukulele\s+)?(?:chords|tabs?)\s+by\s+(.*?)(?:\s+@.*)?$/i.exec(document.title);
    if (d.content && mt) {
      d.title = mt[1];
      d.artist = mt[2];
    }
  }
  if (d.content && !d.title) d.page = document.title;
  if (!d.content) {
    alert('Liederbuch: Hier wurde kein Lied gefunden. Öffne ein Lied auf Ultimate Guitar oder markiere den Liedtext und tippe dann noch einmal auf das Lesezeichen.');
    return;
  }
  var w = window.open(app + '#ug=' + encodeURIComponent(JSON.stringify(d)), 'liederbuch');
  if (!w) location.href = app + '#ug=' + encodeURIComponent(JSON.stringify(d));
}

/** Adresse "javascript:…" für das Lesezeichen, das die App unter appUrl öffnet. */
export function bookmarkletHref(appUrl) {
  const code = `(${liederbuchBookmarklet.toString()})(${JSON.stringify(appUrl)})`
    .replace(/\s*\n\s*/g, ' ') // eine Zeile: Lesezeichen-Adressen vertragen keine Umbrüche
    .replace(/\s{2,}/g, ' ');
  return 'javascript:' + encodeURIComponent(code);
}

const MAX = 300000; // Schutz vor riesigen Adressen

/** Daten aus der Adresse (#ug=…) lesen; null, wenn keine oder unbrauchbar. */
export function readUgHash(hash) {
  const m = /^#ug=(.*)$/s.exec(String(hash || ''));
  if (!m || m[1].length > MAX) return null;
  try {
    const d = JSON.parse(decodeURIComponent(m[1]));
    return d && typeof d === 'object' && typeof d.content === 'string' && d.content.trim() ? d : null;
  } catch {
    return null;
  }
}

const clean = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();

const CH = /\[ch\]([\s\S]*?)\[\/ch\]/gi;

/** Zeile mit Akkorden mitten im Text -> Akkordzeile über der Textzeile (gleiche Spalten). */
function inlineToChordLine(line) {
  let text = '';
  let chords = '';
  let last = 0;
  for (const m of line.matchAll(CH)) {
    text += line.slice(last, m.index);
    last = m.index + m[0].length;
    if (chords.length > text.length) text = text.padEnd(chords.length); // Akkorde nicht überlappen
    chords = chords.padEnd(text.length) + m[1].trim() + ' ';
  }
  text += line.slice(last);
  return chords.replace(/\s+$/, '') + '\n' + text;
}

/**
 * Ultimate-Guitar-Markierungen entfernen: [tab]…[/tab] weg, [ch]C[/ch] -> C. Normalerweise
 * steht eine Akkordzeile über dem Text; stehen Akkorde mitten im Text, wird daraus ebenfalls
 * eine Akkordzeile darüber.
 */
export function stripUgMarkup(content) {
  return String(content)
    .replace(/\r\n?/g, '\n')
    .replace(/\[\/?tab\]/gi, '')
    .split('\n')
    .map((line) => {
      if (!/\[ch\]/i.test(line)) return line;
      const rest = line.replace(CH, '');
      return /\p{L}{2,}/u.test(rest) ? inlineToChordLine(line) : line.replace(CH, '$1');
    })
    .join('\n');
}

/**
 * Titel und Interpret aus dem Seitentitel anderer Seiten, z. B. harptabs.com:
 * „Heart Of Gold (w/lyrics & chords) by Neil Young · Harptabs“ -> {title: 'Heart Of Gold', artist: 'Neil Young'}.
 * Zusätze wie „(w/lyrics & chords)“ oder „(Full Song)“ fallen weg.
 * @returns {{title: string, artist: string} | null}
 */
export function titleFromPage(pageTitle) {
  const m = /^(.*?)\s+by\s+(.+?)\s+[·|–—-]\s+[^·|–—]+$/i.exec(clean(pageTitle));
  if (!m) return null;
  const title = m[1].replace(/\s*\((?:w\/|with\b|[^)]*\b(?:lyrics|chords|tabs?|full song|complete|updated)\b)[^)]*\)/gi, '').trim();
  return title ? { title, artist: m[2].trim() } : null;
}

/** Rohdaten des Lesezeichens -> Text für den Einfügen-Dialog (mit Kopfzeilen für Titel usw.). */
export function ugDataToText(d) {
  if (!clean(d.title) && d.page) d = { ...d, ...titleFromPage(d.page) };
  const head = [];
  if (clean(d.title)) head.push(`Title: ${clean(d.title)}`);
  if (clean(d.artist)) head.push(`Artist: ${clean(d.artist)}`);
  const capo = Number(d.capo);
  if (Number.isInteger(capo) && capo > 0 && capo < 20) head.push(`Capo: ${capo}`);
  if (/^[A-G][#b]?m?$/.test(clean(d.key))) head.push(`Key: ${clean(d.key)}`);
  const bpm = Number(d.bpm);
  if (Number.isFinite(bpm) && bpm >= 30 && bpm <= 300) head.push(`Tempo: ${Math.round(bpm)}`);
  const tuning = clean(d.tuning);
  if (tuning && !/^E A D G B E$/i.test(tuning)) head.push(`Tuning: ${tuning}`);
  const body = stripUgMarkup(d.content).replace(/^\n+/, '');
  return (head.length ? head.join('\n') + '\n\n' : '') + body;
}
