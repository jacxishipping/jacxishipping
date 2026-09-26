import { prisma } from '@/lib/db';
import { buildTrackingResponse, type NormalizedTracking } from '@/lib/tracking-response';

export type TelegramShipmentSummary = {
  id: string;
  vehicleLabel: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  vehicleColor: string | null;
  lotNumber: string | null;
  auctionName: string | null;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  price: number | null;
  containerNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLine: string | null;
  loadingPort: string | null;
  destinationPort: string | null;
  departureDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  currentLocation: string | null;
  progress: number;
  arrivalPhotos: string[];
  vehiclePhotos: string[];
  totalPhotosCount: number;
  createdAt: string;
};

export function formatStatusBadge(status: string): string {
  switch (status) {
    case 'ON_HAND':
      return '🟡 Yard On-Hand';
    case 'DISPATCHED':
      return '🚛 Inland Dispatched';
    case 'IN_PORT':
      return '⚓ At Export Port';
    case 'LOADED':
      return '📦 Loaded in Container';
    case 'IN_TRANSIT':
      return '🌊 Ocean Transit';
    case 'ARRIVED':
      return '🏁 Arrived at Destination';
    case 'DELIVERED':
      return '✅ Delivered';
    default:
      return `📍 ${status.replace(/_/g, ' ')}`;
  }
}

export function formatProgressBar(progress: number): string {
  const bounded = Math.max(0, Math.min(100, Math.round(progress)));
  const totalBlocks = 10;
  const filledBlocks = Math.round((bounded / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${bounded}%`;
}

function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

export async function getCustomerShipments(userId: string): Promise<TelegramShipmentSummary[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jacxishipping.com';

  const shipments = await prisma.shipment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      container: {
        select: {
          containerNumber: true,
          vesselName: true,
          voyageNumber: true,
          shippingLine: true,
          loadingPort: true,
          destinationPort: true,
          departureDate: true,
          estimatedArrival: true,
          actualArrival: true,
          currentLocation: true,
          progress: true,
        },
      },
      qualityChecks: {
        select: { photos: true },
      },
    },
  });

  return shipments.map((s) => {
    const vehicleLabel = [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || s.vehicleType || 'Vehicle';
    const qualityPhotos = s.qualityChecks.flatMap((qc) => qc.photos || []);
    const allArrival = [...(s.arrivalPhotos || []), ...qualityPhotos].map((url) => normalizeImageUrl(url, baseUrl));
    const allVehicle = (s.vehiclePhotos || []).map((url) => normalizeImageUrl(url, baseUrl));

    return {
      id: s.id,
      vehicleLabel,
      vehicleYear: s.vehicleYear,
      vehicleMake: s.vehicleMake,
      vehicleModel: s.vehicleModel,
      vehicleVIN: s.vehicleVIN,
      vehicleColor: s.vehicleColor,
      lotNumber: s.lotNumber,
      auctionName: s.auctionName,
      status: s.status,
      statusLabel: formatStatusBadge(s.status),
      paymentStatus: s.paymentStatus,
      price: s.price,
      containerNumber: s.container?.containerNumber || null,
      vesselName: s.container?.vesselName || null,
      voyageNumber: s.container?.voyageNumber || null,
      shippingLine: s.container?.shippingLine || null,
      loadingPort: s.container?.loadingPort || null,
      destinationPort: s.container?.destinationPort || null,
      departureDate: s.container?.departureDate ? s.container.departureDate.toLocaleDateString() : null,
      estimatedArrival: s.container?.estimatedArrival ? s.container.estimatedArrival.toLocaleDateString() : null,
      actualArrival: s.container?.actualArrival ? s.container.actualArrival.toLocaleDateString() : null,
      currentLocation: s.container?.currentLocation || (s.status === 'ON_HAND' ? 'Export Yard' : 'In Transit'),
      progress: s.container?.progress ?? (s.status === 'DELIVERED' ? 100 : s.status === 'ARRIVED' ? 85 : s.status === 'IN_TRANSIT' ? 60 : 30),
      arrivalPhotos: allArrival,
      vehiclePhotos: allVehicle,
      totalPhotosCount: allArrival.length + allVehicle.length,
      createdAt: s.createdAt.toLocaleDateString(),
    };
  });
}

export async function getCustomerShipmentByIdOrVin(
  userId: string,
  identifier: string
): Promise<TelegramShipmentSummary | null> {
  const cleanId = identifier.trim();
  const all = await getCustomerShipments(userId);
  return all.find(
    (s) =>
      s.id === cleanId ||
      (s.vehicleVIN && s.vehicleVIN.toUpperCase() === cleanId.toUpperCase()) ||
      (s.lotNumber && s.lotNumber.toUpperCase() === cleanId.toUpperCase()) ||
      (s.containerNumber && s.containerNumber.toUpperCase() === cleanId.toUpperCase())
  ) || null;
}

export async function getCustomerFinanceOverview(userId: string) {
  const [latestLedger, invoices, shipments] = await Promise.all([
    prisma.ledgerEntry.findFirst({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    }),
    prisma.userInvoice.findMany({
      where: { userId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        amountPaid: true,
        amountRemaining: true,
        dueDate: true,
        issueDate: true,
      },
      orderBy: { issueDate: 'desc' },
      take: 5,
    }),
    prisma.shipment.findMany({
      where: { userId },
      select: {
        id: true,
        paymentStatus: true,
        price: true,
      },
    }),
  ]);

  let totalDue = 0;
  let totalPaid = 0;

  for (const invoice of invoices) {
    if (['PENDING', 'OVERDUE'].includes(invoice.status)) {
      totalDue += invoice.amountRemaining ?? invoice.total;
    }
    totalPaid += invoice.amountPaid ?? (invoice.status === 'PAID' ? invoice.total : 0);
  }

  const currentBalance = latestLedger?.balance ?? totalDue;

  return {
    currentBalance,
    totalDue,
    totalPaid,
    shipmentsCount: shipments.length,
    recentInvoices: invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: inv.total,
      remaining: inv.amountRemaining,
      dueDate: inv.dueDate ? inv.dueDate.toLocaleDateString() : 'N/A',
    })),
  };
}

export function formatShipmentCard(shipment: TelegramShipmentSummary): string {
  const lines: string[] = [
    `🚗 <b>${escapeHtml(shipment.vehicleLabel)}</b>`,
    `<b>Status:</b> ${shipment.statusLabel}`,
    `<b>Progress:</b> <code>${formatProgressBar(shipment.progress)}</code>`,
    '',
  ];

  if (shipment.vehicleVIN) {
    lines.push(`🔑 <b>VIN:</b> <code>${escapeHtml(shipment.vehicleVIN)}</code>`);
  }
  if (shipment.lotNumber) {
    lines.push(`🏷 <b>Lot #:</b> ${escapeHtml(shipment.lotNumber)}${shipment.auctionName ? ` (${escapeHtml(shipment.auctionName)})` : ''}`);
  }
  if (shipment.vehicleColor) {
    lines.push(`🎨 <b>Color:</b> ${escapeHtml(shipment.vehicleColor)}`);
  }

  if (shipment.containerNumber) {
    lines.push('');
    lines.push(`📦 <b>Container:</b> <code>${escapeHtml(shipment.containerNumber)}</code>`);
    if (shipment.vesselName) {
      lines.push(`🚢 <b>Vessel:</b> ${escapeHtml(shipment.vesselName)}${shipment.voyageNumber ? ` (Voyage: ${escapeHtml(shipment.voyageNumber)})` : ''}`);
    }
    if (shipment.shippingLine) {
      lines.push(`🏢 <b>Shipping Line:</b> ${escapeHtml(shipment.shippingLine)}`);
    }
    if (shipment.loadingPort) {
      lines.push(`🛫 <b>Origin:</b> ${escapeHtml(shipment.loadingPort)}${shipment.departureDate ? ` (Dep: ${shipment.departureDate})` : ''}`);
    }
    if (shipment.destinationPort) {
      lines.push(`🛬 <b>Destination:</b> ${escapeHtml(shipment.destinationPort)}${shipment.estimatedArrival ? ` (ETA: ${shipment.estimatedArrival})` : ''}`);
    }
  }

  lines.push('');
  lines.push(`📸 <b>Photos Available:</b> ${shipment.totalPhotosCount} photo(s)`);
  lines.push(`💳 <b>Payment:</b> ${shipment.paymentStatus === 'COMPLETED' || shipment.paymentStatus === 'PAID' ? '✅ Paid' : '⏳ Pending / Unpaid'}`);

  return lines.join('\n');
}

export function formatShipmentListItem(shipment: TelegramShipmentSummary, index: number): string {
  return [
    `${index + 1}. <b>${escapeHtml(shipment.vehicleLabel)}</b>`,
    `   • Status: ${shipment.statusLabel}`,
    `   • VIN: <code>${shipment.vehicleVIN || 'N/A'}</code>`,
    `   • Container: <code>${shipment.containerNumber || 'Pending'}</code>`,
    `   • Photos: 📸 <b>${shipment.totalPhotosCount}</b> photo(s)`,
  ].join('\n');
}

export function formatFinanceTelegramMessage(finance: Awaited<ReturnType<typeof getCustomerFinanceOverview>>): string {
  const lines: string[] = [
    '💰 <b>Financial & Invoice Summary</b>',
    '━━━━━━━━━━━━━━━━━━━━━',
    `📊 <b>Account Balance:</b> <code>$${finance.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>`,
    `⏳ <b>Total Due:</b> <code>$${finance.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>`,
    `✅ <b>Total Paid:</b> <code>$${finance.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>`,
    '',
  ];

  if (finance.recentInvoices.length > 0) {
    lines.push('📋 <b>Recent Invoices:</b>');
    finance.recentInvoices.forEach((inv) => {
      const icon = inv.status === 'PAID' ? '✅' : inv.status === 'OVERDUE' ? '🚨' : '⏳';
      lines.push(`${icon} <b>${escapeHtml(inv.invoiceNumber)}</b>: $${inv.total.toFixed(2)} (${inv.status}) • Due: ${inv.dueDate}`);
    });
  } else {
    lines.push('✨ <i>No outstanding invoices at this time.</i>');
  }

  return lines.join('\n');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
