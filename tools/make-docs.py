"""API-Dokumentation aus den JSDoc-Kommentaren erzeugen (ähnlich Doxygen, aber für JavaScript).

    python tools/make-docs.py          erzeugt docs/api/ neu
    python tools/make-docs.py --check  meldet nur, was nicht dokumentiert ist (Rückgabe 1, wenn etwas fehlt)

Gelesen wird pro Datei in src/:
  - der Kopfkommentar (// … Zeilen ganz oben) als Beschreibung des Moduls
  - alle exportierten Funktionen, Konstanten und Klassen (mit öffentlichen Methoden)
  - interne Funktionen (nicht exportiert) in einem eigenen Abschnitt
  - /** … */ direkt davor: Beschreibung, @param {Typ} name Text, @returns {Typ} Text,
    @typedef / @property, @example
  - Importe -> „Benutzt“ und, rückwärts, „Benutzt von“

Keine Abhängigkeiten außer Python 3. Die Ausgabe ist Markdown, damit sie auf GitHub lesbar ist.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'docs', 'api')

FOLDERS = {
    '': 'Einstieg und größere Bereiche der Oberfläche',
    'core': 'Reine Musik- und Textlogik (ohne Bildschirm, gut testbar)',
    'formats': 'Dateiformate: ChordPro-Dateien, ZIP, Sicherung, Import',
    'render': 'Lied -> HTML',
    'print': 'Druck: Seitenumbruch, Liederbuch, Druckschriften',
    'settings': 'Darstellungs-Einstellungen',
    'storage': 'Speicher (IndexedDB): Lieder, Setlisten',
    'sync': 'Abgleich mit Google Drive und WebDAV',
    'ui': 'Hauptansicht – ein Modul pro Aufgabe',
}

DECL = re.compile(
    r'^(?P<export>export\s+)?(?P<default>default\s+)?'
    r'(?:(?P<async>async\s+)?function\*?\s+(?P<fn>[\w$]+)\s*\((?P<params>[^)]*)\)'
    r'|(?P<kind>const|let)\s+(?P<var>[\w$]+)\s*=\s*(?P<value>.*)'
    r'|class\s+(?P<cls>[\w$]+)(?P<ext>\s+extends\s+[\w$.]+)?)'
)
METHOD = re.compile(r'^  (?P<static>static\s+)?(?P<async>async\s+)?(?P<get>get\s+|set\s+)?(?P<name>[A-Za-z_$][\w$]*)\s*\((?P<params>[^)]*)\)\s*\{')
REEXPORT = re.compile(r'^export\s*\{([^}]*)\}(?:\s*from\s*[\'"]([^\'"]+)[\'"])?')
IMPORT = re.compile(r'^import\s+(?:[^;]*?\s+from\s+)?[\'"](\.{1,2}/[^\'"]+)[\'"]', re.M)


def rel(path):
    return os.path.relpath(path, SRC).replace(os.sep, '/')


def parse_jsdoc(block):
    """/** … */ -> {'text': str, 'params': [(typ, name, text)], 'returns': (typ, text), 'props': [...], 'tags': {}}"""
    body = re.sub(r'^/\*\*|\*/$', '', block.strip()).strip()
    lines = [re.sub(r'^\s*\* ?', '', l) for l in body.split('\n')]
    doc = {'text': [], 'params': [], 'returns': None, 'props': [], 'typedef': None, 'example': []}
    current = None
    for line in lines:
        m = re.match(r'@(\w+)\s*(.*)', line.strip())
        if m:
            tag, rest = m.groups()
            typ = ''
            t = re.match(r'\{(.*)\}\s*(.*)', rest)
            if t:
                # Typen können geschweifte Klammern enthalten: bis zur passenden schließen
                depth, i = 0, 0
                for i, ch in enumerate(rest):
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            break
                typ, rest = rest[1:i], rest[i + 1:].strip()
            if tag == 'param' or tag == 'property':
                nm = re.match(r'(\[?[\w$.]+(?:=[^\]]*)?\]?)\s*[-–]?\s*(.*)', rest)
                name, text = (nm.groups() if nm else (rest, ''))
                item = [typ, name, text]
                (doc['params'] if tag == 'param' else doc['props']).append(item)
                current = item
            elif tag in ('returns', 'return'):
                doc['returns'] = [typ, rest]
                current = doc['returns']
            elif tag == 'typedef':
                doc['typedef'] = [typ, rest]
                current = None
            elif tag == 'example':
                doc['example'].append(rest)
                current = 'example'
            else:
                doc['text'].append(line)
                current = None
            continue
        if current == 'example':
            doc['example'].append(line)
        elif current is not None:
            current[-1] = (current[-1] + ' ' + line.strip()).strip()
        else:
            doc['text'].append(line)
    doc['text'] = '\n'.join(doc['text']).strip()
    return doc


def line_comment_before(lines, i):
    """// Kommentarzeilen direkt über Zeile i (als einfache Beschreibung)."""
    out = []
    j = i - 1
    while j >= 0 and lines[j].strip().startswith('//'):
        out.insert(0, lines[j].strip()[2:].strip())
        j -= 1
    return '\n'.join(out).strip()


def parse_module(path):
    src = open(path, encoding='utf-8').read()
    lines = src.split('\n')
    header = []
    for l in lines:
        if l.startswith('//'):
            header.append(l[3:] if l[2:3] == ' ' else l[2:])
        elif l.strip() == '' and header:
            break
        elif l.strip():
            break
    mod = {'path': rel(path), 'header': '\n'.join(header).strip(), 'items': [], 'internal': [],
           'imports': sorted({os.path.normpath(os.path.join(os.path.dirname(rel(path)), m)).replace(os.sep, '/')
                              for m in IMPORT.findall(src)}),
           'typedefs': [], 'reexports': []}

    # alle /** */-Blöcke mit der Zeile, in der sie enden
    docs = {}
    for m in re.finditer(r'/\*\*.*?\*/', src, re.S):
        end_line = src.count('\n', 0, m.end())
        start_line = src.count('\n', 0, m.start())
        indent = len(lines[start_line]) - len(lines[start_line].lstrip())
        docs[end_line] = (parse_jsdoc(m.group(0)), indent)
        d = docs[end_line][0]
        if d['typedef']:
            mod['typedefs'].append(d)

    def doc_for(i):
        """JSDoc direkt über Zeile i (Leerzeilen dazwischen sind nicht erlaubt)."""
        if i - 1 in docs:
            return docs[i - 1][0]
        return None

    class_stack = None  # (item, Einrückung der Klasse)
    for i, line in enumerate(lines):
        if class_stack and line.startswith('}'):
            class_stack = None
            continue
        if class_stack:
            m = METHOD.match(line)
            if m and m.group('name') not in ('if', 'for', 'while', 'switch', 'catch', 'constructor', 'function'):
                d = doc_for(i)
                kind = 'get' if m.group('get') and m.group('get').startswith('get') else 'method'
                class_stack['methods'].append({
                    'name': m.group('name'), 'params': m.group('params').strip(), 'async': bool(m.group('async')),
                    'static': bool(m.group('static')), 'kind': kind, 'doc': d, 'line': i + 1,
                })
            elif line.startswith('  constructor('):
                class_stack['ctor'] = {'params': line.strip()[12:].split(')')[0], 'doc': doc_for(i)}
            continue
        r = REEXPORT.match(line)
        if r:
            mod['reexports'].append((r.group(1).strip(), r.group(2)))
            continue
        m = DECL.match(line)
        if not m:
            continue
        exported = bool(m.group('export'))
        d = doc_for(i)
        if m.group('fn'):
            item = {'type': 'function', 'name': m.group('fn'), 'params': ' '.join(m.group('params').split()),
                    'async': bool(m.group('async')), 'doc': d, 'line': i + 1}
            if not d:
                item['note'] = line_comment_before(lines, i)
        elif m.group('var'):
            if not exported:
                continue  # interne Konstanten bleiben interne Sache
            value = m.group('value').strip()
            arrow = re.match(r'(async\s+)?(\([^)]*\)|[\w$]+)\s*=>', value)
            item = {'type': 'arrow' if arrow else 'const', 'name': m.group('var'), 'doc': d, 'line': i + 1,
                    'params': (arrow.group(2).strip('()') if arrow else ''), 'async': bool(arrow and arrow.group(1)),
                    'value': '' if arrow else re.sub(r'\s*//.*$', '', value).rstrip(';').strip()[:90]}
            if not d:
                item['note'] = line_comment_before(lines, i) or re.sub(r'^.*?//\s*', '', line) if '//' in line else line_comment_before(lines, i)
        else:
            item = {'type': 'class', 'name': m.group('cls'), 'doc': d, 'line': i + 1, 'methods': [],
                    'extends': (m.group('ext') or '').replace('extends', '').strip(), 'ctor': None}
            class_stack = item
        (mod['items'] if exported else mod['internal']).append(item)
    return mod


# ---------- Markdown ----------

def esc(s):
    return s.replace('|', '\\|').replace('\n', ' ')


def signature(item):
    a = 'async ' if item.get('async') else ''
    if item['type'] in ('function', 'arrow', 'method'):
        return f"{a}{item['name']}({item['params']})"
    if item['type'] == 'class':
        return f"class {item['name']}" + (f" extends {item['extends']}" if item.get('extends') else '')
    return f"{item['name']}"


def doc_md(d, note=''):
    out = []
    if d and d['text']:
        out.append(d['text'])
    elif note:
        out.append(note)
    if d and d['params']:
        out.append('\n| Parameter | Typ | Bedeutung |\n|---|---|---|')
        for typ, name, text in d['params']:
            out.append(f"| `{esc(name)}` | {('`' + esc(typ) + '`') if typ else ''} | {esc(text)} |")
    if d and d['props']:
        out.append('\n| Feld | Typ | Bedeutung |\n|---|---|---|')
        for typ, name, text in d['props']:
            out.append(f"| `{esc(name)}` | {('`' + esc(typ) + '`') if typ else ''} | {esc(text)} |")
    if d and d['returns']:
        typ, text = d['returns']
        out.append(f"\n**Rückgabe:** {('`' + typ + '`') if typ else ''} {text}".rstrip())
    if d and d['example']:
        out.append('\n```js\n' + '\n'.join(d['example']).strip() + '\n```')
    return '\n'.join(out)


def header_md(text):
    """Kopfkommentar -> Markdown: Absätze bleiben Absätze, eingerückte Zeilen werden ein Codeblock."""
    out, code, para = [], [], []

    def flush():
        if para:
            out.append(' '.join(para))
            para.clear()
        if code:
            out.append('```text\n' + '\n'.join(code) + '\n```')
            code.clear()

    for line in text.split('\n'):
        if not line.strip():
            flush()
            continue
        is_code = line.startswith(' ') or line.lstrip().startswith(('{', '}'))
        if is_code and para:
            flush()
        if not is_code and code:
            flush()
        (code if is_code else para).append(line if is_code else line.strip())
    flush()
    return '\n\n'.join(out)


def page(mod, used_by):
    p = mod['path']
    out = [f"# `src/{p}`\n", f"[← Übersicht](README.md)" if '/' not in p else f"[← Übersicht](../README.md)", '']
    if mod['header']:
        out += [header_md(mod['header']), '']
    link = lambda t: f"[`{t}`]({os.path.relpath(t.replace('.js', '.md'), os.path.dirname(p) or '.').replace(os.sep, '/')})"
    if mod['imports']:
        out.append('**Benutzt:** ' + ', '.join(link(i) for i in mod['imports']) + '  ')
    if used_by:
        out.append('**Benutzt von:** ' + ', '.join(link(u) for u in sorted(used_by)))
    out.append('')
    if mod['typedefs']:
        out.append('## Datentypen\n')
        for d in mod['typedefs']:
            typ, name = d['typedef']
            out += [f"### `{name}`\n", doc_md(d), '']
    if mod['items'] or mod['reexports']:
        out.append('## Exportiert\n')
    for it in mod['items']:
        out += [f"### `{signature(it)}`\n"]
        if it['type'] == 'const' and it.get('value'):
            out.append(f"`= {esc(it['value'])}`\n")
        out += [doc_md(it['doc'], it.get('note', '')), '']
        if it['type'] == 'class':
            if it.get('ctor'):
                out += [f"#### `new {it['name']}({it['ctor']['params']})`\n", doc_md(it['ctor']['doc']), '']
            for m in it['methods']:
                if m['name'].startswith('#'):
                    continue
                prefix = 'static ' if m['static'] else ''
                sig = f"get {m['name']}" if m['kind'] == 'get' else f"{prefix}{'async ' if m['async'] else ''}{m['name']}({' '.join(m['params'].split())})"
                out += [f"#### `{sig}`\n", doc_md(m['doc']), '']
    for names, src in mod['reexports']:
        out += [f"### `{names}`\n", f"Weitergereicht{(' aus `' + src + '`') if src else ''} (für bestehende Aufrufer).", '']
    if mod['internal']:
        out.append('## Intern\n')
        out.append('Nicht exportiert – nur innerhalb des Moduls benutzt.\n')
        for it in mod['internal']:
            text = doc_md(it['doc'], it.get('note', ''))
            out += [f"- `{signature(it)}`" + (f" – {text.splitlines()[0]}" if text else '')]
        out.append('')
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(out)).rstrip() + '\n'


def missing(mod):
    """Exportierte Funktionen/Klassen/Methoden ohne Beschreibung."""
    out = []
    for it in mod['items']:
        if it['type'] in ('function', 'arrow', 'class') and not (it['doc'] and it['doc']['text']) and not it.get('note'):
            out.append(f"{mod['path']}:{it['line']} {it['name']}")
        if it['type'] == 'class':
            for m in it['methods']:
                if not (m['doc'] and m['doc']['text']):
                    out.append(f"{mod['path']}:{m['line']} {it['name']}.{m['name']}")
    if not mod['header']:
        out.append(f"{mod['path']}:1 (kein Kopfkommentar)")
    return out


def main():
    mods = []
    for dp, _, fs in os.walk(SRC):
        for f in sorted(fs):
            if f.endswith('.js'):
                mods.append(parse_module(os.path.join(dp, f)))
    mods.sort(key=lambda m: (m['path'].count('/'), m['path']))
    used_by = {}
    for m in mods:
        for i in m['imports']:
            used_by.setdefault(i, set()).add(m['path'])

    gaps = [g for m in mods for g in missing(m)]
    if '--check' in sys.argv:
        print('\n'.join(gaps) or 'Alles dokumentiert.')
        sys.exit(1 if gaps else 0)

    # alte Ausgabe ersetzen
    if os.path.isdir(OUT):
        for dp, _, fs in os.walk(OUT):
            for f in fs:
                if f.endswith('.md'):
                    os.remove(os.path.join(dp, f))
    for m in mods:
        target = os.path.join(OUT, m['path'].replace('.js', '.md'))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        open(target, 'w', encoding='utf-8', newline='\n').write(page(m, used_by.get(m['path'], set())))

    # Übersicht
    idx = ['# API-Dokumentation\n',
           'Automatisch erzeugt aus den Kommentaren im Quelltext – **nicht von Hand bearbeiten**, sondern die',
           'Kommentare ändern und `python tools/make-docs.py` ausführen. Wie alles zusammenhängt, steht in',
           '[../architektur.md](../architektur.md).\n']
    total_fn = sum(len(m['items']) for m in mods)
    idx.append(f"{len(mods)} Module, {total_fn} exportierte Funktionen, Konstanten und Klassen.\n")
    groups = {}
    for m in mods:
        groups.setdefault(m['path'].split('/')[0] if '/' in m['path'] else '', []).append(m)
    for folder in ['', 'ui', 'core', 'formats', 'render', 'print', 'settings', 'storage', 'sync']:
        if folder not in groups:
            continue
        idx.append(f"## `src/{folder + '/' if folder else ''}` – {FOLDERS.get(folder, '')}\n")
        idx.append('| Modul | Inhalt |\n|---|---|')
        for m in groups[folder]:
            first = ' '.join(l.strip() for l in m['header'].split('\n\n')[0].split('\n') if l.strip())
            first = re.split(r'(?<=\.)\s', first)[0]
            idx.append(f"| [`{m['path']}`]({m['path'].replace('.js', '.md')}) | {esc(first)} |")
        idx.append('')
    open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(idx))
    print(f"{len(mods)} Module dokumentiert in docs/api/. Ohne Beschreibung: {len(gaps)}")
    for g in gaps:
        print('  ', g)


if __name__ == '__main__':
    main()
