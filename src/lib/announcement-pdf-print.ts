import { JACXI_LOGO_BASE64 } from './jacxi-pdf-logo-base64';
import { ANNOUNCEMENT_DIVIDER_BASE64 } from './announcement-divider-base64';

export interface AnnouncementDocumentOptions {
  date?: string | null;
  dateLabel?: string | null;
  badgeText?: string | null;
  title: string;
  salutation?: string | null;
  bodyText: string;
  closingNote?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  direction?: 'auto' | 'rtl' | 'ltr' | null;
}

export const SAMPLE_PASHTO_ANNOUNCEMENT: AnnouncementDocumentOptions = {
  date: '09/18/2026',
  dateLabel: 'نېټه:',
  badgeText: 'اړینه خبرتیا',
  title: 'د موټر ملکیت سند (Title) پروسس کولو د کړنلارو په اړه نوي تازه معلومات',
  salutation: 'ګرانه پیرودونکیه،',
  bodyText: `موږ غواړو تاسو ته د کالیفورنیا د موټرو د ریاست **(CA DMV)** د وسایطو ملکیت سند **(Titles)** د پروسس کولو په کړنلارو کې د مهمو بدلونونو په اړه خبر درکړو. څرنګه چې موږ د وسایطو د پیرلو لپاره، په هر ایالت کې وي، خپل ټول د وسایطو ملکیت اسناد له **CA DMV** څخه ترلاسه کوو، نو دغه بدلونونه زموږ پر خدماتو مستقیم اغېز کوي.

له همدې شېبې نافذ: **CA DMV** اوس غوښتنه کوي چې د ټولو وسایطو د پېژندنې شمېرو **(VIN)** تصدیق باید په کالیفورنیا ایالت کې دننه، په شخصي ډول، د **California Highway Patrol (CHP)** یا د **CA DMV** د اړوندو کارکوونکو له خوا ترسره شي. له همدې امله، زموږ ټول د **CA DMV** د وسایطو سند ترلاسه کولو خدمات تر نامعلومې مودې پورې ځنډول شوي دي.

تر بلې خبرتیا پورې، مهرباني وکړئ هغه وسایط مه اخلئ چې یوازې له لاندې اسنادو سره ثبت شوي وي: **Bill of Sale, Junk, Lien یا Scrap**. موږ به ونه شو کولای چې د دغو وسایطو لپاره نوي سندونه ترلاسه کړو. سربېره پر دې، موږ به د دغسې پیرودونو لپاره د **CA DMV** د اسنادو د ترلاسه کولو مسؤلیت هم پر غاړه وانخلو.

د هغو غوښتنلیکونو لپاره چې مخکې له مخکې سپارل شوي دي، موږ په فعاله توګه د حل لارو په لټه کې یو ترڅو اړین اسناد ژر تر ژره ترلاسه او پروسس کړو. همدارنګه، موږ د نورو ایالتونو له لارې د بدیلو سندونو ترلاسه کولو امکانات هم ارزوو. مهرباني وکړئ په یاد ولرئ چې دغه بدیلې لارې ښايي زیات وخت او مختلف اضافي لګښتونه ولري.

موږ لا هم کولای شو د هغو وسایطو لپاره د صادراتو وړ اسناد **(Exportable Documents)** ترلاسه کړو چې **Washington Bill of Sale (WA Bill of Sale)** لري؛ خو دغه اسناد به یوازې د کالیفورنیا له بندر **(Port of California)** څخه د استفادې وړ وي.

موږ ستاسو له صبر، همکارۍ او درک څخه ډېره مننه کوو او هر کله چې نوي معلومات ترلاسه کړو، تاسو ته به یې درسره شریک کړو.`,
  closingNote: 'ستاسو له دوامدارې همکارۍ او ملګرتیا څخه مننه',
  phone: '+1 (925) 20089 27',
  email: 'info@jacxi.com',
  website: 'www.jacxishipping.com',
  direction: 'rtl',
};

export const SAMPLE_ENGLISH_ANNOUNCEMENT: AnnouncementDocumentOptions = {
  date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
  dateLabel: 'Date:',
  badgeText: 'IMPORTANT NOTICE',
  title: 'Operational Update: Vehicle Title & Export Documentation Guidelines',
  salutation: 'Dear Valued Customer,',
  bodyText: `We would like to inform you regarding critical procedural updates for processing **Vehicle Ownership Titles (CA DMV)** across our logistics and dispatch network. As our operations coordinate origin documentation and verification with regional authorities, these updates take immediate effect for all active and incoming consignments.

**Effective Immediately**: Verification requirements now necessitate certified in-person validation for designated vehicle identification numbers **(VIN)** through approved state enforcement officers and transportation department personnel. Consequently, standard title turnaround times may experience scheduling adjustments.

Until further notice, please do not purchase vehicles solely documented with **Bill of Sale, Junk, Lien, or Scrap** without prior export clearance. Replacement titles cannot be expedited under provisional status, and export compliance liability cannot be accepted for unverified title types.

For documentation packages already submitted, our clearance team is actively expediting review with secondary state maritime corridors. Exportable documentation **(Exportable Documents)** processed via **Washington Bill of Sale (WA Bill of Sale)** remains operational for dispatch through designated California marine terminals.

We sincerely appreciate your ongoing cooperation, trust, and partnership as we ensure full regulatory compliance for your international vehicle shipments.`,
  closingNote: 'Thank you for your continued cooperation and partnership.',
  phone: '+1 (925) 20089 27',
  email: 'info@jacxi.com',
  website: 'www.jacxishipping.com',
  direction: 'ltr',
};

const SVG_PHONE_ICON = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
</svg>
`.trim();

const SVG_EMAIL_ICON = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <rect width="20" height="16" x="2" y="4" rx="2"/>
  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
</svg>
`.trim();

const SVG_GLOBE_ICON = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
  <path d="M2 12h20"/>
</svg>
`.trim();

/**
 * Checks whether text contains right-to-left characters (Arabic, Pashto, Dari, Persian, Hebrew)
 */
export function isRTLText(text: string): boolean {
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlRegex.test(text);
}

/**
 * Formats body markdown/plain text into clean HTML paragraphs
 */
export function formatAnnouncementBodyHtml(rawText: string): string {
  if (!rawText) return '';

  // Split into paragraphs by blank lines (2+ newlines) or single newline
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs
    .map((p) => {
      // Escape HTML
      let html = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Convert **bold** or __bold__ to <strong>
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

      // Convert single line breaks to <br/>
      html = html.replace(/\n/g, '<br/>');

      return `<p class="announcement-paragraph">${html}</p>`;
    })
    .join('\n');
}

/**
 * Generates standalone, pixel-perfect HTML matching Jacxi Shipping.pdf
 */
export function generateAnnouncementPrintHtml(options: AnnouncementDocumentOptions): string {
  const {
    date = '09/18/2026',
    dateLabel = null,
    badgeText = 'اړینه خبرتیا',
    title = '',
    salutation = 'ګرانه پیرودونکیه،',
    bodyText = '',
    closingNote = 'ستاسو له دوامدارې همکارۍ او ملګرتیا څخه مننه',
    phone = '+1 (925) 20089 27',
    email = 'info@jacxi.com',
    website = 'www.jacxishipping.com',
    direction = 'auto',
  } = options;

  // Detect direction if auto
  const effectiveDirection =
    direction === 'rtl' || direction === 'ltr'
      ? direction
      : isRTLText(`${title} ${badgeText} ${bodyText}`)
        ? 'rtl'
        : 'ltr';

  const isRtl = effectiveDirection === 'rtl';

  // Format date display
  let formattedDateDisplay = date || '';
  if (formattedDateDisplay) {
    if (dateLabel) {
      formattedDateDisplay = isRtl
        ? `${formattedDateDisplay} :${dateLabel.replace(/[:：]/g, '')}`
        : `${dateLabel.replace(/[:：]/g, '')}: ${formattedDateDisplay}`;
    } else if (isRtl && !formattedDateDisplay.includes('نېټه') && !formattedDateDisplay.includes(':')) {
      formattedDateDisplay = `${formattedDateDisplay} :نېټه`;
    } else if (!isRtl && !formattedDateDisplay.toLowerCase().includes('date') && !formattedDateDisplay.includes(':')) {
      formattedDateDisplay = `Date: ${formattedDateDisplay}`;
    }
  }

  const bodyHtml = formatAnnouncementBodyHtml(bodyText);

  return `<!DOCTYPE html>
<html lang="${isRtl ? 'ps' : 'en'}" dir="${effectiveDirection}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Jacxi Shipping - Official Announcement'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      min-height: 100%;
      background-color: #f1f5f9;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      font-family: ${
        isRtl
          ? "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif"
          : "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
      };
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 20px 0;
    }

    .announcement-container {
      width: 210mm;
      min-height: 297mm;
      background-color: #ffffff;
      margin: 0 auto;
      padding: 38mm 24mm 22mm 24mm;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      box-sizing: border-box;
    }

    /* Print styles */
    @media print {
      html, body {
        background-color: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .announcement-container {
        width: 100% !important;
        min-height: 297mm !important;
        height: auto !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 28mm 20mm 18mm 20mm !important;
        page-break-after: avoid;
        page-break-inside: avoid;
      }

      .no-print {
        display: none !important;
      }
    }

    /* Header */
    .announcement-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      margin-bottom: 4px;
    }

    .header-logo-box {
      flex-shrink: 0;
    }

    .header-logo-img {
      height: 70px;
      width: auto;
      display: block;
      object-fit: contain;
    }

    .header-meta-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: right;
    }

    .badge-label {
      color: #dc2626;
      font-size: 26px;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .date-label {
      color: #1e293b;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
    }

    /* Gold Divider */
    .divider-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 16px 0 20px 0;
    }

    .divider-image {
      width: 100%;
      max-width: 680px;
      height: auto;
      display: block;
    }

    /* Title Pill Banner */
    .title-pill-banner {
      width: 100%;
      background: #334155;
      border-radius: 12px;
      padding: 13px 24px;
      text-align: center;
      color: #ffffff;
      font-size: 17.5px;
      font-weight: 700;
      line-height: 1.45;
      margin-bottom: 24px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
    }

    /* Body Area */
    .announcement-content {
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
      margin-bottom: 20px;
    }

    .salutation-heading {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 14px;
      text-align: ${isRtl ? 'right' : 'left'};
    }

    .announcement-paragraph {
      font-size: 13.5px;
      line-height: 1.82;
      color: #1e293b;
      text-align: justify;
      text-justify: inter-word;
      margin-bottom: 14px;
    }

    .announcement-paragraph strong,
    .announcement-paragraph b {
      font-weight: 750;
      color: #090e17;
    }

    .closing-note {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 24px;
      text-align: ${isRtl ? 'right' : 'left'};
      line-height: 1.5;
    }

    /* Footer Section */
    .announcement-footer {
      width: 100%;
      margin-top: auto;
      display: flex;
      flex-direction: column;
    }

    .contact-icons-row {
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      margin-bottom: 22px;
      padding: 0 10px;
      box-sizing: border-box;
    }

    .contact-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      flex: 1;
    }

    .contact-badge-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #dfb743 0%, #c59b27 50%, #ab7f1b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
      box-shadow: 0 2px 5px rgba(197, 155, 39, 0.28);
    }

    .contact-text-value {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      direction: ltr;
      white-space: nowrap;
    }

    /* Bottom Dark Accent Bar */
    .bottom-accent-bar {
      width: 100%;
      height: 18px;
      background: #334155;
      border-radius: 9px 9px 0 0;
      display: block;
    }
  </style>
</head>
<body>
  <div class="announcement-container" id="announcement-sheet">
    <!-- Header -->
    <header class="announcement-header">
      <div class="header-logo-box">
        <img src="${JACXI_LOGO_BASE64}" alt="Jacxi Shipping Logo" class="header-logo-img" />
      </div>
      <div class="header-meta-box">
        ${badgeText ? `<div class="badge-label">${badgeText}</div>` : ''}
        ${formattedDateDisplay ? `<div class="date-label">${formattedDateDisplay}</div>` : ''}
      </div>
    </header>

    <!-- Gold Heraldic Flourish Divider -->
    <div class="divider-container">
      <img src="${ANNOUNCEMENT_DIVIDER_BASE64}" alt="Decorative Gold Divider" class="divider-image" />
    </div>

    <!-- Title Banner Pill -->
    <div class="title-pill-banner">
      ${title}
    </div>

    <!-- Content Area -->
    <main class="announcement-content">
      ${salutation ? `<div class="salutation-heading">${salutation}</div>` : ''}
      ${bodyHtml}
      ${closingNote ? `<div class="closing-note">${closingNote}</div>` : ''}
    </main>

    <!-- Footer -->
    <footer class="announcement-footer">
      <div class="contact-icons-row">
        <!-- Phone -->
        <div class="contact-card">
          <div class="contact-badge-circle">
            ${SVG_PHONE_ICON}
          </div>
          <span class="contact-text-value">${phone || '+1 (925) 20089 27'}</span>
        </div>

        <!-- Email -->
        <div class="contact-card">
          <div class="contact-badge-circle">
            ${SVG_EMAIL_ICON}
          </div>
          <span class="contact-text-value">${email || 'info@jacxi.com'}</span>
        </div>

        <!-- Website -->
        <div class="contact-card">
          <div class="contact-badge-circle">
            ${SVG_GLOBE_ICON}
          </div>
          <span class="contact-text-value">${website || 'www.jacxishipping.com'}</span>
        </div>
      </div>

      <!-- Rounded Bottom Accent Bar -->
      <div class="bottom-accent-bar"></div>
    </footer>
  </div>

  <script>
    window.addEventListener('load', () => {
      // Auto print if opened in separate print window with print query
      if (window.location.search.includes('print=true')) {
        setTimeout(() => {
          window.print();
        }, 350);
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Triggers clean browser print dialog with fallback iframe
 */
export function printAnnouncementDocument(options: AnnouncementDocumentOptions): void {
  if (typeof window === 'undefined') return;

  const html = generateAnnouncementPrintHtml(options);

  // Attempt window.open
  const printWindow = window.open('', '_blank', 'width=900,height=950,scrollbars=yes,resizable=yes');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 450);
    return;
  }

  // Fallback iframe if popup blocker intervenes
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  iframe.contentDocument?.open();
  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  }, 450);
}

/**
 * Downloads the generated document as a standalone offline HTML file
 */
export function downloadAnnouncementHtml(
  options: AnnouncementDocumentOptions,
  filename = 'Jacxi_Shipping_Announcement.html'
): void {
  if (typeof window === 'undefined') return;

  const html = generateAnnouncementPrintHtml(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
