/**
 * Unified Single-Pass DOM, Responsive & WCAG 2.2 AA Audit Probe
 * Can be evaluated directly in Antigravity's browser subagent or Stagehand page.evaluate().
 */
export function runUnifiedDomAuditProbe() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const docWidth = document.documentElement.scrollWidth;
  const origin = window.location.origin;

  const getSelector = (el) => {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return `#${CSS.escape(el.id)}`;
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-cy');
    if (testId) return `${el.tagName.toLowerCase()}[data-testid="${testId}"]`;
    const cls = typeof el.className === 'string'
      ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.')
      : '';
    return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
  };

  const parseRgba = (str) => {
    if (!str) return null;
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  };
  const srgbToLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const getLuminance = ({ r, g, b }) =>
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  const resolveBgColor = (el) => {
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const bg = parseRgba(getComputedStyle(cur).backgroundColor);
      if (bg && bg.a > 0.1) return bg;
      cur = cur.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrastRatio = (l1, l2) => {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
  };

  const seenLinks = new Set();
  const internalLinks = [];
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.href;
    if (!href.startsWith(origin) && !href.startsWith('/')) return;
    const clean = href.split('#')[0];
    if (seenLinks.has(clean)) return;
    seenLinks.add(clean);
    internalLinks.push({
      text: (a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 70),
      href: clean,
      inNav: !!a.closest('nav, header, aside, [role="navigation"]'),
    });
  });

  const tabs = Array.from(document.querySelectorAll('[role="tab"], [data-state="active"], [data-state="inactive"], .tab, [aria-selected]')).map((el) => ({
    text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60),
    selector: getSelector(el),
    selected: el.getAttribute('aria-selected') || el.getAttribute('data-state'),
  }));

  const accordionsAndModals = Array.from(document.querySelectorAll('[aria-expanded], [aria-haspopup="dialog"], details > summary')).map((el) => ({
    text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 60),
    selector: getSelector(el),
    expanded: el.getAttribute('aria-expanded') || (el.parentElement?.tagName === 'DETAILS' ? String(el.parentElement.open) : null),
  }));

  const overflowingElements = [];
  const clippedTextElements = [];
  const smallTouchTargets = [];
  const iosZoomInputs = [];
  const lowContrastElements = [];
  const stickyBars = [];

  const colors = new Map();
  const bgColors = new Map();
  const fonts = new Map();
  const fontSizes = new Map();
  const radii = new Map();

  document.querySelectorAll('*').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return;

    if (el.matches('body, h1, h2, h3, h4, p, a, button, span, div, section, article, input, th, td')) {
      colors.set(cs.color, (colors.get(cs.color) || 0) + 1);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        bgColors.set(cs.backgroundColor, (bgColors.get(cs.backgroundColor) || 0) + 1);
      }
      fonts.set(cs.fontFamily.split(',')[0].trim(), (fonts.get(cs.fontFamily.split(',')[0].trim()) || 0) + 1);
      fontSizes.set(cs.fontSize, (fontSizes.get(cs.fontSize) || 0) + 1);
      if (cs.borderRadius && cs.borderRadius !== '0px') {
        radii.set(cs.borderRadius, (radii.get(cs.borderRadius) || 0) + 1);
      }
    }

    if (rect.right > vw + 2 || rect.left < -2) {
      overflowingElements.push({
        selector: getSelector(el),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        vw,
      });
    }

    if ((cs.position === 'fixed' || cs.position === 'sticky') && rect.width > vw * 0.5 && rect.height < vh * 0.5) {
      stickyBars.push({
        selector: getSelector(el),
        position: cs.position,
        heightPx: Math.round(rect.height),
        viewportHeightPct: Math.round((rect.height / vh) * 100),
      });
    }

    if (
      el.children.length === 0 &&
      (el.innerText || '').trim().length > 0 &&
      (cs.overflowX === 'hidden' || cs.overflow === 'hidden') &&
      cs.textOverflow !== 'ellipsis' &&
      el.scrollWidth > el.clientWidth + 4
    ) {
      clippedTextElements.push({
        selector: getSelector(el),
        text: el.innerText.trim().slice(0, 50),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      });
    }

    if (el.matches('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, [role="tab"]')) {
      if (rect.width < 44 || rect.height < 44) {
        smallTouchTargets.push({
          selector: getSelector(el),
          text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          belowWcag24px: rect.width < 24 || rect.height < 24,
        });
      }
      if (el.matches('input:not([type="hidden"]), select, textarea')) {
        const fs = parseFloat(cs.fontSize);
        if (fs < 16) {
          iosZoomInputs.push({
            selector: getSelector(el),
            type: el.getAttribute('type') || el.tagName.toLowerCase(),
            fontSizePx: fs,
          });
        }
      }
    }

    if (el.children.length === 0 && (el.innerText || '').trim().length > 1) {
      const fg = parseRgba(cs.color);
      if (fg && fg.a > 0.2) {
        const bg = resolveBgColor(el);
        const ratio = contrastRatio(getLuminance(fg), getLuminance(bg));
        const fontSize = parseFloat(cs.fontSize);
        const isBold = parseInt(cs.fontWeight, 10) >= 700 || cs.fontWeight === 'bold';
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && isBold);
        const minRequired = isLargeText ? 3.0 : 4.5;
        if (ratio < minRequired) {
          lowContrastElements.push({
            selector: getSelector(el),
            text: el.innerText.trim().slice(0, 45),
            ratio,
            minRequired,
            fg: cs.color,
            bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
            fontSize: cs.fontSize,
          });
        }
      }
    }
  });

  const brokenImages = Array.from(document.querySelectorAll('img'))
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map((img) => ({ selector: getSelector(img), src: img.src, alt: img.alt || '(missing)' }));

  const missingAlt = Array.from(document.querySelectorAll('img'))
    .filter((img) => !img.hasAttribute('alt'))
    .map((img) => ({ selector: getSelector(img), src: img.src }));

  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
    level: parseInt(h.tagName[1], 10),
    text: h.innerText.trim().slice(0, 60),
    selector: getSelector(h),
  }));

  const headingSkips = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level - headings[i - 1].level > 1) {
      headingSkips.push({ from: headings[i - 1], to: headings[i] });
    }
  }

  const unlabeledInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))
    .filter((el) => {
      const id = el.id;
      const hasLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
      return !hasLabel && !hasAria && !el.closest('label');
    })
    .map((el) => ({
      selector: getSelector(el),
      type: el.getAttribute('type') || el.tagName.toLowerCase(),
      name: el.getAttribute('name') || '',
      placeholder: el.getAttribute('placeholder') || '',
    }));

  const topEntries = (map, n = 8) =>
    Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    meta: {
      title: document.title,
      url: window.location.href,
      viewport: `${vw}x${vh}`,
      docScrollWidth: docWidth,
      hasHorizontalOverflow: docWidth > vw,
    },
    navigation: {
      totalInternalLinks: internalLinks.length,
      links: internalLinks.slice(0, 60),
      tabsCount: tabs.length,
      tabs: tabs.slice(0, 30),
      accordionsAndModals: accordionsAndModals.slice(0, 25),
    },
    responsive: {
      overflowCount: overflowingElements.length,
      overflowingElements: overflowingElements.slice(0, 15),
      clippedTextCount: clippedTextElements.length,
      clippedTextElements: clippedTextElements.slice(0, 15),
      smallTouchTargetsCount: smallTouchTargets.length,
      smallTouchTargets: smallTouchTargets.slice(0, 20),
      iosZoomInputsCount: iosZoomInputs.length,
      iosZoomInputs: iosZoomInputs.slice(0, 10),
      stickyBars: stickyBars.slice(0, 6),
    },
    accessibility: {
      h1Count: headings.filter((h) => h.level === 1).length,
      headingSkips,
      lowContrastCount: lowContrastElements.length,
      lowContrastElements: lowContrastElements.slice(0, 15),
      unlabeledInputsCount: unlabeledInputs.length,
      unlabeledInputs: unlabeledInputs.slice(0, 15),
      brokenImagesCount: brokenImages.length,
      brokenImages: brokenImages.slice(0, 10),
      missingAltCount: missingAlt.length,
      missingAlt: missingAlt.slice(0, 10),
    },
    designTokens: {
      topTextColors: topEntries(colors, 10),
      topBackgroundColors: topEntries(bgColors, 10),
      topFontFamilies: topEntries(fonts, 6),
      topFontSizes: topEntries(fontSizes, 10),
      topBorderRadii: topEntries(radii, 8),
    },
  };
}
