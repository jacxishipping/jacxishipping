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
  container: string;
  transit: string;
  dispatch: string;
  loadingPort: string;
  destinationPort: string;
  eta: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  purchasePrice: string;
  purchasePricePaid: string;
  purchaseRemaining: string;
  paymentStatus: string;
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
  { key: 'customerName', label: 'Customer' },
  { key: 'customerEmail', label: 'Customer Email' },
  { key: 'customerPhone', label: 'Customer Phone' },
  { key: 'container', label: 'Container #' },
  { key: 'transit', label: 'Transit #' },
  { key: 'dispatch', label: 'Dispatch #' },
  { key: 'loadingPort', label: 'Loading Port' },
  { key: 'destinationPort', label: 'Destination Port' },
  { key: 'eta', label: 'ETA' },
  { key: 'purchasePrice', label: 'Purchase Price ($)' },
  { key: 'purchasePricePaid', label: 'Amount Paid ($)' },
  { key: 'purchaseRemaining', label: 'Balance Remaining ($)' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'serviceType', label: 'Service Type' },
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
  { key: 'container', label: 'Container #' },
  { key: 'loadingPort', label: 'Loading Port' },
  { key: 'destinationPort', label: 'Destination Port' },
  { key: 'eta', label: 'ETA' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'createdAt', label: 'Created Date' },
];

export function sanitizeShipmentForCustomer(row: FormattedShipmentExportRow): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const header of CUSTOMER_SHIPMENT_EXPORT_HEADERS) {
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

  return {
    id: shipment.id || '',
    vehicle,
    vin: shipment.vehicleVIN || shipment.vin || '',
    lotNumber: shipment.lotNumber || '',
    auction: shipment.auctionName || '',
    vehicleType: shipment.vehicleType || '',
    vehicleColor: shipment.vehicleColor || '',
    status: (shipment.status || '').replace(/_/g, ' '),
    yardReceived: shipment.yardReceived ? 'Yes' : 'No',
    container: shipment.container?.containerNumber || (typeof shipment.container === 'string' ? shipment.container : ''),
    transit: isCustomer ? '' : (shipment.transit?.referenceNumber || ''),
    dispatch: isCustomer ? '' : (shipment.dispatch?.referenceNumber || ''),
    loadingPort: shipment.container?.loadingPort || shipment.dispatch?.origin || shipment.transit?.origin || '',
    destinationPort: shipment.container?.destinationPort || shipment.dispatch?.destination || shipment.transit?.destination || '',
    eta: shipment.container?.estimatedArrival ? new Date(shipment.container.estimatedArrival).toLocaleDateString() : '',
    customerName: isCustomer ? '' : (shipment.user?.name || shipment.customer || ''),
    customerEmail: isCustomer ? '' : (shipment.user?.email || ''),
    customerPhone: isCustomer ? '' : (shipment.user?.phone || ''),
    serviceType: isCustomer ? '' : (shipment.serviceType ? (shipment.serviceType === 'PURCHASE_AND_SHIPPING' ? 'Purchase + Shipping' : 'Shipping Only') : ''),
    purchasePrice: !isCustomer && purchasePrice > 0 ? purchasePrice.toFixed(2) : '',
    purchasePricePaid: !isCustomer && purchasePricePaid > 0 ? purchasePricePaid.toFixed(2) : '',
    purchaseRemaining: !isCustomer && remaining > 0 ? remaining.toFixed(2) : '',
    paymentStatus: shipment.paymentStatus || '',
    createdAt: shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString() : '',
  };
}

export function exportShipments(
  shipments: any[],
  format: 'csv' | 'excel' = 'csv',
  filename = 'shipments',
  options?: { isCustomer?: boolean }
) {
  if (!shipments || shipments.length === 0) {
    throw new Error('No shipments to export');
  }

  const isCustomer = Boolean(options?.isCustomer);
  const headers = isCustomer ? CUSTOMER_SHIPMENT_EXPORT_HEADERS : SHIPMENT_EXPORT_HEADERS;
  const formattedRows = shipments.map((s) => formatShipmentForExport(s, isCustomer));

  if (format === 'excel') {
    exportToExcelWithHeaders(formattedRows, headers, filename);
  } else {
    exportToCSVWithHeaders(formattedRows, headers, filename);
  }
}

