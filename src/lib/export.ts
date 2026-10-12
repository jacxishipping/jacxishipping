// CSV Export Utility
export function exportToCSV<T extends Record<string, any>>(data: T[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Escape quotes and wrap in quotes if contains comma/quote/newline
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export with custom headers
export function exportToCSVWithHeaders<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T & string; label: string }[],
  filename: string
) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const csvContent = [
    // Header row with custom labels
    headers.map(h => h.label).join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header.key];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export to Excel (using CSV with UTF-8 BOM for Excel compatibility)
export function exportToExcel<T extends Record<string, any>>(data: T[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Add UTF-8 BOM for Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export to Excel with custom headers (using CSV with UTF-8 BOM for Excel compatibility)
export function exportToExcelWithHeaders<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T & string; label: string }[],
  filename: string
) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const csvContent = [
    // Header row with custom labels
    headers.map(h => h.label).join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header.key];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Format data for export (clean up dates, booleans, etc.)
export function formatDataForExport<T extends Record<string, any>>(data: T[]): Record<string, any>[] {
  return data.map(row => {
    const formatted: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        formatted[key] = value.toISOString().split('T')[0];
      } else if (typeof value === 'boolean') {
        formatted[key] = value ? 'Yes' : 'No';
      } else if (typeof value === 'object' && value !== null) {
        formatted[key] = JSON.stringify(value);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  });
}

export interface FormattedShipmentExportRow {
  id: string;
  vehicle: string;
  vin: string;
  lotNumber: string;
  auction: string;
  vehicleType: string;
  vehicleColor: string;
  status: string;
  yardReceived: string;
  hasKey: string;
  titleStatus: string;
  container: string;
  transit: string;
  dispatch: string;
  loadingPort: string;
  destinationPort: string;
  etd: string;
  eta: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  shippingFare: string;
  purchasePrice: string;
  purchasePricePaid: string;
  purchaseRemaining: string;
  paymentStatus: string;
  trackingUrl: string;
  createdAt: string;
}

export const SHIPMENT_EXPORT_HEADERS: { key: keyof FormattedShipmentExportRow; label: string }[] = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'vin', label: 'VIN' },
  { key: 'lotNumber', label: 'Lot #' },
  { key: 'auction', label: 'Auction' },
  { key: 'vehicleType', label: 'Vehicle Type' },
  { key: 'vehicleColor', label: 'Color' },
  { key: 'status', label: 'Status' },
  { key: 'yardReceived', label: 'Yard Received' },
  { key: 'hasKey', label: 'Keys' },
  { key: 'titleStatus', label: 'Title Status' },
  { key: 'customerName', label: 'Customer' },
  { key: 'customerEmail', label: 'Customer Email' },
  { key: 'customerPhone', label: 'Customer Phone' },
  { key: 'container', label: 'Container #' },
  { key: 'transit', label: 'Transit #' },
  { key: 'dispatch', label: 'Dispatch #' },
  { key: 'loadingPort', label: 'Loading Port' },
  { key: 'destinationPort', label: 'Destination Port' },
  { key: 'etd', label: 'ETD (Departure)' },
  { key: 'eta', label: 'ETA (Arrival)' },
  { key: 'shippingFare', label: 'Shipping Fare ($)' },
  { key: 'purchasePrice', label: 'Purchase Price ($)' },
  { key: 'purchasePricePaid', label: 'Amount Paid ($)' },
  { key: 'purchaseRemaining', label: 'Balance Remaining ($)' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'serviceType', label: 'Service Type' },
  { key: 'trackingUrl', label: 'Tracking Link' },
  { key: 'createdAt', label: 'Created Date' },
];

/**
 * Customer-allowed shipment export headers.
 * Strictly excludes internal administrative columns:
 * - Other customer contact details (name, email, phone)
 * - Internal transit / dispatch booking references
 * - Internal financial costs / ledger margins (purchase price, amount paid, balance)
 */
export const CUSTOMER_SHIPMENT_EXPORT_HEADERS: { key: keyof FormattedShipmentExportRow; label: string }[] = [
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'vin', label: 'VIN' },
  { key: 'lotNumber', label: 'Lot #' },
  { key: 'auction', label: 'Auction' },
  { key: 'vehicleType', label: 'Vehicle Type' },
  { key: 'vehicleColor', label: 'Color' },
  { key: 'status', label: 'Status' },
  { key: 'yardReceived', label: 'Yard Received' },
  { key: 'hasKey', label: 'Keys' },
  { key: 'titleStatus', label: 'Title Status' },
  { key: 'container', label: 'Container #' },
  { key: 'loadingPort', label: 'Loading Port' },
  { key: 'destinationPort', label: 'Destination Port' },
  { key: 'etd', label: 'ETD (Departure)' },
  { key: 'eta', label: 'ETA (Arrival)' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'shippingFare', label: 'Shipping Fare ($)' },
  { key: 'trackingUrl', label: 'Tracking Link' },
  { key: 'createdAt', label: 'Created Date' },
];

export function sanitizeShipmentForCustomer(
  row: FormattedShipmentExportRow,
  allowedHeaders?: { key: keyof FormattedShipmentExportRow; label: string }[]
): Record<string, string> {
  const headers = allowedHeaders || CUSTOMER_SHIPMENT_EXPORT_HEADERS;
  const sanitized: Record<string, string> = {};
  for (const header of headers) {
    sanitized[header.key] = row[header.key] ?? '';
  }
  return sanitized;
}

export function formatShipmentForExport(shipment: any, isCustomer = false): FormattedShipmentExportRow {
  const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ')
    .trim() || shipment.vehicleType || 'Vehicle';

  const purchasePrice = typeof shipment.purchasePrice === 'number' ? shipment.purchasePrice : 0;
  const purchasePricePaid = typeof shipment.purchasePricePaid === 'number' ? shipment.purchasePricePaid : 0;
  const remaining = Math.max(0, purchasePrice - purchasePricePaid);
  const shippingFare = typeof shipment.price === 'number' ? shipment.price : 0;

  const vin = shipment.vehicleVIN || shipment.vin || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jacxishipping.com';
  const trackingCode = vin || shipment.id || '';
  const trackingUrl = trackingCode ? `${origin}/tracking?vin=${encodeURIComponent(trackingCode)}` : '';

  const hasKey = shipment.hasKey === true ? 'Yes' : shipment.hasKey === false ? 'No' : '-';
  const titleStatus = shipment.titleStatus ? String(shipment.titleStatus).replace(/_/g, ' ') : (shipment.hasTitle ? 'Available' : '-');

  return {
    id: shipment.id || '',
    vehicle,
    vin,
    lotNumber: shipment.lotNumber || '',
    auction: shipment.auctionName || '',
    vehicleType: shipment.vehicleType || '',
    vehicleColor: shipment.vehicleColor || '',
    status: (shipment.status || '').replace(/_/g, ' '),
    yardReceived: shipment.yardReceived ? 'Yes' : 'No',
    hasKey,
    titleStatus,
    container: shipment.container?.containerNumber || (typeof shipment.container === 'string' ? shipment.container : ''),
    transit: isCustomer ? '' : (shipment.transit?.referenceNumber || ''),
    dispatch: isCustomer ? '' : (shipment.dispatch?.referenceNumber || ''),
    loadingPort: shipment.container?.loadingPort || shipment.dispatch?.origin || shipment.transit?.origin || '',
    destinationPort: shipment.container?.destinationPort || shipment.dispatch?.destination || shipment.transit?.destination || '',
    etd: shipment.container?.departureDate ? new Date(shipment.container.departureDate).toLocaleDateString() : '',
    eta: shipment.container?.estimatedArrival ? new Date(shipment.container.estimatedArrival).toLocaleDateString() : '',
    customerName: isCustomer ? '' : (shipment.user?.name || shipment.customer || ''),
    customerEmail: isCustomer ? '' : (shipment.user?.email || ''),
    customerPhone: isCustomer ? '' : (shipment.user?.phone || ''),
    serviceType: isCustomer ? '' : (shipment.serviceType ? (shipment.serviceType === 'PURCHASE_AND_SHIPPING' ? 'Purchase + Shipping' : 'Shipping Only') : ''),
    shippingFare: shippingFare > 0 ? shippingFare.toFixed(2) : '',
    purchasePrice: !isCustomer && purchasePrice > 0 ? purchasePrice.toFixed(2) : '',
    purchasePricePaid: !isCustomer && purchasePricePaid > 0 ? purchasePricePaid.toFixed(2) : '',
    purchaseRemaining: !isCustomer && remaining > 0 ? remaining.toFixed(2) : '',
    paymentStatus: shipment.paymentStatus || '',
    trackingUrl,
    createdAt: shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : '',
  };
}

export interface PrintableManifestOptions {
  title?: string;
  subtitle?: string;
  rows: FormattedShipmentExportRow[];
  headers?: { key: keyof FormattedShipmentExportRow; label: string }[];
  isCustomer?: boolean;
}

/**
 * Generates and prints a clean, branded PDF vehicle manifest.
 */
export function exportToPrintableManifest({
  title = 'Shipment Manifest',
  subtitle,
  rows,
  headers,
  isCustomer = false,
}: PrintableManifestOptions) {
  if (!rows || rows.length === 0) {
    throw new Error('No shipments to print');
  }

  const activeHeaders = headers || (isCustomer ? CUSTOMER_SHIPMENT_EXPORT_HEADERS : SHIPMENT_EXPORT_HEADERS);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  // For print tables, omit long raw URL links to prevent overflow
  const printHeaders = activeHeaders.filter((h) => h.key !== 'trackingUrl');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${dateStr}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 16px; color: #111827; background: #fff; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .brand span { color: #d97706; }
    .doc-meta { text-align: right; font-size: 11px; color: #4b5563; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; background: #f3f4f6; color: #374151; margin-top: 4px; }
    .summary-strip { display: flex; gap: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin-bottom: 14px; font-size: 11px; }
    .summary-item { display: flex; flex-direction: column; }
    .summary-label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .summary-val { font-size: 13px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #0f172a; color: #f8fafc; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 5px; }
    td { padding: 5px; border-bottom: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 14px; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="padding: 6px 14px; background: #0f172a; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Print / Save PDF</button>
    <button onclick="window.close()" style="padding: 6px 14px; background: #e2e8f0; color: #334155; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Close</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">JACXI <span>SHIPPING</span></div>
      <div style="font-size: 13px; font-weight: 700; color: #334155; margin-top: 2px;">${title}</div>
      ${subtitle ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${subtitle}</div>` : ''}
    </div>
    <div class="doc-meta">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div class="badge">${isCustomer ? 'Customer Vehicle Manifest' : 'Master Operations Manifest'}</div>
    </div>
  </div>
  <div class="summary-strip">
    <div class="summary-item">
      <span class="summary-label">Total Vehicles</span>
      <span class="summary-val">${rows.length}</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Report View</span>
      <span class="summary-val">${isCustomer ? 'Client Safe' : 'Master Ops'}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 24px;">#</th>
        ${printHeaders.map((h) => `<th>${h.label}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, idx) => `
        <tr>
          <td style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
          ${printHeaders.map((h) => `<td>${row[h.key] || '-'}</td>`).join('')}
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  <div class="footer">
    <div>JACXI Shipping Logistics System &bull; Fast, Global Auto Freight</div>
    <div>Generated ${new Date().toLocaleString()} &bull; Page 1 of 1</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export function exportShipments(
  shipments: any[],
  format: 'csv' | 'excel' | 'pdf' = 'csv',
  filename = 'shipments',
  options?: {
    isCustomer?: boolean;
    headers?: { key: keyof FormattedShipmentExportRow; label: string }[];
    title?: string;
  }
) {
  if (!shipments || shipments.length === 0) {
    throw new Error('No shipments to export');
  }

  const isCustomer = Boolean(options?.isCustomer);
  const headers = options?.headers || (isCustomer ? CUSTOMER_SHIPMENT_EXPORT_HEADERS : SHIPMENT_EXPORT_HEADERS);
  const formattedRows = shipments.map((s) => formatShipmentForExport(s, isCustomer));

  if (format === 'pdf') {
    exportToPrintableManifest({
      title: options?.title || (isCustomer ? 'Customer Vehicle Manifest' : 'Shipment Manifest'),
      rows: formattedRows,
      headers,
      isCustomer,
    });
    return;
  }

  if (format === 'excel') {
    exportToExcelWithHeaders(formattedRows, headers, filename);
  } else {
    exportToCSVWithHeaders(formattedRows, headers, filename);
  }
}


