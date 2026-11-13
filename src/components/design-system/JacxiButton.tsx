'use client';

import type { ComponentProps, CSSProperties } from 'react';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';

export type JacxiButtonProps = ComponentProps<typeof SpringButton>;

/**
 * JacxiButton — the Jacxi-gold primary button.
 *
 * Why this wrapper exists: JXUI's `SpringButton` renders its `primary` tone
 * from `useJXTheme()` palette CLASSES (`bg-indigo-600`, `text-indigo-600`,
 * …). The JXUI accent union is closed (indigo/violet/emerald/rose/ocean) —
 * there is no gold option, so no theme setting can fix it, and
 * `JxThemeSync`'s `--jx-accent: #D4AF37` does not affect it because the
 * component reads palette classes, not that CSS var. A `className` gold
 * override also loses: SpringButton appends `className` last, but Tailwind
 * ordering decides the winner, and indigo wins (verified: the homepage
 * Track button rendered indigo despite `bg-[var(--accent-gold)]`).
 *
 * The reliable mechanism is an inline `style`: it beats every class, and
 * SpringButton spreads extra props (including `style`) onto the `<button>`.
 * So for the primary tone this wrapper applies Jacxi gold via inline style,
 * using only the existing Jacxi CSS vars from `globals.css` — no new colour:
 *   - solid:   gold background, dark (slate-950) text — the dark-on-gold
 *              treatment the Track button already uses. White text on
 *              #D4AF37 would fail contrast, so `text-white` is dropped.
 *   - outline: transparent background, gold border, theme-aware gold-dark
 *              text (`--accent-gold-text`: #8D7A1F light / #E2C265 dark).
 *   - soft:    gold-tinted background/border with gold-dark text.
 *   - glass:   SpringButton's glass primary is neutral slate, not indigo,
 *              so it is left untouched.
 *
 * Non-primary tones (`success` / `warning` / `danger`) are passed through
 * to SpringButton completely unchanged.
 *
 * Behaviour is identical to SpringButton — it IS a SpringButton underneath
 * (same spring press animation, same click-count badge, same props). Sites
 * whose `className` already wins with `!`-important utilities (e.g. the
 * segmented tab bars) are unaffected by the inline style, because
 * `!important` author rules beat a normal inline style.
 */
const GOLD_SOLID: CSSProperties = {
  backgroundColor: 'var(--accent-gold)',
  borderColor: 'var(--accent-gold)',
  color: '#020617', // slate-950 — dark text on gold, as on the Track button
};

const GOLD_OUTLINE: CSSProperties = {
  backgroundColor: 'transparent',
  borderColor: 'var(--accent-gold)',
  color: 'var(--accent-gold-text)',
};

const GOLD_SOFT: CSSProperties = {
  backgroundColor: 'rgba(212, 175, 55, 0.12)',
  borderColor: 'rgba(212, 175, 55, 0.35)',
  color: 'var(--accent-gold-text)',
};

export function JacxiButton({
  tone = 'primary',
  variant = 'solid',
  style,
  ...props
}: JacxiButtonProps) {
  if (tone !== 'primary') {
    return <SpringButton tone={tone} variant={variant} style={style} {...props} />;
  }

  const goldStyle =
    variant === 'outline' ? GOLD_OUTLINE : variant === 'soft' ? GOLD_SOFT : variant === 'glass' ? undefined : GOLD_SOLID;

  // Gold wins over any background/border/text in the call site's own
  // `style`; unrelated keys (e.g. `fontFamily: 'inherit'`) are preserved.
  return <SpringButton tone="primary" variant={variant} style={{ ...style, ...(goldStyle ?? {}) }} {...props} />;
}

export default JacxiButton;
