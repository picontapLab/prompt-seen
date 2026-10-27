import type { CDPSession, Page } from '@playwright/test';

// Layout checks for the first complete front-end acceptance (design doc §16.5 "明暗与文字",
// §17.3 step 6): nothing cut off, nothing on top of something else, no sideways page scroll.
// They read the rendered page, so they hold for every locale, theme and width alike.

/**
 * Problems a reader would see: the page scrolls sideways; text of a control, heading or label
 * is cut off by a box that hides overflow without an ellipsis; two controls overlap. Text set
 * to end in an ellipsis on purpose (card titles, §11.9 标题截断) is not a problem.
 */
export function layoutProblems(page: Page, scope = 'body'): Promise<string[]> {
  return page.evaluate((scope) => {
    const problems: string[] = [];
    const root = document.querySelector(scope);
    if (!root) return [`no ${scope}`];
    const doc = document.documentElement;

    const shown = (el: Element) => {
      if (el.closest('.visually-hidden, [aria-hidden="true"], [inert]')) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
    };
    const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`;

    // Sideways scroll, with what causes it: the outermost boxes past an edge that nothing clips.
    if (doc.scrollWidth > innerWidth + 1) {
      const past = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
      };
      const clipped = (el: Element) => {
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement)
          if (getComputedStyle(a).overflowX !== 'visible') return true;
        return false;
      };
      const out = (el: Element | null) => !!el && el !== document.body && past(el) && !clipped(el);
      const causes = [...document.body.querySelectorAll('*')].filter((el) => out(el) && !out(el.parentElement));
      const at = (el: Element) => {
        const r = el.getBoundingClientRect();
        return `${name(el)}.${String(el.className).slice(0, 30)} ${Math.round(r.left)}–${Math.round(r.right)}`;
      };
      problems.push(
        `page scrolls sideways: ${doc.scrollWidth} > ${innerWidth} (${causes.slice(0, 3).map(at).join('; ')})`,
      );
    }

    // Cut-off text: the text's own box leaves an ancestor that hides overflow (up to 4 levels).
    const controls = [...root.querySelectorAll('a, button, label, [role="tab"], h1, h2, h3, th, dt, legend')];
    for (const el of controls) {
      if (!shown(el)) continue;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement!;
        if (!shown(parent)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = range.getBoundingClientRect();
        if (text.width === 0) continue;
        let box: Element | null = parent;
        for (let depth = 0; box && depth < 5; depth++, box = box.parentElement) {
          const cs = getComputedStyle(box);
          if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') break;
          if (!/hidden|clip/.test(cs.overflowX + cs.overflowY)) continue;
          // A scroller that scrolls is not cutting text off: its content can be reached.
          if (/auto|scroll/.test(cs.overflowX) || /auto|scroll/.test(cs.overflowY)) break;
          const b = box.getBoundingClientRect();
          // A 1 px box is the visually hidden pattern: the text is a name for assistive technology.
          if (b.width <= 2 || b.height <= 2) break;
          if (text.left < b.left - 1 || text.right > b.right + 1 || text.top < b.top - 2 || text.bottom > b.bottom + 2)
            problems.push(`cut off: ${name(el)} in ${box.tagName.toLowerCase()}.${String(box.className).slice(0, 40)}`);
          break;
        }
      }
    }

    // Overlap: text-only controls in view whose boxes intersect (overlays on images, like the save
    // button on a card's frame, are by design and contain or sit on an image, not on text; so are
    // a scroll row's buttons over its faded edge, `data-scroll-button`). A
    // control counts only where it is drawn: the part of its box inside every ancestor that clips
    // (a row scrolled sideways). Content scrolling under a sticky bar (the header, the list's
    // filter bar) is covered by design, so pairs on different pinned layers are not compared.
    const pinned = (el: Element) => {
      for (let a: Element | null = el; a; a = a.parentElement)
        if (/sticky|fixed/.test(getComputedStyle(a).position)) return a;
      return null;
    };
    const drawn = (el: Element) => {
      const r = el.getBoundingClientRect();
      let { left, right, top, bottom } = r;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const b = a.getBoundingClientRect();
        left = Math.max(left, b.left);
        right = Math.min(right, b.right);
        top = Math.max(top, b.top);
        bottom = Math.min(bottom, b.bottom);
      }
      return right - left > 2 && bottom - top > 2 ? ({ left, right, top, bottom } as DOMRect) : null;
    };
    const plain = controls.filter(
      (el) =>
        /^(A|BUTTON)$/.test(el.tagName) &&
        shown(el) &&
        !el.querySelector('img') &&
        !el.hasAttribute('data-scroll-button') &&
        el.closest('header, main, footer'),
    );
    const rects = plain.flatMap((el) => {
      const r = drawn(el);
      return r ? [{ el, r }] : [];
    });
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        if (a.el.contains(b.el) || b.el.contains(a.el) || pinned(a.el) !== pinned(b.el)) continue;
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 2 && h > 2) problems.push(`overlap: ${name(a.el)} and ${name(b.el)}`);
      }
    return [...new Set(problems)];
  }, scope);
}

/**
 * German interface text in place of the English labels (§16.5 "德语长标签"). German is in the
 * first batch of locales but has no catalog yet, so its typical length is checked by putting
 * German labels into the English pages once they have taken over; the layout must hold them.
 * Content labels (style and use names) are included, as a German version would have them.
 */
export const GERMAN: Record<string, string> = {
  'Skip to content': 'Zum Inhalt springen',
  Templates: 'Vorlagen',
  Collections: 'Themen und Sammlungen',
  Search: 'Suchen',
  Saved: 'Auf der Merkliste',
  Save: 'Zur Merkliste',
  Language: 'Sprache',
  'Switch to light theme': 'Zum hellen Design wechseln',
  'Switch to dark theme': 'Zum dunklen Design wechseln',
  Menu: 'Menü',
  'What each phrase does': 'Was jede einzelne Formulierung bewirkt',
  'Copy prompt': 'Eingabeaufforderung kopieren',
  Copied: 'In die Zwischenablage kopiert',
  "Couldn't copy": 'Kopieren nicht möglich',
  'Another frame': 'Ein anderes Bild zeigen',
  'Search prompts and templates': 'Eingabeaufforderungen und Vorlagen durchsuchen',
  'Browse by use': 'Nach Verwendungszweck stöbern',
  'Social post': 'Beitrag in sozialen Netzwerken',
  Wallpaper: 'Hintergrundbild',
  Packaging: 'Verpackungsgestaltung',
  'Art print': 'Kunstdruck',
  Avatar: 'Profilbild',
  'Book cover': 'Buchumschlag',
  Editorial: 'Redaktionelle Illustration',
  'Event poster': 'Veranstaltungsplakat',
  'More on show': 'Weitere ausgestellte Werke',
  'Newest frames': 'Neueste Bilder',
  'See the whole roll': 'Die ganze Filmrolle ansehen',
  'All templates': 'Alle Vorlagen',
  'All collections': 'Alle Sammlungen',
  LANGUAGES: 'SPRACHEN',
  THEME: 'DARSTELLUNG',
  Theme: 'Darstellung',
  System: 'Systemeinstellung',
  Light: 'Hell',
  Dark: 'Dunkel',
  'Keyboard shortcuts': 'Tastaturkurzbefehle',
  License: 'Lizenzbedingungen',
  'The roll': 'Die Filmrolle',
  More: 'Mehr anzeigen',
  "This week's picks": 'Ausgewählte Werke dieser Woche',
  'Open frame': 'Bild öffnen',
  All: 'Alle',
  'Ink wash': 'Tuschmalerei',
  'Flat vector': 'Flache Vektorgrafik',
  Neon: 'Neonlicht',
  Minimal: 'Minimalistisch',
  Gradient: 'Farbverlauf',
  Geometric: 'Geometrisch',
  Cyanotype: 'Cyanotypie',
  'Use · Shape': 'Verwendungszweck · Format',
  Filters: 'Filter',
  Explore: 'Erkunden',
  'Newest first': 'Neueste zuerst',
  Featured: 'Empfehlungen',
  'Skip the list': 'Liste überspringen',
  Page: 'Seite',
  Original: 'Originalbild',
  Home: 'Startseite',
  Share: 'Teilen',
  'Link copied': 'Link in die Zwischenablage kopiert',
  'What is it good for?': 'Wofür eignet sich diese Eingabeaufforderung?',
  'How do I adjust it?': 'Wie passe ich sie an?',
  'Test prints': 'Probeabzüge',
  Model: 'Modell',
  Recorded: 'Aufgezeichnet',
  Provider: 'Anbieter',
  Value: 'Wert',
  'Source and licence': 'Quelle und Lizenz',
  Image: 'Bild',
  'Similar prompts': 'Ähnliche Eingabeaufforderungen',
  Reset: 'Zurücksetzen',
  Subject: 'Motiv',
  Character: 'Figur',
  Style: 'Stilrichtung',
  Mood: 'Stimmung',
  Composition: 'Bildkomposition',
  'SHOW THE FULL PROMPT': 'VOLLSTÄNDIGE EINGABEAUFFORDERUNG ANZEIGEN',
  'Download .txt': 'Als .txt-Datei herunterladen',
  'Another sample': 'Anderes Beispiel laden',
  'Share these values': 'Diese Werte als Link teilen',
  'How do I fill it in?': 'Wie fülle ich die Vorlage aus?',
  'Made with this template': 'Mit dieser Vorlage erstellt',
  Use: 'Verwendungszweck',
  Shape: 'Format',
  Portrait: 'Hochformat',
  Square: 'Quadratisch',
  'Reference image': 'Referenzbild',
  'Text only': 'Nur Text',
  'Needs a reference image': 'Benötigt ein Referenzbild',
  'Nothing saved yet': 'Noch nichts auf der Merkliste',
  'Browse featured': 'Empfehlungen durchstöbern',
  Import: 'Importieren',
  Export: 'Exportieren',
  Close: 'Schließen',
  Customize: 'Mit Vorlage anpassen',
  Topics: 'Themen',
};

const COUNTED: [RegExp, string][] = [
  [/^(\d+) results?$/, '$1 Ergebnisse'],
  [/^(\d+) frames?$/, '$1 Bilder'],
  [/^All (\d+) frames$/, 'Alle $1 Bilder'],
  [/^Open frame (\d+)$/, 'Bild $1 öffnen'],
  [/^(\d+) fields?$/, '$1 Eingabefelder'],
  [/^(\d+) entries$/, '$1 Einträge'],
  [/^(\d+) fields? to fill$/, 'Noch $1 Felder auszufüllen'],
  [/^Page (\d+) of (\d+)$/, 'Seite $1 von $2'],
];

/** Puts German labels in place of English ones and marks the page German; returns how many it replaced. */
export function applyGermanLabels(page: Page): Promise<number> {
  return page.evaluate(
    ([dictionary, counted]) => {
      const patterns = counted.map(([source, flags, to]) => [new RegExp(source, flags), to] as const);
      // As a German page would be: hyphenation and other language rules follow `lang` (§11.1.2).
      document.documentElement.lang = 'de';
      let replaced = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      for (const node of nodes) {
        const raw = node.textContent ?? '';
        const text = raw.trim();
        if (!text || node.parentElement?.closest('script, style, [lang]:not(html)')) continue;
        let german = dictionary[text];
        if (!german)
          for (const [pattern, to] of patterns)
            if (pattern.test(text)) {
              german = text.replace(pattern, to);
              break;
            }
        if (!german) continue;
        node.textContent = raw.replace(text, german);
        replaced++;
      }
      return replaced;
    },
    [GERMAN, COUNTED.map(([p, to]) => [p.source, p.flags, to] as const)] as const,
  );
}

/** Network and CPU conditions for slow-network checks (Chrome DevTools "Slow 4G"-like). */
export const SLOW_4G = {
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

/** A cold, slow visit: no cache, Slow 4G and a 4× slower CPU (Chromium only). */
export async function slowColdVisit(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...SLOW_4G });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return cdp;
}
