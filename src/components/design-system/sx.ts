'use client';

import type { CSSProperties } from 'react';

/**
 * Minimal MUI-`sx` compatibility layer for the design-system Modal/Drawer.
 *
 * The old wrappers typed `contentSx`/`actionsSx` as MUI `SxProps<Theme>`.
 * Three call sites still pass plain style objects in that shape
 * (DocumentPreviewModal, InvoicePreviewModal, AddShipmentExpenseModal).
 * Rather than touching those call sites in this phase, this helper accepts
 * the same flat objects and translates the MUI spacing shorthands
 * (`p`, `px`, `m`, `mx`, … — numbers are MUI spacing units, 1 unit = 8px)
 * and `bgcolor` into plain CSS. Nested selectors (`&:hover`, media
 * queries) are NOT supported — pass those via `className` instead.
 */
export type SxStyle = CSSProperties & {
  p?: number | string;
  px?: number | string;
  py?: number | string;
  pt?: number | string;
  pr?: number | string;
  pb?: number | string;
  pl?: number | string;
  m?: number | string;
  mx?: number | string;
  my?: number | string;
  mt?: number | string;
  mr?: number | string;
  mb?: number | string;
  ml?: number | string;
  gap?: number | string;
  bgcolor?: string;
};

const spacingKeys: Record<string, string[]> = {
  p: ['padding'],
  px: ['paddingLeft', 'paddingRight'],
  py: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'],
  pr: ['paddingRight'],
  pb: ['paddingBottom'],
  pl: ['paddingLeft'],
  m: ['margin'],
  mx: ['marginLeft', 'marginRight'],
  my: ['marginTop', 'marginBottom'],
  mt: ['marginTop'],
  mr: ['marginRight'],
  mb: ['marginBottom'],
  ml: ['marginLeft'],
  gap: ['gap'],
};

function spacingValue(value: number | string): string | number {
  return typeof value === 'number' ? `${value * 8}px` : value;
}

export function sxToStyle(sx?: SxStyle): CSSProperties | undefined {
  if (!sx) return undefined;
  const style: Record<string, string | number | undefined> = {};
  for (const [key, value] of Object.entries(sx)) {
    if (value === undefined) continue;
    // Nested selectors ('&:hover', '&:disabled', media queries) cannot be
    // expressed as inline styles — they are dropped. The wrapper's own
    // variant classes already provide the equivalent hover/disabled look.
    if (typeof value === 'object') continue;
    if (key === 'bgcolor') {
      style.backgroundColor = value as string;
      continue;
    }
    const targets = spacingKeys[key];
    if (targets) {
      for (const target of targets) {
        style[target] = spacingValue(value as number | string);
      }
      continue;
    }
    style[key] = value as string | number;
  }
  return style as CSSProperties;
}
