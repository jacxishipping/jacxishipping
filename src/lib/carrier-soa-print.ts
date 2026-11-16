import { formatMoney as formatCurrency } from '@/lib/format';
import { JACXI_LOGO_BASE64 } from './jacxi-pdf-logo-base64';

export interface StatementItem {
  id: string;
  transactionDate: string | Date;
  description: string;
  category?: string | null;
  reference?: string | null;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance?: number;
  originalAmount?: number | null;
  originalCurrency?: string | null;
  fxRate?: number | null;
}

export interface PrintCarrierSOAOptions {
  company: {
    id: string;
    name: string;
    code?: string | null;
    phone?: string | null;
    address?: string | null;
    country?: string | null;
  };
  statementNumber: string;
  statementDate?: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  currency?: string;
  payoutAmount?: number;
  payoutCurrency?: string;
  fxRate?: number;
  paymentMethod?: string;
  reference?: string;
  items: StatementItem[];
  totalCreditUSD: number;
  totalDebitUSD: number;
  closingBalanceUSD: number;
  notes?: string | null;
}

export function printCarrierSOA(options: PrintCarrierSOAOptions): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the Statement of Account.');
    return;
  }

  const statementDateFormatted = new Date(options.statementDate || new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const periodStartFormatted = options.periodStart
    ? new Date(options.periodStart).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'All Time';

  const periodEndFormatted = options.periodEnd
    ? new Date(options.periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : statementDateFormatted;

  const rowsHtml = options.items
    .map((item, idx) => {
      const dateStr = new Date(item.transactionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const isCredit = item.type === 'CREDIT';
      const fxInfo = item.originalCurrency && item.originalCurrency !== 'USD' && item.originalAmount
        ? `<div style="font-size: 11px; color: #64748b;">${item.originalAmount.toLocaleString()} ${item.originalCurrency} @ ${item.fxRate || 1}</div>`
        : '';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">
          <td style="padding: 10px 8px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 10px 8px; white-space: nowrap;">${dateStr}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 600; color: #0f172a;">${item.description || 'Carrier service'}</div>
            ${fxInfo}
          </td>
          <td style="padding: 10px 8px; color: #475569; font-family: monospace;">${item.reference || '—'}</td>
          <td style="padding: 10px 8px; text-align: right; color: ${isCredit ? '#047857' : '#94a3b8'}; font-weight: ${isCredit ? '600' : 'normal'};">
            ${isCredit ? formatCurrency(item.amount) : '—'}
          </td>
          <td style="padding: 10px 8px; text-align: right; color: ${!isCredit ? '#b91c1c' : '#94a3b8'}; font-weight: ${!isCredit ? '600' : 'normal'};">
            ${!isCredit ? formatCurrency(item.amount) : '—'}
          </td>
        </tr>
      `;
    })
    .join('');

  const multiCurrencySummary = options.payoutCurrency && options.payoutCurrency !== 'USD' && options.payoutAmount
    ? `
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-top: 16px;">
        <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Multi-Currency Settlement Details</div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 13px;">
          <span>Payout Currency & Rate: <strong>${options.payoutCurrency} (1 USD = ${options.fxRate || 1} ${options.payoutCurrency})</strong></span>
          <span>Settled Payout Amount: <strong style="color: #0f172a; font-size: 14px;">${options.payoutAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${options.payoutCurrency}</strong></span>
        </div>
      </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Statement of Account - ${options.company.name} (${options.statementNumber})</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 16px;
        }
        .logo-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-box img {
          height: 48px;
        }
        .company-title {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #0f172a;
        }
        .statement-title {
          text-align: right;
        }
        .statement-title h1 {
          margin: 0;
          font-size: 22px;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta-pill {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        .grid-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin: 20px 0;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
        }
        .info-col h3 {
          margin: 0 0 8px 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
        }
        .info-col p {
          margin: 2px 0;
          font-size: 13px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 8px 8px;
          text-align: left;
        }
        .totals-box {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .totals-table {
          width: 320px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 6px 8px;
          font-size: 13px;
        }
        .totals-table tr.total-row td {
          font-size: 15px;
          font-weight: 800;
          border-top: 2px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          color: #0f172a;
        }
        .signatures {
          margin-top: 48px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          page-break-inside: avoid;
        }
        .sign-block {
          border-top: 1px dashed #94a3b8;
          padding-top: 8px;
          text-align: center;
          font-size: 12px;
          color: #475569;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 8px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #0f172a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Print Statement of Account (SOA)</button>
        <button onclick="window.close()" style="padding: 8px 16px; background: #e2e8f0; color: #0f172a; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>

      <div class="header">
        <div class="logo-box">
          <img src="${JACXI_LOGO_BASE64}" alt="JACXI Logo" />
          <div>
            <div class="company-title">JACXI SHIPPING & LOGISTICS</div>
            <div style="font-size: 11px; color: #64748b;">Global Auto Transport, Ocean Freight & Central Asia Corridors</div>
            <div style="font-size: 11px; color: #64748b;">Phone: +93 70 411 7413 | accounts@jacxishipping.com</div>
          </div>
        </div>
        <div class="statement-title">
          <h1>STATEMENT OF ACCOUNT</h1>
          <div class="meta-pill">SOA Ref: <strong>${options.statementNumber}</strong></div>
          <div class="meta-pill">Date: <strong>${statementDateFormatted}</strong></div>
        </div>
      </div>

      <div class="grid-info">
        <div class="info-col">
          <h3>CARRIER / VENDOR CREDITOR</h3>
          <p style="font-weight: 700; font-size: 15px; color: #0f172a;">${options.company.name}</p>
          ${options.company.code ? `<p>Carrier Code: <strong>${options.company.code}</strong></p>` : ''}
          ${options.company.phone ? `<p>Phone: ${options.company.phone}</p>` : ''}
          ${options.company.address ? `<p>Address: ${options.company.address}${options.company.country ? `, ${options.company.country}` : ''}</p>` : ''}
        </div>
        <div class="info-col">
          <h3>STATEMENT SUMMARY</h3>
          <p>Statement Period: <strong>${periodStartFormatted} – ${periodEndFormatted}</strong></p>
          <p>Payment Method: <strong>${options.paymentMethod || 'Wire Transfer / Electronic Payout'}</strong></p>
          ${options.reference ? `<p>Payment Ref: <strong>${options.reference}</strong></p>` : ''}
          <p>Total Services Audited: <strong>${options.items.length} Transactions</strong></p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 32px;">#</th>
            <th style="width: 90px;">Date</th>
            <th>Description & Multi-Currency FX</th>
            <th style="width: 140px;">Reference</th>
            <th style="width: 110px; text-align: right;">Payable (USD)</th>
            <th style="width: 110px; text-align: right;">Paid (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      ${multiCurrencySummary}

      <div class="totals-box">
        <table class="totals-table">
          <tr>
            <td style="color: #64748b;">Total Incurred Payables:</td>
            <td style="text-align: right; font-weight: 600; color: #047857;">${formatCurrency(options.totalCreditUSD)}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Total Paid / Settled:</td>
            <td style="text-align: right; font-weight: 600; color: #b91c1c;">${formatCurrency(options.totalDebitUSD)}</td>
          </tr>
          <tr class="total-row">
            <td>Net Balance Remaining:</td>
            <td style="text-align: right;">${formatCurrency(options.closingBalanceUSD)}</td>
          </tr>
        </table>
      </div>

      ${options.notes ? `
        <div style="margin-top: 16px; font-size: 12px; color: #475569; background: #f8fafc; padding: 10px; border-radius: 4px;">
          <strong>Notes:</strong> ${options.notes}
        </div>
      ` : ''}

      <div class="signatures">
        <div class="sign-block">
          <div>Prepared By (Finance Dept)</div>
          <div style="margin-top: 32px; font-weight: 600;">JACXI Accounts</div>
        </div>
        <div class="sign-block">
          <div>Approved By (Operations)</div>
          <div style="margin-top: 32px; font-weight: 600;">Director of Logistics</div>
        </div>
        <div class="sign-block">
          <div>Carrier Acknowledgment</div>
          <div style="margin-top: 32px; font-weight: 600;">${options.company.name}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

