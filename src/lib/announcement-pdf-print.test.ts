import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isRTLText,
  formatAnnouncementBodyHtml,
  generateAnnouncementPrintHtml,
  SAMPLE_PASHTO_ANNOUNCEMENT,
  SAMPLE_ENGLISH_ANNOUNCEMENT,
} from './announcement-pdf-print';

describe('announcement-pdf-print', () => {
  it('correctly detects RTL vs LTR text', () => {
    assert.strictEqual(isRTLText('اړینه خبرتیا'), true);
    assert.strictEqual(isRTLText('ګرانه پیرودونکیه،'), true);
    assert.strictEqual(isRTLText('Important Announcement'), false);
    assert.strictEqual(isRTLText('Jacxi Shipping 2026'), false);
  });

  it('correctly formats body HTML paragraphs and bold markers', () => {
    const raw = `First paragraph with **bold item** inside.

Second paragraph with multiple lines.`;

    const html = formatAnnouncementBodyHtml(raw);
    assert.ok(html.includes('<p class="announcement-paragraph">'));
    assert.ok(html.includes('<strong>bold item</strong>'));
    assert.ok(html.includes('Second paragraph'));
  });

  it('generates complete standalone HTML matching Jacxi Shipping letterhead for Pashto announcement', () => {
    const html = generateAnnouncementPrintHtml(SAMPLE_PASHTO_ANNOUNCEMENT);

    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('dir="rtl"'));
    assert.ok(html.includes('/jacxi-logo-transparent.png')); // Jacxi transparent logo
    assert.ok(html.includes('data:image/png;base64,')); // Jacxi transparent logo fallback
    assert.ok(html.includes('Decorative Gold Divider')); // Gold divider
    assert.ok(html.includes('اړینه خبرتیا')); // Badge
    assert.ok(html.includes('09/18/2026 :نېټه')); // Date
    assert.ok(html.includes('د موټر ملکیت سند (Title)')); // Title pill
    assert.ok(html.includes('+1 (925) 20089 27')); // Phone
    assert.ok(html.includes('info@jacxi.com')); // Email
    assert.ok(html.includes('www.jacxishipping.com')); // Website
    assert.ok(html.includes('bottom-accent-bar')); // Bottom bar
  });

  it('generates complete standalone HTML for English announcement', () => {
    const html = generateAnnouncementPrintHtml(SAMPLE_ENGLISH_ANNOUNCEMENT);

    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('dir="ltr"'));
    assert.ok(html.includes('IMPORTANT NOTICE'));
    assert.ok(html.includes('Operational Update: Vehicle Title'));
    assert.ok(html.includes('info@jacxi.com'));
  });
});
