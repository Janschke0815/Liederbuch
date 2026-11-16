import { describe, it, expect } from './runner.js';
import { APP_VERSION, APP_DATE, versionLabel } from '../src/version.js';

describe('Version', () => {
  it('Version und Datum sind gültig', () => {
    expect(/^\d+\.\d+\.\d+$/.test(APP_VERSION)).toBe(true);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(APP_DATE) && !Number.isNaN(Date.parse(APP_DATE))).toBe(true);
  });

  it('CHANGELOG.md enthält die aktuelle Version mit Datum', async () => {
    const text = await (await fetch(new URL('../CHANGELOG.md', import.meta.url), { cache: 'no-store' })).text();
    const [y, m, d] = APP_DATE.split('-');
    expect(text.includes(`## ${APP_VERSION} – ${d}.${m}.${y}`)).toBe(true);
  });

  it('Anzeige mit deutschem Datum', () => {
    expect(versionLabel('1.13.0', '2026-11-16')).toBe('1.13.0 vom 16.11.2026');
    expect(versionLabel('2.0.0', '')).toBe('2.0.0');
  });
});
