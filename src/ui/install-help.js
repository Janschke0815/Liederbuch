// Installieren-Hilfe: Welche Schritte passen zu diesem Gerät und Browser?
//
// Chrome/Edge auf Android und dem PC bieten die Installation selbst an (beforeinstallprompt) – dann
// startet der Knopf sie direkt. Safari auf iPhone/iPad tut das nie; dort (und wenn der Browser
// gerade nicht anbietet) zeigt die App die passenden Schritte. Reine Logik, ohne Bildschirm – testbar.

/**
 * Gerät und Browser grob einordnen.
 * @param {{userAgent?: string, maxTouchPoints?: number, standalone?: boolean, displayStandalone?: boolean}} env
 * @returns {{installed: boolean, os: 'ios'|'android'|'desktop', browser: string, inApp: boolean}}
 *   browser: 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other'
 *   inApp: Seite läuft im eingebauten Browser einer anderen App (WhatsApp, Mail, Instagram …)
 */
export function detectPlatform({ userAgent = '', maxTouchPoints = 0, standalone = false, displayStandalone = false } = {}) {
  const ua = String(userAgent);
  // iPadOS meldet sich wie ein Mac – erkennbar am Touchscreen
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const os = ios ? 'ios' : android ? 'android' : 'desktop';
  let browser = 'other';
  if (/EdgiOS|EdgA|Edg\//.test(ua)) browser = 'edge';
  else if (/FxiOS|Firefox\//.test(ua)) browser = 'firefox';
  else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/CriOS|Chrome\//.test(ua)) browser = 'chrome';
  else if (/Safari\//.test(ua)) browser = 'safari';
  // Eingebaute Browser anderer Apps: auf iOS fehlt meist das „Safari/“-Kennzeichen, oder die App
  // nennt sich selbst (Facebook, Instagram, Google-App, Line, WhatsApp …)
  const inApp = /FBAN|FBAV|Instagram|Line\/|GSA\/|WhatsApp|MicroMessenger|; wv\)/.test(ua)
    || (ios && browser === 'other');
  return { installed: Boolean(standalone || displayStandalone), os, browser, inApp };
}

/**
 * Anleitung für ein Gerät.
 * @param {ReturnType<typeof detectPlatform>} p
 * @returns {{title: string, intro: string, steps: string[], note?: string, copyLink?: boolean}}
 *   copyLink: Knopf „Adresse kopieren“ anbieten (zum Einfügen in Safari/Chrome)
 */
export function installSteps(p) {
  if (p.installed) {
    return {
      title: 'Schon installiert',
      intro: 'Du benutzt die App bereits als installierte App – hier ist nichts mehr zu tun.',
      steps: [],
    };
  }
  if (p.inApp) {
    const target = p.os === 'ios' ? 'Safari' : 'Chrome';
    return {
      title: `Bitte in ${target} öffnen`,
      intro: `Die Seite läuft gerade im eingebauten Browser einer anderen App (z. B. nach einem Link aus WhatsApp oder Mail). Dort lässt sie sich nicht installieren.`,
      steps: [
        `Im Menü dieser App „In ${target} öffnen“ bzw. „Im Browser öffnen“ wählen (oft unter ••• oder ⋮, auf dem iPhone auch das Kompass-Symbol).`,
        `Oder die Adresse kopieren und in ${target} einfügen.`,
        'Dort diese Hilfe noch einmal öffnen.',
      ],
      copyLink: true,
    };
  }
  if (p.os === 'ios') {
    const safari = p.browser === 'safari';
    return {
      title: 'Auf dem iPhone/iPad installieren',
      intro: 'Auf dem iPhone und iPad installiert man Web-Apps über das Teilen-Menü – die App selbst kann dort keinen Knopf dafür anbieten.',
      steps: [
        safari
          ? 'Unten in der Adressleiste auf ••• tippen und „Teilen“ wählen (bei älteren iOS-Versionen gleich das Teilen-Symbol □↑).'
          : 'Oben rechts in der Adressleiste auf das Teilen-Symbol □↑ tippen.',
        'Im Teilen-Fenster nach unten wischen (ggf. „Mehr anzeigen“) und „Zum Home-Bildschirm“ wählen.',
        '„Als Web-App öffnen“ eingeschaltet lassen und auf „Hinzufügen“ tippen.',
      ],
      note: '„Zum Home-Bildschirm“ fehlt? Ganz unten im Teilen-Fenster „Aktionen bearbeiten …“ antippen und es hinzufügen. Im privaten Modus bietet iOS es teils nicht an – dann einen normalen Tab nehmen. Siehst du gar kein ••• bzw. Teilen-Symbol, läuft die Seite in einer anderen App: über das Kompass-Symbol in Safari öffnen.'
        + (safari ? '' : ' Klappt es in diesem Browser nicht, die Seite in Safari öffnen.'),
      copyLink: !safari,
    };
  }
  if (p.os === 'android') {
    if (p.browser === 'samsung') {
      return {
        title: 'Auf dem Android-Gerät installieren',
        intro: 'Im Samsung Internet:',
        steps: ['Unten auf das Menü ≡ tippen.', '„Seite hinzufügen zu“ → „Startbildschirm“ wählen.'],
      };
    }
    if (p.browser === 'firefox') {
      return {
        title: 'Auf dem Android-Gerät installieren',
        intro: 'In Firefox:',
        steps: ['Auf das Menü ⋮ tippen.', '„Installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.'],
      };
    }
    return {
      title: 'Auf dem Android-Gerät installieren',
      intro: 'In Chrome (in Edge entsprechend):',
      steps: [
        'Oben rechts auf das Menü ⋮ tippen.',
        '„App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen und bestätigen.',
      ],
      note: 'Steht dort „App öffnen“, ist die App auf diesem Gerät schon installiert.',
    };
  }
  if (p.browser === 'chrome' || p.browser === 'edge') {
    return {
      title: 'Auf dem PC installieren',
      intro: `In ${p.browser === 'edge' ? 'Edge' : 'Chrome'}:`,
      steps: [
        'Rechts in der Adressleiste auf das Installieren-Symbol (Bildschirm mit Pfeil) klicken – oder im Menü ⋮ bzw. … „App installieren“ wählen.',
      ],
      note: 'Fehlt das Symbol, ist die App auf diesem PC vermutlich schon installiert (dann steht im Menü „Liederbuch öffnen“).',
    };
  }
  if (p.browser === 'safari') {
    return {
      title: 'Auf dem Mac installieren',
      intro: 'In Safari (ab macOS Sonoma):',
      steps: ['Im Menü „Ablage“ → „Zum Dock hinzufügen …“ wählen.'],
    };
  }
  return {
    title: 'Installieren',
    intro: 'Dieser Browser kann Web-Apps nicht installieren (z. B. Firefox auf dem PC).',
    steps: ['Die Seite in Chrome oder Edge öffnen und dort installieren – oder einfach ein Lesezeichen setzen; die App funktioniert auch so, auch offline.'],
    copyLink: true,
  };
}
