// Minimaler Test-Runner für den Browser (kein Node nötig).
// API angelehnt an Vitest/Jest, damit ein späterer Umstieg einfach bleibt.

const suites = [];
let currentSuite = null;

export function describe(name, fn) {
  const suite = { name, tests: [] };
  suites.push(suite);
  const prev = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = prev;
}

export function it(name, fn) {
  currentSuite.tests.push({ name, fn });
}

const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v, null, 2));

export function expect(actual) {
  const fail = (msg) => {
    throw new Error(msg);
  };
  return {
    toBe(expected) {
      if (actual !== expected) fail(`Erwartet ${show(expected)}\n   erhalten ${show(actual)}`);
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        fail(`Erwartet ${show(expected)}\n   erhalten ${show(actual)}`);
    },
    toContain(part) {
      if (!actual.includes(part)) fail(`${show(actual)}\n   enthält nicht ${show(part)}`);
    },
    notToContain(part) {
      if (actual.includes(part)) fail(`${show(actual)}\n   enthält unerwartet ${show(part)}`);
    },
    toBeTruthy() {
      if (!actual) fail(`Erwartet truthy, erhalten ${show(actual)}`);
    },
    toBeFalsy() {
      if (actual) fail(`Erwartet falsy, erhalten ${show(actual)}`);
    },
  };
}

export async function run(target) {
  let passed = 0;
  const failures = [];
  const html = [];
  for (const s of suites) {
    html.push(`<h2>${s.name}</h2><ul>`);
    for (const t of s.tests) {
      try {
        await t.fn();
        passed++;
        html.push(`<li class="ok">✔ ${t.name}</li>`);
      } catch (e) {
        failures.push({ suite: s.name, test: t.name, error: e.message });
        const msg = String(e.message).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        html.push(`<li class="fail">✘ ${t.name}<pre>${msg}</pre></li>`);
      }
    }
    html.push('</ul>');
  }
  const summary = `${passed} bestanden, ${failures.length} fehlgeschlagen`;
  target.innerHTML = `<p class="summary ${failures.length ? 'fail' : 'ok'}">${summary}</p>` + html.join('');
  window.__testResults = { passed, failed: failures.length, failures };
  return window.__testResults;
}
