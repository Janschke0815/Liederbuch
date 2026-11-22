import { describe, it, expect } from './runner.js';
import { detectPlatform, installSteps } from '../src/ui/install-help.js';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0',
  iphoneWebView: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  androidWebView: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36',
  winEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
};

describe('Installieren-Hilfe', () => {
  it('erkennt iPhone/iPad, Android und PC samt Browser', () => {
    expect(detectPlatform({ userAgent: UA.iphoneSafari })).toEqual({ installed: false, os: 'ios', browser: 'safari', inApp: false });
    expect(detectPlatform({ userAgent: UA.iphoneChrome }).browser).toBe('chrome');
    expect(detectPlatform({ userAgent: UA.ipad, maxTouchPoints: 5 }).os).toBe('ios'); // iPad meldet sich als Mac
    expect(detectPlatform({ userAgent: UA.ipad, maxTouchPoints: 0 }).os).toBe('desktop'); // echter Mac
    expect(detectPlatform({ userAgent: UA.androidChrome })).toEqual({ installed: false, os: 'android', browser: 'chrome', inApp: false });
    expect(detectPlatform({ userAgent: UA.androidSamsung }).browser).toBe('samsung');
    expect(detectPlatform({ userAgent: UA.winEdge })).toEqual({ installed: false, os: 'desktop', browser: 'edge', inApp: false });
    expect(detectPlatform({ userAgent: UA.winFirefox }).browser).toBe('firefox');
  });

  it('eingebaute Browser anderer Apps: erst in Safari bzw. Chrome öffnen', () => {
    for (const ua of [UA.iphoneInstagram, UA.iphoneWebView]) {
      const p = detectPlatform({ userAgent: ua });
      expect(p.inApp).toBe(true);
      const h = installSteps(p);
      expect(h.title).toBe('Bitte in Safari öffnen');
      expect(h.copyLink).toBe(true);
    }
    expect(installSteps(detectPlatform({ userAgent: UA.androidWebView })).title).toBe('Bitte in Chrome öffnen');
  });

  it('iPhone: Teilen → Zum Home-Bildschirm; in Chrome mit Teilen-Symbol oben', () => {
    const safari = installSteps(detectPlatform({ userAgent: UA.iphoneSafari }));
    expect(safari.steps.join(' ')).toContain('Zum Home-Bildschirm');
    expect(safari.steps[0]).toContain('•••');
    expect(safari.note).toContain('Aktionen bearbeiten');
    expect(Boolean(safari.copyLink)).toBe(false);
    const chrome = installSteps(detectPlatform({ userAgent: UA.iphoneChrome }));
    expect(chrome.steps[0]).toContain('Oben rechts');
    expect(chrome.copyLink).toBe(true);
  });

  it('Android, PC und schon installiert', () => {
    expect(installSteps(detectPlatform({ userAgent: UA.androidChrome })).steps.join(' ')).toContain('App installieren');
    expect(installSteps(detectPlatform({ userAgent: UA.androidSamsung })).steps.join(' ')).toContain('Startbildschirm');
    expect(installSteps(detectPlatform({ userAgent: UA.winEdge })).intro).toContain('Edge');
    expect(installSteps(detectPlatform({ userAgent: UA.winFirefox })).copyLink).toBe(true);
    const done = installSteps(detectPlatform({ userAgent: UA.iphoneSafari, standalone: true }));
    expect(done.title).toBe('Schon installiert');
    expect(done.steps).toEqual([]);
  });
});
