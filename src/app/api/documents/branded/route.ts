import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  AnnouncementDocumentOptions,
  generateAnnouncementPrintHtml,
} from '@/lib/announcement-pdf-print';
import { verifySignedDownloadToken } from '../../../../../mcps/jacxishipping/src/oauth';
import { auth } from '@/lib/auth';

function injectPrintToolbar(html: string, title: string): string {
  const toolbarHtml = `
  <div class="no-print" style="position:fixed;top:14px;right:18px;z-index:9999;display:flex;gap:10px;background:rgba(15,23,42,0.92);padding:8px 14px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.4);backdrop-filter:blur(8px);font-family:'Inter',system-ui,sans-serif;direction:ltr;">
    <button onclick="window.print()" style="background:linear-gradient(135deg,#dfb743 0%,#c59b27 50%,#ab7f1b 100%);color:#0f172a;border:none;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;">
      🖨️ Print / Save as PDF
    </button>
    <a href="?${new URLSearchParams({ download: '1' }).toString()}" onclick="event.preventDefault();const u=new URL(window.location.href);u.searchParams.set('download','1');window.location.href=u.toString();" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;padding:8px 14px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;display:flex;align-items:center;gap:6px;">
      ⬇️ Download File
    </a>
  </div>
  `;
  return html.replace('<body>', `<body>\n${toolbarHtml}`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'announcement').toLowerCase();
    const id = searchParams.get('id') || '';
    const dataParam = searchParams.get('data');
    const isDownload = searchParams.get('download') === '1';
    const token = searchParams.get('token');

    // For sensitive data types (gate_pass, shipment_receipt, container_manifest, customer_statement, office_expenses),
    // verify either signed token or active session
    if (type !== 'announcement' && !dataParam) {
      let authorized = false;
      if (token && verifySignedDownloadToken(token)) {
        authorized = true;
      } else {
        const session = await auth();
        if (session?.user) authorized = true;
      }
      if (!authorized) {
        return new NextResponse('Unauthorized: Valid download token or session required.', {
          status: 401,
        });
      }
    }

    // 1. Stateless base64url encoded branded document payload
    if (dataParam) {
      const decoded = JSON.parse(
        Buffer.from(dataParam, 'base64url').toString('utf8')
      ) as AnnouncementDocumentOptions;
      const rawHtml = generateAnnouncementPrintHtml(decoded);
      const html = injectPrintToolbar(rawHtml, decoded.title || 'Jacxi_Document');
      const safeFile = (decoded.title || 'Jacxi_Shipping_Document')
        .slice(0, 40)
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(isDownload
            ? {
                'Content-Disposition': `attachment; filename="${safeFile}.html"`,
              }
            : {}),
        },
      });
    }

    // 2. Saved Document record in Database (`type=announcement` or `type=document` with `id`)
    if ((type === 'announcement' || type === 'document') && id) {
      const docRecord = await prisma.document.findUnique({
        where: { id },
      });

      if (docRecord) {
        if (docRecord.fileUrl.startsWith('data:text/html;base64,')) {
          const b64 = docRecord.fileUrl.replace('data:text/html;base64,', '');
          const rawHtml = Buffer.from(b64, 'base64').toString('utf8');
          const html = injectPrintToolbar(rawHtml, docRecord.name);
          const safeFile = (docRecord.name || 'Jacxi_Document')
            .slice(0, 40)
            .replace(/[^a-zA-Z0-9_-]/g, '_');
          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              ...(isDownload
                ? {
                    'Content-Disposition': `attachment; filename="${safeFile}.html"`,
                  }
                : {}),
            },
          });
        }
      }
    }

    // 3. Branded Gate Pass / Release Token (`type=gate_pass&id=<vinOrShipmentId>`)
    if (type === 'gate_pass' && id) {
      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [
            { id },
            { vehicleVIN: { equals: id, mode: 'insensitive' } },
            { lotNumber: { equals: id, mode: 'insensitive' } },
            { releaseToken: { equals: id, mode: 'insensitive' } },
          ],
        },
        include: {
          user: true,
          container: true,
          dispatch: { include: { company: true } },
          transit: { include: { company: true } },
        },
      });

      if (!shipment) {
        return new NextResponse('Shipment not found for Gate Pass', { status: 404 });
      }

      const vehicleTitle =
        [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
          .filter(Boolean)
          .join(' ') || 'Vehicle';

      const bodyLines = [
        `**OFFICIAL VEHICLE RELEASE GATE PASS & CLEARANCE CERTIFICATE**`,
        `**Release Token:** **${shipment.releaseToken || 'PENDING-ISSUANCE'}**\n**Issue Date:** **${
          shipment.releaseTokenCreatedAt
            ? new Date(shipment.releaseTokenCreatedAt).toLocaleDateString('en-US')
            : new Date().toLocaleDateString('en-US')
        }**\n**Payment Status:** **${shipment.paymentStatus}**`,
        `**Vehicle Details:**\n• **Vehicle:** ${vehicleTitle}\n• **VIN:** **${shipment.vehicleVIN || 'N/A'}**\n• **Lot Number:** ${shipment.lotNumber || 'N/A'} (${shipment.auctionName || 'Auction'})\n• **Color / Type:** ${shipment.vehicleColor || 'N/A'} / ${shipment.vehicleType}\n• **Keys / Title:** Keys: **${shipment.hasKey ? 'YES' : 'NO'}** | Title: **${shipment.hasTitle ? 'YES' : 'NO'}**`,
        `**Customer / Consignee Information:**\n• **Name:** **${shipment.user?.name || 'Valued Customer'}**\n• **Email:** ${shipment.user?.email || 'N/A'}\n• **Phone:** ${shipment.user?.phone || 'N/A'}\n• **Location:** ${[shipment.user?.city, shipment.user?.country].filter(Boolean).join(', ') || 'N/A'}`,
        `**Container & Routing Information:**\n• **Container Number:** **${shipment.container?.containerNumber || 'Unassigned'}**\n• **Port of Loading (POL):** ${shipment.container?.loadingPort || 'N/A'}\n• **Port of Discharge (POD):** ${shipment.container?.destinationPort || 'N/A'}\n• **Current Status:** **${shipment.status}**`,
        `This official Gate Pass authorizes the release of the above-referenced vehicle to the consignee or their authorized representative upon verification of identity and settlement status.`,
      ].join('\n\n');

      const rawHtml = generateAnnouncementPrintHtml({
        date: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        badgeText: `GATE PASS: ${shipment.releaseToken || 'OFFICIAL'}`,
        title: `Vehicle Release Gate Pass — ${vehicleTitle} (VIN: ${shipment.vehicleVIN || shipment.id})`,
        salutation: `Consignee: ${shipment.user?.name || shipment.user?.email || 'Authorized Bearer'}`,
        bodyText: bodyLines,
        closingNote:
          'Authorized by Jacxi Shipping Operations — Verify token authenticity at www.jacxishipping.com',
        direction: 'ltr',
      });

      const html = injectPrintToolbar(rawHtml, `Gate-Pass-${shipment.vehicleVIN || shipment.id}`);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(isDownload
            ? {
                'Content-Disposition': `attachment; filename="Gate-Pass-${shipment.vehicleVIN || shipment.id}.html"`,
              }
            : {}),
        },
      });
    }

    // 4. Branded Shipment Receipt & Expense Breakdown (`type=shipment_receipt&id=<vinOrId>`)
    if (type === 'shipment_receipt' && id) {
      const shipment = await prisma.shipment.findFirst({
        where: {
          OR: [
            { id },
            { vehicleVIN: { equals: id, mode: 'insensitive' } },
            { lotNumber: { equals: id, mode: 'insensitive' } },
          ],
        },
        include: {
          user: true,
          container: true,
          charges: { orderBy: { createdAt: 'asc' } },
          ledgerEntries: {
            where: { type: 'DEBIT' },
            orderBy: { transactionDate: 'asc' },
          },
          invoices: {
            include: { lineItems: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!shipment) {
        return new NextResponse('Shipment not found', { status: 404 });
      }

      const vehicleTitle =
        [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
          .filter(Boolean)
          .join(' ') || 'Vehicle';

      const expenseLines: string[] = [];
      let totalExpenses = 0;

      if (shipment.price) {
        expenseLines.push(`• **Base Shipping Fare:** **$${shipment.price.toFixed(2)} USD**`);
        totalExpenses += shipment.price;
      }
      if (shipment.purchasePrice) {
        expenseLines.push(`• **Vehicle Purchase Price:** **$${shipment.purchasePrice.toFixed(2)} USD**`);
        totalExpenses += shipment.purchasePrice;
      }

      for (const entry of shipment.ledgerEntries) {
        expenseLines.push(
          `• **${entry.description}** (${new Date(entry.transactionDate).toLocaleDateString('en-US')}): **$${entry.amount.toFixed(2)} USD**`
        );
        totalExpenses += entry.amount;
      }

      if (expenseLines.length === 0) {
        expenseLines.push('• No itemized charges recorded yet.');
      }

      const bodyText = [
        `**Vehicle & Consignment Summary:**\n• **Vehicle:** **${vehicleTitle}**\n• **VIN:** **${shipment.vehicleVIN || 'N/A'}**\n• **Lot Number:** ${shipment.lotNumber || 'N/A'}\n• **Container:** **${shipment.container?.containerNumber || 'Unassigned'}**\n• **Shipment Status:** **${shipment.status}** | **Payment Status:** **${shipment.paymentStatus}**`,
        `**Customer / Billed To:**\n• **Name:** **${shipment.user?.name || 'Valued Customer'}**\n• **Email:** ${shipment.user?.email || 'N/A'}\n• **Phone:** ${shipment.user?.phone || 'N/A'}`,
        `**Itemized Shipment Charges & Expenses:**\n${expenseLines.join('\n')}`,
        `**Total Recorded Shipment Charges:** **$${totalExpenses.toFixed(2)} USD**`,
      ].join('\n\n');

      const rawHtml = generateAnnouncementPrintHtml({
        date: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        badgeText: 'SHIPMENT RECEIPT',
        title: `Official Shipment Receipt & Expense Statement — ${vehicleTitle}`,
        salutation: `Prepared for: ${shipment.user?.name || shipment.user?.email}`,
        bodyText,
        closingNote: 'Thank you for shipping with Jacxi Shipping.',
        direction: 'ltr',
      });

      const html = injectPrintToolbar(rawHtml, `Shipment-Receipt-${shipment.vehicleVIN || shipment.id}`);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(isDownload
            ? {
                'Content-Disposition': `attachment; filename="Shipment-Receipt-${shipment.vehicleVIN || shipment.id}.html"`,
              }
            : {}),
        },
      });
    }

    // 5. Branded Container Manifest (`type=container_manifest&id=<containerNumber>`)
    if (type === 'container_manifest' && id) {
      const container = await prisma.container.findFirst({
        where: {
          OR: [
            { id },
            { containerNumber: { equals: id, mode: 'insensitive' } },
            { bookingNumber: { equals: id, mode: 'insensitive' } },
          ],
        },
        include: {
          company: true,
          shipments: { include: { user: true } },
          expenses: { orderBy: { date: 'desc' } },
        },
      });

      if (!container) {
        return new NextResponse('Container not found', { status: 404 });
      }

      const vehicleRows =
        container.shipments.length > 0
          ? container.shipments
              .map(
                (s, i) =>
                  `${i + 1}. **${[s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}** — VIN: **${s.vehicleVIN || 'N/A'}** | Lot: ${s.lotNumber || 'N/A'} | Customer: **${s.user?.name || s.user?.email || 'N/A'}** | Status: **${s.status}**`
              )
              .join('\n')
          : 'No vehicles currently assigned to this container.';

      const bodyText = [
        `**Container & Vessel Specifications:**\n• **Container Number:** **${container.containerNumber}**\n• **Booking Number:** ${container.bookingNumber || 'N/A'}\n• **Shipping Line:** ${container.shippingLine || 'N/A'}\n• **Vessel / Voyage:** ${container.vesselName || 'TBA'} / ${container.voyageNumber || 'TBA'}\n• **Port of Loading (POL):** ${container.loadingPort || 'N/A'}\n• **Port of Discharge (POD):** ${container.destinationPort || 'N/A'}\n• **Estimated Arrival (ETA):** ${container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString('en-US') : 'TBA'}\n• **Status:** **${container.status}** (${container.shipments.length} / ${container.maxCapacity} units loaded)`,
        `**Loaded Vehicles Manifest (${container.shipments.length} Units):**\n${vehicleRows}`,
      ].join('\n\n');

      const rawHtml = generateAnnouncementPrintHtml({
        date: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        badgeText: 'CARGO MANIFEST',
        title: `Official Container Manifest — ${container.containerNumber}`,
        salutation: `Shipping Line: ${container.shippingLine || 'Ocean Carrier'} | POD: ${container.destinationPort || 'Destination'}`,
        bodyText,
        closingNote: 'Certified Cargo Manifest — Jacxi Shipping International Logistics',
        direction: 'ltr',
      });

      const html = injectPrintToolbar(rawHtml, `Container-Manifest-${container.containerNumber}`);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(isDownload
            ? {
                'Content-Disposition': `attachment; filename="Container-Manifest-${container.containerNumber}.html"`,
              }
            : {}),
        },
      });
    }

    // 6. Branded Customer Statement (`type=customer_statement&id=<customerQuery>`)
    if (type === 'customer_statement' && id) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id },
            { email: { equals: id, mode: 'insensitive' } },
            { loginCode: { equals: id, mode: 'insensitive' } },
            { name: { contains: id, mode: 'insensitive' } },
          ],
        },
        include: {
          ledgerEntries: {
            include: { shipment: { select: { vehicleVIN: true } } },
            orderBy: { transactionDate: 'desc' },
          },
          invoices: {
            orderBy: { issueDate: 'desc' },
          },
        },
      });

      if (!user) {
        return new NextResponse('Customer not found', { status: 404 });
      }

      let totalDebits = 0;
      let totalCredits = 0;
      for (const e of user.ledgerEntries) {
        if (e.type === 'DEBIT') totalDebits += e.amount;
        else totalCredits += e.amount;
      }
      const balance = user.ledgerEntries[0]?.balance ?? totalDebits - totalCredits;

      const invoiceLines =
        user.invoices.length > 0
          ? user.invoices
              .map(
                (inv) =>
                  `• **${inv.invoiceNumber}** (${new Date(inv.issueDate).toLocaleDateString('en-US')}) — Status: **${inv.status}** | Total: **$${inv.total.toFixed(2)}** | Paid: $${inv.amountPaid.toFixed(2)} | Remaining: **$${inv.amountRemaining.toFixed(2)}**`
              )
              .join('\n')
          : '• No invoices issued.';

      const ledgerLines =
        user.ledgerEntries.length > 0
          ? user.ledgerEntries
              .slice(0, 40)
              .map(
                (e) =>
                  `• [${new Date(e.transactionDate).toLocaleDateString('en-US')}] **${e.type}**: ${e.description} — **$${e.amount.toFixed(2)} USD**`
              )
              .join('\n')
          : '• No ledger transactions recorded.';

      const bodyText = [
        `**Account Summary:**\n• **Customer:** **${user.name || user.email}** (${user.email})\n• **Phone:** ${user.phone || 'N/A'} | **Login Code:** **${user.loginCode || 'N/A'}**\n• **Total Debits (Charges):** **$${totalDebits.toFixed(2)} USD**\n• **Total Credits (Payments):** **$${totalCredits.toFixed(2)} USD**\n• **Current Account Balance:** **$${balance.toFixed(2)} USD**`,
        `**Invoices (${user.invoices.length}):**\n${invoiceLines}`,
        `**Ledger Transactions:**\n${ledgerLines}`,
      ].join('\n\n');

      const rawHtml = generateAnnouncementPrintHtml({
        date: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        badgeText: 'ACCOUNT STATEMENT',
        title: `Customer Financial Statement — ${user.name || user.email}`,
        salutation: `Prepared for: ${user.name || user.email}`,
        bodyText,
        closingNote: 'Thank you for your business with Jacxi Shipping.',
        direction: 'ltr',
      });

      const html = injectPrintToolbar(rawHtml, `Customer-Statement-${user.name || user.id}`);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...(isDownload
            ? {
                'Content-Disposition': `attachment; filename="Customer-Statement-${(user.name || user.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.html"`,
              }
            : {}),
        },
      });
    }

    // 7. Fallback query-param announcement document
    const title = searchParams.get('title') || 'Jacxi Shipping Official Document';
    const bodyText = searchParams.get('bodyText') || searchParams.get('body') || '';
    const badgeText = searchParams.get('badgeText') || 'IMPORTANT NOTICE';
    const salutation = searchParams.get('salutation') || 'Dear Valued Customer,';
    const closingNote =
      searchParams.get('closingNote') ||
      'Thank you for your continued cooperation and partnership.';
    const direction = (searchParams.get('direction') as 'rtl' | 'ltr' | 'auto') || 'auto';

    const rawHtml = generateAnnouncementPrintHtml({
      title,
      bodyText,
      badgeText,
      salutation,
      closingNote,
      direction,
    });
    const html = injectPrintToolbar(rawHtml, title);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    return new NextResponse(`Failed to render branded document: ${error?.message || error}`, {
      status: 500,
    });
  }
}
