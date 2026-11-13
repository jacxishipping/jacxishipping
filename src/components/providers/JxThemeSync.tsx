'use client';

import { useEffect } from 'react';
import { useJXTheme } from '@jacxishippingorg/jx-ui-react';
import { useTheme } from '@/hooks/useTheme';

/**
 * JxThemeSync — the single bridge between Jacxi's theme store and JXUI.
 *
 * Source of truth is Jacxi `useTheme` (localStorage key `theme`, values
 * `light | dark | system`, drives `data-theme` + `.dark` on <html>, which is
 * what globals.css reads). This component, rendered once inside the root
 * JXThemeProvider, makes JXUI follow it:
 *  - setMode(resolvedTheme) whenever Jacxi's resolved mode changes (Jacxi
 *    wins on disagreement; the JXUI key `jacxi-jxui-mode` is overwritten).
 *  - setRadiusScale('md') once (control 8px / card 12px — the closest match
 *    to the live product; JXUI defaults to 'lg').
 *  - Re-applies the gold --jx-accent variables after the provider mounts.
 *    JXUI's provider only writes --jx-accent / --jx-accent-halo /
 *    --jx-accent-soft from its closed five-accent union (default indigo
 *    #4f46e5); there is no gold palette in its public API, so the sync
 *    re-asserts #D4AF37 and watches the <html> style attribute so any later
 *    provider write is corrected immediately.
 */
const GOLD_HEX = '#D4AF37';
const GOLD_HALO = 'rgba(212, 175, 55, 0.2)';
const GOLD_SOFT = 'rgba(212, 175, 55, 0.12)';

function applyGoldAccent() {
  const root = document.documentElement;
  root.style.setProperty('--jx-accent', GOLD_HEX);
  root.style.setProperty('--jx-accent-halo', GOLD_HALO);
  root.style.setProperty('--jx-accent-soft', GOLD_SOFT);
}

export function JxThemeSync() {
  const { resolvedTheme } = useTheme();
  const { setMode, setRadiusScale } = useJXTheme();

  useEffect(() => {
    setRadiusScale('md');
  }, [setRadiusScale]);

  useEffect(() => {
    setMode(resolvedTheme);
  }, [resolvedTheme, setMode]);

  useEffect(() => {
    applyGoldAccent();
    const observer = new MutationObserver(() => {
      if (
        document.documentElement.style
          .getPropertyValue('--jx-accent')
          .trim()
          .toLowerCase() !== GOLD_HEX.toLowerCase()
      ) {
        applyGoldAccent();
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
