import { describe, it, expect } from './runner.js';
import { sanitize, applySettings } from '../src/settings/settings.js';

describe('Druck: Seitenzahlen ein/aus', () => {
  it('Standard an, ungültige Werte -> an, als data-Attribut gesetzt', () => {
    expect(sanitize({}).pageNumbers).toBe(true);
    expect(sanitize({ pageNumbers: 'nein' }).pageNumbers).toBe(true);
    const el = document.createElement('div');
    applySettings(el, { pageNumbers: false });
    expect(el.dataset.pageNumbers).toBe('hide');
  });

  it('ausgeblendet: Fußzeile unsichtbar, nimmt aber weiter Platz ein', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="page"><div class="page-footer">3</div></div>';
    document.body.append(root);
    const footer = root.querySelector('.page-footer');
    try {
      applySettings(root, { pageNumbers: true });
      expect(getComputedStyle(footer).visibility).toBe('visible');
      applySettings(root, { pageNumbers: false });
      expect(getComputedStyle(footer).visibility).toBe('hidden');
      expect(getComputedStyle(footer).display === 'none').toBe(false); // Platz bleibt
    } finally {
      root.remove();
    }
  });
});
