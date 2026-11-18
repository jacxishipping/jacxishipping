import { prisma } from '@/lib/db';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { randomBytes } from 'node:crypto';
import { extractJsonObject } from '@/lib/ai/json';

export type ActionCardType =
  | 'SHIPMENT'
  | 'CONTAINER'
  | 'DISPATCH'
  | 'TRANSIT'
  | 'LEDGER'
  | 'INVOICE'
  | 'NAVIGATION'
  | 'CONFIRMATION'
  | 'OVERVIEW'
  | 'CARRIER'
  | 'DAMAGE'
  | 'WHATSAPP'
  | 'TOKEN';

export interface ActionCard {
  type: ActionCardType;
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  metrics?: Array<{ label: string; value: string }>;
  data?: Record<string, any>;
  primaryAction?: {
    label: string;
    href?: string;
    actionId?: string;
    payload?: Record<string, any>;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    actionId?: string;
    payload?: Record<string, any>;
  };
}

export interface AdminCopilotResponse {
  reply: string;
  toolExecuted?: string;
  actionCards?: ActionCard[];
  suggestedPrompts: string[];
}

export interface ContextUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

export interface CopilotContext {
  currentPath?: string;
  selectedShipmentId?: string;
  selectedContainerId?: string;
}

// =========================================================================
// Deterministic Execution Tools
// =========================================================================

export async function searchShipmentsTool(query: string, status?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = query.trim();
  const whereClause: any = {};

  if (status) {
    whereClause.status = status as any;
  }

  if (cleanQ) {
    whereClause.OR = [
      { id: cleanQ },
      { vehicleVIN: { contains: cleanQ, mode: 'insensitive' } },
      { lotNumber: { contains: cleanQ, mode: 'insensitive' } },
      { vehicleMake: { contains: cleanQ, mode: 'insensitive' } },
      { vehicleModel: { contains: cleanQ, mode: 'insensitive' } },
      { user: { name: { contains: cleanQ, mode: 'insensitive' } } },
      { user: { email: { contains: cleanQ, mode: 'insensitive' } } },
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where: whereClause,
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      vehicleVIN: true,
      vehicleYear: true,
      vehicleMake: true,
      vehicleModel: true,
      vehicleColor: true,
      status: true,
      lotNumber: true,
      purchaseLocation: true,
      damageCost: true,
      releaseToken: true,
      user: { select: { name: true, email: true, phone: true } },
      container: { select: { containerNumber: true, destinationPort: true } },
      dispatch: { select: { referenceNumber: true } },
      transit: { select: { referenceNumber: true } },
    },
  });

  if (shipments.length === 0) {
    return {
      reply: cleanQ
        ? `No shipments matched "${cleanQ}". Would you like to create a new shipment or search with different keywords?`
        : 'No shipments found in the system.',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Shipments Directory',
          subtitle: 'Browse all on-hand and in-transit vehicles',
          primaryAction: { label: 'Go to Shipments', href: '/dashboard/shipments' },
          secondaryAction: { label: '+ Create Shipment', href: '/dashboard/shipments/new' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = shipments.map((s) => {
    const title = `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.vehicleVIN || 'Vehicle';
    let tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
    if (s.status === 'DELIVERED') tone = 'success';
    else if (s.status === 'IN_TRANSIT' || s.status === 'IN_TRANSIT_TO_DESTINATION') tone = 'info';
    else if (s.status === 'DISPATCHING') tone = 'warning';
    else if (s.status === 'ON_HAND') tone = 'warning';

    return {
      type: 'SHIPMENT',
      title,
      subtitle: `VIN: ${s.vehicleVIN || 'N/A'} · Lot: ${s.lotNumber || 'N/A'}`,
      badge: { label: s.status, tone },
      metrics: [
        { label: 'Customer', value: s.user?.name || s.user?.email || 'Unassigned' },
        { label: 'Container', value: s.container?.containerNumber || 'None' },
        { label: 'Location / POD', value: `${s.purchaseLocation || 'Yard'} → ${s.container?.destinationPort || 'POD'}` },
      ],
      data: { shipmentId: s.id, vin: s.vehicleVIN, releaseToken: s.releaseToken },
      primaryAction: { label: 'View Details', href: `/dashboard/shipments/${s.id}` },
      secondaryAction: {
        label: 'WhatsApp Update',
        actionId: 'draft_whatsapp',
        payload: { shipmentId: s.id, vin: s.vehicleVIN },
      },
    };
  });

  return {
    reply: `Found **${shipments.length}** shipment(s) matching your request:`,
    actionCards,
  };
}

export async function searchContainersTool(query: string, status?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = query.trim();
  const whereClause: any = {};

  if (status) {
    whereClause.status = status;
  }

  if (cleanQ) {
    whereClause.OR = [
      { containerNumber: { contains: cleanQ, mode: 'insensitive' } },
      { bookingNumber: { contains: cleanQ, mode: 'insensitive' } },
      { shippingLine: { contains: cleanQ, mode: 'insensitive' } },
      { vesselName: { contains: cleanQ, mode: 'insensitive' } },
      { loadingPort: { contains: cleanQ, mode: 'insensitive' } },
      { destinationPort: { contains: cleanQ, mode: 'insensitive' } },
    ];
  }

  const containers = await prisma.container.findMany({
    where: whereClause,
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      containerNumber: true,
      bookingNumber: true,
      shippingLine: true,
      vesselName: true,
      loadingPort: true,
      destinationPort: true,
      status: true,
      estimatedArrival: true,
      departureDate: true,
      shipments: { select: { id: true, vehicleVIN: true, vehicleMake: true } },
    },
  });

  if (containers.length === 0) {
    return {
      reply: cleanQ
        ? `No ocean containers matched "${cleanQ}". Would you like to create a new container or check active ocean shipments?`
        : 'No containers currently recorded.',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Ocean Containers',
          subtitle: 'Inspect ocean bookings, vessel schedules, and manifests',
          primaryAction: { label: 'View Containers', href: '/dashboard/containers' },
          secondaryAction: { label: '+ New Container', href: '/dashboard/containers/new' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = containers.map((c) => {
    let tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
    if (c.status === 'RELEASED' || c.status === 'ARRIVED_PORT' || c.status === 'CLOSED') tone = 'success';
    else if (c.status === 'IN_TRANSIT' || c.status === 'LOADED') tone = 'info';
    else if (c.status === 'WAITING_FOR_LOADING' || c.status === 'CREATED') tone = 'warning';

    const etaStr = c.estimatedArrival ? new Date(c.estimatedArrival).toLocaleDateString() : 'TBD';

    return {
      type: 'CONTAINER',
      title: c.containerNumber,
      subtitle: `Booking: ${c.bookingNumber || 'N/A'} · Line: ${c.shippingLine || 'N/A'}`,
      badge: { label: c.status, tone },
      metrics: [
        { label: 'Vehicles', value: `${c.shipments.length} cars loaded` },
        { label: 'Ports', value: `${c.loadingPort || 'POL'} → ${c.destinationPort || 'POD'}` },
        { label: 'ETA', value: etaStr },
      ],
      primaryAction: { label: 'View Container', href: `/dashboard/containers/${c.id}` },
      secondaryAction: { label: 'Ocean Manifest', href: `/dashboard/containers/${c.id}` },
    };
  });

  return {
    reply: `Found **${containers.length}** ocean container(s):`,
    actionCards,
  };
}

export async function getSystemOverviewTool(): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const [
    totalShipments,
    onHandShipments,
    inTransitShipments,
    deliveredShipments,
    activeContainers,
    activeDispatches,
    unpaidInvoices,
    activeTransits,
  ] = await Promise.all([
    prisma.shipment.count(),
    prisma.shipment.count({ where: { status: 'ON_HAND' } }),
    prisma.shipment.count({ where: { status: { in: ['IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'] } } }),
    prisma.shipment.count({ where: { status: 'DELIVERED' } }),
    prisma.container.count({ where: { status: { in: ['WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT'] } } }),
    prisma.dispatch.count({ where: { status: { in: ['PENDING', 'DISPATCHED'] } } }),
    prisma.userInvoice.aggregate({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.transit.count({ where: { status: { in: ['PENDING', 'IN_TRANSIT'] } } }),
  ]);

  const unpaidTotal = unpaidInvoices._sum.total || 0;

  const card: ActionCard = {
    type: 'OVERVIEW',
    title: 'JACXI Shipping Operations Brief',
    subtitle: 'Real-time platform operations and financial summary',
    badge: { label: 'System Live', tone: 'success' },
    metrics: [
      { label: 'On-Hand Yard', value: `${onHandShipments} cars` },
      { label: 'In-Transit / Ocean', value: `${inTransitShipments} cars` },
      { label: 'Ocean Containers', value: `${activeContainers} active` },
      { label: 'Inland Dispatches', value: `${activeDispatches} active` },
      { label: 'Overland Transits', value: `${activeTransits} active` },
      { label: 'Unpaid Receivables', value: `$${unpaidTotal.toLocaleString()}` },
      { label: 'Total Shipments', value: `${totalShipments} cars` },
    ],
    primaryAction: { label: 'Operations Dashboard', href: '/dashboard/operations' },
    secondaryAction: { label: 'Financial Overview', href: '/dashboard/finance' },
  };

  return {
    reply: `### 📊 Real-Time Operations Overview\n- **Vehicles On-Hand:** ${onHandShipments}\n- **In-Transit / Ocean:** ${inTransitShipments}\n- **Delivered All-Time:** ${deliveredShipments}\n- **Active Containers:** ${activeContainers}\n- **Inland Towing Dispatches:** ${activeDispatches}\n- **Overland Transit Legs:** ${activeTransits}\n- **Outstanding Invoices:** ${unpaidInvoices._count} ($${unpaidTotal.toLocaleString()} USD)`,
    actionCards: [card],
  };
}

export async function getCustomerLedgerTool(customerQuery: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = customerQuery.trim();
  const customer = await prisma.user.findFirst({
    where: {
      OR: [
        { id: cleanQ },
        { email: { equals: cleanQ, mode: 'insensitive' } },
        { name: { contains: cleanQ, mode: 'insensitive' } },
        { phone: { contains: cleanQ } },
        { loginCode: { equals: cleanQ } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          amountPaid: true,
        },
      },
      shipments: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, vehicleVIN: true, vehicleMake: true, vehicleModel: true, status: true },
      },
    },
  });

  if (!customer) {
    return {
      reply: `Could not locate customer matching "${cleanQ}". Would you like to view the Customer Directory?`,
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Customer Directory',
          subtitle: 'Search and manage customer ledgers, contact info, and shipments',
          primaryAction: { label: 'View Customers', href: '/dashboard/customers' },
        },
      ],
    };
  }

  const totalBilled = customer.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPaid = customer.invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const balanceDue = totalBilled - totalPaid;

  const card: ActionCard = {
    type: 'LEDGER',
    title: customer.name || customer.email,
    subtitle: `${customer.email} · Phone: ${customer.phone || 'N/A'}`,
    badge: {
      label: balanceDue > 0 ? `Due: $${balanceDue.toFixed(2)}` : 'Account Paid',
      tone: balanceDue > 0 ? 'warning' : 'success',
    },
    metrics: [
      { label: 'Total Invoiced', value: `$${totalBilled.toFixed(2)}` },
      { label: 'Total Paid', value: `$${totalPaid.toFixed(2)}` },
      { label: 'Outstanding Balance', value: `$${balanceDue.toFixed(2)}` },
      { label: 'Total Shipments', value: `${customer.shipments.length} recent` },
    ],
    primaryAction: { label: 'View Customer Ledger', href: `/dashboard/customers?search=${encodeURIComponent(customer.name || customer.email)}` },
    secondaryAction: { label: 'Invoices', href: `/dashboard/invoices?search=${encodeURIComponent(customer.name || customer.email)}` },
  };

  return {
    reply: `### 💵 Customer Ledger: ${customer.name || customer.email}\n- **Total Invoiced:** $${totalBilled.toFixed(2)} USD\n- **Total Collected:** $${totalPaid.toFixed(2)} USD\n- **Net Balance Due:** **$${balanceDue.toFixed(2)} USD**`,
    actionCards: [card],
  };
}

export async function listInvoicesTool(status?: string, query?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const whereClause: any = {};
  if (status) {
    whereClause.status = status as any;
  }
  if (query) {
    whereClause.OR = [
      { invoiceNumber: { contains: query, mode: 'insensitive' } },
      { user: { name: { contains: query, mode: 'insensitive' } } },
      { user: { email: { contains: query, mode: 'insensitive' } } },
    ];
  }

  const invoices = await prisma.userInvoice.findMany({
    where: whereClause,
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      amountPaid: true,
      status: true,
      dueDate: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (invoices.length === 0) {
    return {
      reply: 'No invoices found matching your filter criteria.',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Invoice Hub',
          subtitle: 'Create customer invoices or manage receivables',
          primaryAction: { label: 'Go to Invoices', href: '/dashboard/invoices' },
          secondaryAction: { label: '+ New Invoice', href: '/dashboard/invoices/new' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = invoices.map((inv) => {
    let tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
    if (inv.status === 'PAID') tone = 'success';
    else if (inv.status === 'PENDING') tone = 'warning';
    else if (inv.status === 'OVERDUE') tone = 'danger';

    return {
      type: 'INVOICE',
      title: inv.invoiceNumber,
      subtitle: `Customer: ${inv.user?.name || inv.user?.email || 'N/A'}`,
      badge: { label: inv.status, tone },
      metrics: [
        { label: 'Amount', value: `$${(inv.total || 0).toFixed(2)}` },
        { label: 'Paid', value: `$${(inv.amountPaid || 0).toFixed(2)}` },
        { label: 'Due Date', value: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Upon receipt' },
      ],
      primaryAction: { label: 'Open Invoice', href: `/dashboard/invoices/${inv.id}` },
    };
  });

  return {
    reply: `Found **${invoices.length}** invoice(s):`,
    actionCards,
  };
}

export async function listDispatchesTool(status?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const whereClause: any = {};
  if (status) {
    whereClause.status = status as any;
  }

  const dispatches = await prisma.dispatch.findMany({
    where: whereClause,
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      referenceNumber: true,
      origin: true,
      destination: true,
      status: true,
      cost: true,
      notes: true,
      company: { select: { name: true, phone: true } },
      shipments: { select: { id: true, vehicleVIN: true, vehicleMake: true } },
    },
  });

  if (dispatches.length === 0) {
    return {
      reply: 'No dispatches found.',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Dispatch Management',
          subtitle: 'Coordinate inland towing and vehicle pickup legs',
          primaryAction: { label: 'Go to Dispatches', href: '/dashboard/dispatches' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = dispatches.map((d) => ({
    type: 'DISPATCH',
    title: d.referenceNumber,
    subtitle: `Carrier: ${d.company?.name || 'Assigned Carrier'}`,
    badge: { label: d.status, tone: d.status === 'COMPLETED' ? 'success' : 'info' },
    metrics: [
      { label: 'Route', value: `${d.origin} → ${d.destination}` },
      { label: 'Vehicles', value: `${d.shipments.length} assigned` },
      { label: 'Cost', value: d.cost ? `$${d.cost.toFixed(2)}` : 'TBD' },
    ],
    primaryAction: { label: 'View Dispatch', href: `/dashboard/dispatches/${d.id}` },
  }));

  return {
    reply: `Found **${dispatches.length}** dispatch order(s):`,
    actionCards,
  };
}

export async function listTransitsTool(status?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const whereClause: any = {};
  if (status) {
    whereClause.status = status as any;
  }

  const transits = await prisma.transit.findMany({
    where: whereClause,
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      referenceNumber: true,
      origin: true,
      destination: true,
      status: true,
      cost: true,
      deliveryReceiverName: true,
      company: { select: { name: true, phone: true } },
      shipments: { select: { id: true, vehicleVIN: true, vehicleMake: true } },
    },
  });

  if (transits.length === 0) {
    return {
      reply: 'No transit legs found.',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Transit Legs',
          subtitle: 'Monitor overland transport, border crossings, and final delivery legs',
          primaryAction: { label: 'Go to Transits', href: '/dashboard/transits' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = transits.map((t) => ({
    type: 'TRANSIT',
    title: t.referenceNumber,
    subtitle: `Carrier: ${t.company?.name || 'Assigned Carrier'}`,
    badge: { label: t.status, tone: t.status === 'DELIVERED' ? 'success' : 'info' },
    metrics: [
      { label: 'Route', value: `${t.origin} → ${t.destination}` },
      { label: 'Shipments', value: `${t.shipments.length} vehicles` },
    ],
    primaryAction: { label: 'View Transit', href: `/dashboard/transits/${t.id}` },
  }));

  return {
    reply: `Found **${transits.length}** transit leg(s):`,
    actionCards,
  };
}

export async function searchCarriersTool(query?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = query?.trim() || '';
  const whereClause: any = { isActive: true };

  if (cleanQ) {
    whereClause.OR = [
      { name: { contains: cleanQ, mode: 'insensitive' } },
      { code: { contains: cleanQ, mode: 'insensitive' } },
      { country: { contains: cleanQ, mode: 'insensitive' } },
      { email: { contains: cleanQ, mode: 'insensitive' } },
    ];
  }

  const carriers = await prisma.company.findMany({
    where: whereClause,
    take: 6,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      phone: true,
      email: true,
      country: true,
      isDispatch: true,
      isTransit: true,
      isShipping: true,
      dispatches: { where: { status: { in: ['PENDING', 'DISPATCHED'] } }, select: { id: true } },
      transits: { where: { status: { in: ['PENDING', 'IN_TRANSIT'] } }, select: { id: true } },
    },
  });

  if (carriers.length === 0) {
    return {
      reply: cleanQ
        ? `No active carriers found matching "${cleanQ}".`
        : 'No carriers currently configured.',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Carriers & Companies',
          subtitle: 'Add or configure transport and towing partner companies',
          primaryAction: { label: 'Open Companies Hub', href: '/dashboard/companies' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = carriers.map((c) => {
    const roles: string[] = [];
    if (c.isDispatch) roles.push('Towing/Dispatch');
    if (c.isTransit) roles.push('Overland Transit');
    if (c.isShipping) roles.push('Ocean Line');

    return {
      type: 'CARRIER',
      title: c.name,
      subtitle: `${c.code || 'CARRIER'} · Country: ${c.country || 'Global'}`,
      badge: {
        label: roles.join(' · ') || 'Carrier',
        tone: 'info',
      },
      metrics: [
        { label: 'Phone', value: c.phone || 'N/A' },
        { label: 'Email', value: c.email || 'N/A' },
        { label: 'Active Jobs', value: `${c.dispatches.length + c.transits.length} runs` },
      ],
      primaryAction: { label: 'View Carrier', href: `/dashboard/companies/${c.id}` },
    };
  });

  return {
    reply: `Found **${carriers.length}** carrier partner(s):`,
    actionCards,
  };
}

export async function getShipmentDamageTool(query?: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = query?.trim() || '';
  const whereClause: any = {
    damageCost: { gt: 0 },
  };

  if (cleanQ) {
    whereClause.OR = [
      { vehicleVIN: { contains: cleanQ, mode: 'insensitive' } },
      { lotNumber: { contains: cleanQ, mode: 'insensitive' } },
      { vehicleMake: { contains: cleanQ, mode: 'insensitive' } },
      { vehicleModel: { contains: cleanQ, mode: 'insensitive' } },
    ];
  }

  const damagedShipments = await prisma.shipment.findMany({
    where: whereClause,
    take: 6,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      vehicleVIN: true,
      vehicleMake: true,
      vehicleModel: true,
      vehicleYear: true,
      damageCost: true,
      arrivalPhotos: true,
      vehiclePhotos: true,
      status: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (damagedShipments.length === 0) {
    return {
      reply: cleanQ
        ? `No damage records found matching "${cleanQ}".`
        : 'All current shipments have clean condition records (no damage flagged).',
      actionCards: [
        {
          type: 'NAVIGATION',
          title: 'Vehicle Inspections',
          subtitle: 'Run AI damage detection or inspect condition reports',
          primaryAction: { label: 'Inspection Reports', href: '/dashboard/inspections' },
        },
      ],
    };
  }

  const actionCards: ActionCard[] = damagedShipments.map((s) => ({
    type: 'DAMAGE',
    title: `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.vehicleVIN || 'Vehicle',
    subtitle: `VIN: ${s.vehicleVIN || 'N/A'}`,
    badge: { label: `Damage: $${(s.damageCost || 0).toFixed(2)}`, tone: 'danger' },
    metrics: [
      { label: 'Customer', value: s.user?.name || s.user?.email || 'N/A' },
      { label: 'Photos', value: `${(s.arrivalPhotos?.length || 0) + (s.vehiclePhotos?.length || 0)} photo(s)` },
      { label: 'Status', value: s.status },
    ],
    primaryAction: { label: 'Inspect Vehicle', href: `/dashboard/shipments/${s.id}` },
    secondaryAction: { label: 'Run AI Damage Scan', href: `/dashboard/shipments/${s.id}?tab=photos` },
  }));

  return {
    reply: `Found **${damagedShipments.length}** shipment(s) with recorded damage:`,
    actionCards,
  };
}

export async function draftWhatsAppUpdateTool(
  shipmentIdOrVin: string,
  note?: string
): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = shipmentIdOrVin.trim();
  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        { id: cleanQ },
        { vehicleVIN: cleanQ },
      ],
    },
    select: {
      id: true,
      vehicleVIN: true,
      vehicleYear: true,
      vehicleMake: true,
      vehicleModel: true,
      status: true,
      purchaseLocation: true,
      releaseToken: true,
      container: { select: { containerNumber: true, destinationPort: true, estimatedArrival: true } },
      user: { select: { name: true, phone: true, email: true } },
    },
  });

  if (!shipment) {
    return {
      reply: `Shipment "${cleanQ}" was not found to draft an update.`,
      actionCards: [],
    };
  }

  const vehicleName = `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';
  const customerName = shipment.user?.name || 'Valued Customer';
  const phone = shipment.user?.phone?.replace(/[^0-9+]/g, '') || '';
  const eta = shipment.container?.estimatedArrival
    ? new Date(shipment.container.estimatedArrival).toLocaleDateString()
    : 'Pending carrier schedule';

  const statusIcons: Record<string, string> = {
    ON_HAND: '📍 *Arrived at Yard*',
    DISPATCHING: '🚚 *Inland Towing Dispatched*',
    IN_TRANSIT: '🚢 *Loaded on Ocean Vessel*',
    RELEASED: '✅ *Customs Cleared & Released*',
    IN_TRANSIT_TO_DESTINATION: '🚛 *In Final Overland Transit*',
    DELIVERED: '🏁 *Successfully Delivered*',
  };

  const statusLabel = statusIcons[shipment.status] || `📦 *${shipment.status}*`;

  const draftMessage = `🚗 *JACXI Shipping Milestone Notification*
Dear ${customerName},

We are pleased to provide an update on your vehicle shipment:
• *Vehicle:* ${vehicleName}
• *VIN:* ${shipment.vehicleVIN || 'N/A'}
• *Milestone:* ${statusLabel}
${shipment.container?.containerNumber ? `• *Container:* ${shipment.container.containerNumber}\n• *POD:* ${shipment.container.destinationPort || 'POD'}\n• *ETA:* ${eta}` : ''}
${shipment.releaseToken ? `• *Release Gate Pass:* ${shipment.releaseToken}` : ''}
${note ? `• *Note:* ${note}` : ''}

🔗 Track live updates: https://app.jacxishipping.com/tracking?vin=${shipment.vehicleVIN || ''}

Thank you for choosing JACXI Shipping!
_JACXI Automated Operations Logistics_`;

  const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(draftMessage)}` : undefined;

  const card: ActionCard = {
    type: 'WHATSAPP',
    title: `WhatsApp Draft: ${vehicleName}`,
    subtitle: `Customer: ${customerName} · Phone: ${phone || 'No phone recorded'}`,
    badge: { label: 'Ready to Send', tone: 'success' },
    metrics: [
      { label: 'Recipient', value: customerName },
      { label: 'Milestone', value: shipment.status },
    ],
    data: { messageText: draftMessage, waUrl },
    primaryAction: waUrl
      ? { label: 'Open in WhatsApp', href: waUrl }
      : { label: 'Open Customer Profile', href: `/dashboard/customers?search=${encodeURIComponent(customerName)}` },
    secondaryAction: {
      label: 'View Shipment',
      href: `/dashboard/shipments/${shipment.id}`,
    },
  };

  return {
    reply: `### 📱 WhatsApp Milestone Update Draft\n\`\`\`text\n${draftMessage}\n\`\`\``,
    actionCards: [card],
  };
}

export async function generateReleaseTokenTool(
  shipmentIdOrVin: string,
  user: ContextUser
): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const cleanQ = shipmentIdOrVin.trim();
  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        { id: cleanQ },
        { vehicleVIN: cleanQ },
      ],
    },
    select: {
      id: true,
      vehicleVIN: true,
      vehicleMake: true,
      vehicleModel: true,
      status: true,
      releaseToken: true,
      container: { select: { status: true, containerNumber: true } },
    },
  });

  if (!shipment) {
    return {
      reply: `Shipment "${cleanQ}" was not found. Please verify the VIN or shipment ID.`,
      actionCards: [],
    };
  }

  const isReleased = String(shipment.status) === 'RELEASED' || shipment.container?.status === 'RELEASED';

  if (!isReleased) {
    return {
      reply: `⚠️ Shipment **${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''} (${shipment.vehicleVIN})** is currently in **${shipment.status}** status. Release tokens can only be generated once the vehicle or its container is officially marked **RELEASED** by customs/operations.`,
      actionCards: [
        {
          type: 'SHIPMENT',
          title: `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`,
          subtitle: `VIN: ${shipment.vehicleVIN}`,
          badge: { label: shipment.status, tone: 'warning' },
          primaryAction: { label: 'View Shipment', href: `/dashboard/shipments/${shipment.id}` },
        },
      ],
    };
  }

  let token = shipment.releaseToken;
  if (!token) {
    token = `REL-${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        releaseToken: token,
        releaseTokenCreatedAt: new Date(),
      },
    });

    await prisma.shipmentAuditLog.create({
      data: {
        shipmentId: shipment.id,
        action: 'RELEASE_TOKEN_GENERATED',
        description: `Release token ${token} generated via Admin AI Copilot`,
        newValue: token,
        performedBy: user.name || user.id || 'Admin AI Copilot',
      },
    });
  }

  return {
    reply: `✅ Gate Pass Release Token for **${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}** is active:\n\n🔑 **\`${token}\`**\n\nThis token authorizes overland transit pickup and carrier release.`,
    actionCards: [
      {
        type: 'TOKEN',
        title: `Gate Pass: ${token}`,
        subtitle: `VIN: ${shipment.vehicleVIN}`,
        badge: { label: 'AUTHORIZED', tone: 'success' },
        metrics: [
          { label: 'Token', value: token },
          { label: 'Status', value: 'RELEASED' },
        ],
        primaryAction: { label: 'Open Shipment', href: `/dashboard/shipments/${shipment.id}` },
        secondaryAction: { label: 'Assign Transit', href: '/dashboard/transits' },
      },
    ],
  };
}

export async function navigateAdminTool(query: string): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const lower = query.toLowerCase();

  const routes: Array<{ keywords: string[]; title: string; subtitle: string; href: string }> = [
    { keywords: ['automation', 'cron', 'milestone', 'auto invoice'], title: 'Automation Settings', subtitle: 'Event-driven lifecycle invoicing & alerts', href: '/dashboard/settings?tab=automation' },
    { keywords: ['price list', 'pricing', 'tariffs', 'rate'], title: 'Company Price Lists', subtitle: 'Ocean freight, towing & port tariff matrix', href: '/dashboard/companies' },
    { keywords: ['tracking', 'apis', 'searates', 'marinetraffic'], title: 'Tracking API Configuration', subtitle: 'Live ocean AIS and satellite provider keys', href: '/dashboard/settings?tab=tracking' },
    { keywords: ['inspection', 'damage', 'condition report'], title: 'Vehicle Inspections Hub', subtitle: 'Yard intake and damage comparison reports', href: '/dashboard/inspections' },
    { keywords: ['audit', 'logs', 'history', 'security'], title: 'System Audit Logs', subtitle: 'Platform-wide security and operations trail', href: '/dashboard/audit-logs' },
    { keywords: ['document', 'bol', 'titles', 'docs'], title: 'Document Manager', subtitle: 'Central bills of lading, titles, and invoices', href: '/dashboard/documents' },
    { keywords: ['customer', 'clients', 'directory'], title: 'Customer Directory', subtitle: 'Manage accounts, ledgers, and contact info', href: '/dashboard/customers' },
    { keywords: ['transit', 'border', 'overland'], title: 'Transit Management', subtitle: 'Monitor border crossings and final legs', href: '/dashboard/transits' },
    { keywords: ['dispatch', 'towing', 'pickup'], title: 'Towing Dispatches', subtitle: 'Coordinate vehicle recovery and yard transport', href: '/dashboard/dispatches' },
    { keywords: ['container', 'ocean', 'vessel'], title: 'Ocean Containers', subtitle: 'Container manifests and shipping line schedules', href: '/dashboard/containers' },
    { keywords: ['shipment', 'cars', 'vehicles'], title: 'Shipments Hub', subtitle: 'Vehicle catalog, status, and tracking', href: '/dashboard/shipments' },
    { keywords: ['finance', 'invoices', 'billing', 'revenue'], title: 'Financial Overview', subtitle: 'Customer invoices, expenses, and carrier settlement', href: '/dashboard/finance' },
  ];

  const matched = routes.find((r) => r.keywords.some((k) => lower.includes(k))) || routes[0];

  return {
    reply: `Navigating to **${matched.title}**: ${matched.subtitle}`,
    actionCards: [
      {
        type: 'NAVIGATION',
        title: matched.title,
        subtitle: matched.subtitle,
        primaryAction: { label: `Open ${matched.title}`, href: matched.href },
      },
    ],
  };
}

export async function updateShipmentStatusTool(
  shipmentIdOrVin: string,
  newStatus: string,
  user: ContextUser
): Promise<{ reply: string; actionCards: ActionCard[] }> {
  const statusMap: Record<string, string> = {
    ON_HAND: 'ON_HAND',
    DISPATCHED: 'DISPATCHING',
    DISPATCHING: 'DISPATCHING',
    LOADED: 'IN_TRANSIT',
    IN_TRANSIT: 'IN_TRANSIT',
    RELEASED: 'RELEASED',
    DESTINATION: 'IN_TRANSIT_TO_DESTINATION',
    IN_TRANSIT_TO_DESTINATION: 'IN_TRANSIT_TO_DESTINATION',
    DELIVERED: 'DELIVERED',
  };

  const cleanStatus = newStatus.toUpperCase().replace(/\s+/g, '_');
  const normalizedStatus = statusMap[cleanStatus];

  if (!normalizedStatus) {
    return {
      reply: `Invalid status "${newStatus}". Valid options are: ON_HAND, DISPATCHING, IN_TRANSIT, RELEASED, IN_TRANSIT_TO_DESTINATION, DELIVERED`,
      actionCards: [],
    };
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      OR: [
        { id: shipmentIdOrVin },
        { vehicleVIN: shipmentIdOrVin },
      ],
    },
  });

  if (!shipment) {
    return {
      reply: `Shipment "${shipmentIdOrVin}" was not found. Please verify the VIN or shipment ID.`,
      actionCards: [],
    };
  }

  const oldStatus = shipment.status;
  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: { status: normalizedStatus as any },
    select: {
      id: true,
      vehicleVIN: true,
      vehicleMake: true,
      vehicleModel: true,
      status: true,
    },
  });

  await prisma.shipmentAuditLog.create({
    data: {
      shipmentId: shipment.id,
      action: 'STATUS_UPDATED',
      description: `Updated status from ${oldStatus} to ${normalizedStatus} via Admin Copilot Chatbot`,
      oldValue: oldStatus,
      newValue: normalizedStatus,
      performedBy: user.name || user.id || 'Admin AI Copilot',
    },
  });

  return {
    reply: `✅ Successfully updated shipment **${updated.vehicleMake || ''} ${updated.vehicleModel || ''} (${updated.vehicleVIN || updated.id})** status from **${oldStatus}** to **${normalizedStatus}**.`,
    actionCards: [
      {
        type: 'SHIPMENT',
        title: `${updated.vehicleMake || ''} ${updated.vehicleModel || ''}`.trim() || updated.vehicleVIN || 'Vehicle',
        subtitle: `VIN: ${updated.vehicleVIN || 'N/A'}`,
        badge: { label: updated.status, tone: 'success' },
        primaryAction: { label: 'Open Shipment Details', href: `/dashboard/shipments/${updated.id}` },
        secondaryAction: {
          label: 'Draft WhatsApp Update',
          actionId: 'draft_whatsapp',
          payload: { shipmentId: updated.id, vin: updated.vehicleVIN },
        },
      },
    ],
  };
}

export async function createShipmentTool(
  params: {
    vin: string;
    make?: string;
    model?: string;
    year?: number;
    lotNumber?: string;
    customerEmailOrName?: string;
    purchasePrice?: number;
  },
  user: ContextUser
): Promise<{ reply: string; actionCards: ActionCard[] }> {
  let customerId = user.id;

  if (params.customerEmailOrName) {
    const cust = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: params.customerEmailOrName, mode: 'insensitive' } },
          { name: { contains: params.customerEmailOrName, mode: 'insensitive' } },
        ],
      },
    });
    if (cust) customerId = cust.id;
  }

  const created = await prisma.shipment.create({
    data: {
      userId: customerId,
      vehicleType: 'SEDAN',
      vehicleVIN: params.vin.toUpperCase().trim(),
      vehicleMake: params.make ? params.make.toUpperCase().trim() : 'UNKNOWN',
      vehicleModel: params.model ? params.model.toUpperCase().trim() : 'UNKNOWN',
      vehicleYear: params.year || new Date().getFullYear(),
      lotNumber: params.lotNumber?.trim() || null,
      purchasePrice: params.purchasePrice || null,
      status: 'ON_HAND',
    },
  });

  await prisma.shipmentAuditLog.create({
    data: {
      shipmentId: created.id,
      action: 'CREATED',
      description: 'Shipment created via Admin AI Copilot',
      performedBy: user.name || user.id || 'Admin AI Copilot',
    },
  });

  return {
    reply: `🎉 Created new shipment for **${created.vehicleYear} ${created.vehicleMake} ${created.vehicleModel}** (VIN: \`${created.vehicleVIN}\`) in **ON_HAND** status!`,
    actionCards: [
      {
        type: 'SHIPMENT',
        title: `${created.vehicleYear} ${created.vehicleMake} ${created.vehicleModel}`,
        subtitle: `VIN: ${created.vehicleVIN} · Lot: ${created.lotNumber || 'N/A'}`,
        badge: { label: created.status, tone: 'warning' },
        primaryAction: { label: 'Open Shipment Page', href: `/dashboard/shipments/${created.id}` },
        secondaryAction: { label: 'Create Towing Dispatch', href: '/dashboard/dispatches' },
      },
    ],
  };
}

// =========================================================================
// Main Orchestration & Intent Resolution
// =========================================================================

export async function processAdminCopilotMessage(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  user: ContextUser,
  context?: CopilotContext
): Promise<AdminCopilotResponse> {
  const msg = userMessage.trim();
  const lower = msg.toLowerCase();

  // 1. Direct Action Confirmations
  if (lower.startsWith('confirm_status_update:')) {
    const parts = msg.split(':');
    const targetId = parts[1];
    const targetStatus = parts[2];
    if (targetId && targetStatus) {
      const res = await updateShipmentStatusTool(targetId, targetStatus, user);
      return {
        reply: res.reply,
        toolExecuted: 'update_shipment_status',
        actionCards: res.actionCards,
        suggestedPrompts: ['Show system overview', 'Search VIN', 'Active containers'],
      };
    }
  }

  // 2. High-speed deterministic intent routing (0 latency)

  // Status Update Intent: e.g. "update status of <vin> to <status>" or "mark <vin> as <status>"
  const updateMatch = msg.match(/(?:update|change|mark|set)\s+(?:status\s+of\s+)?([A-HJ-NPR-Z0-9]{11,17}|[a-z0-9_-]{10,36})\s+(?:status\s+)?(?:to|as)\s+([A-Za-z_]+)/i);
  if (updateMatch) {
    const vinOrId = updateMatch[1];
    const newStatus = updateMatch[2];
    const res = await updateShipmentStatusTool(vinOrId, newStatus, user);
    return {
      reply: res.reply,
      toolExecuted: 'update_shipment_status',
      actionCards: res.actionCards,
      suggestedPrompts: [`Draft WhatsApp for ${vinOrId}`, 'System Overview', 'Active containers'],
    };
  }

  // Status update when on active shipment page (Context-aware: "mark as delivered", "set status to IN_TRANSIT")
  if (context?.currentPath?.includes('/dashboard/shipments/')) {
    const pathMatch = context.currentPath.match(/\/dashboard\/shipments\/([a-zA-Z0-9_-]+)/);
    const activeShipmentId = pathMatch ? pathMatch[1] : context.selectedShipmentId;

    if (activeShipmentId && (lower.startsWith('mark as ') || lower.startsWith('set status to ') || lower.startsWith('update status to '))) {
      const newStatus = lower.replace(/^(mark as|set status to|update status to)\s+/i, '').trim();
      const res = await updateShipmentStatusTool(activeShipmentId, newStatus, user);
      return {
        reply: res.reply,
        toolExecuted: 'update_shipment_status',
        actionCards: res.actionCards,
        suggestedPrompts: ['Draft WhatsApp notification', 'System Overview', 'Active containers'],
      };
    }
  }

  // WhatsApp Draft Intent: e.g. "draft whatsapp for <vin>", "send whatsapp update"
  if (lower.includes('whatsapp') || lower.includes('draft message') || lower.includes('sms update')) {
    const targetVin = (msg.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] ||
      context?.selectedShipmentId ||
      context?.currentPath?.match(/\/dashboard\/shipments\/([a-zA-Z0-9_-]+)/)?.[1] ||
      msg.replace(/(?:draft|whatsapp|send|update|message|for|to)/gi, '').trim());

    if (targetVin) {
      const res = await draftWhatsAppUpdateTool(targetVin);
      return {
        reply: res.reply,
        toolExecuted: 'draft_whatsapp',
        actionCards: res.actionCards,
        suggestedPrompts: ['System Overview', 'Active containers', 'List dispatches'],
      };
    }
  }

  // Release Token Intent: e.g. "generate release token", "gate pass for <vin>"
  if (lower.includes('release token') || lower.includes('gate pass') || lower.includes('release code')) {
    const targetVin = (msg.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[1] ||
      context?.selectedShipmentId ||
      context?.currentPath?.match(/\/dashboard\/shipments\/([a-zA-Z0-9_-]+)/)?.[1] ||
      msg.replace(/(?:generate|release|token|gate|pass|code|for)/gi, '').trim());

    if (targetVin) {
      const res = await generateReleaseTokenTool(targetVin, user);
      return {
        reply: res.reply,
        toolExecuted: 'generate_release_token',
        actionCards: res.actionCards,
        suggestedPrompts: ['Assign to transit', 'System Overview', 'Active containers'],
      };
    }
  }

  // Damage & Condition Reports: e.g. "show damaged cars", "damage reports", "damage scan"
  if (lower.includes('damage') || lower.includes('scratches') || lower.includes('dent') || lower.includes('condition report')) {
    const q = msg.replace(/(?:show|list|find|damaged?|cars?|vehicles?|reports?|scratches?|dents?)/gi, '').trim();
    const res = await getShipmentDamageTool(q);
    return {
      reply: res.reply,
      toolExecuted: 'get_damage_summary',
      actionCards: res.actionCards,
      suggestedPrompts: ['System Overview', 'Vehicle Inspections', 'Active containers'],
    };
  }

  // Carriers & Towing Companies: e.g. "who are our carriers?", "list carriers", "towing companies"
  if (lower.includes('carrier') || lower.includes('towing compan') || lower.includes('shipping line partner')) {
    const q = msg.replace(/(?:who|are|our|list|show|all|active|carriers?|towing|companies?)/gi, '').trim();
    const res = await searchCarriersTool(q);
    return {
      reply: res.reply,
      toolExecuted: 'search_carriers',
      actionCards: res.actionCards,
      suggestedPrompts: ['List dispatches', 'System Overview', 'Active containers'],
    };
  }

  // Navigation Intent: e.g. "take me to settings", "open price list", "go to automation"
  if (lower.startsWith('go to ') || lower.startsWith('take me to ') || lower.startsWith('open ') || lower.includes('settings') || lower.includes('audit log')) {
    const dest = msg.replace(/^(go to|take me to|open)\s+/i, '').trim();
    if (dest.length >= 3) {
      const res = await navigateAdminTool(dest);
      return {
        reply: res.reply,
        toolExecuted: 'navigate_admin',
        actionCards: res.actionCards,
        suggestedPrompts: ['System Overview', 'Active containers', 'List unpaid invoices'],
      };
    }
  }

  // 17-char VIN Lookup
  const vinMatch = msg.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinMatch) {
    const vin = vinMatch[1].toUpperCase();
    const res = await searchShipmentsTool(vin);
    return {
      reply: res.reply,
      toolExecuted: 'search_shipments',
      actionCards: res.actionCards,
      suggestedPrompts: [
        `Mark ${vin} as LOADED`,
        `Draft WhatsApp for ${vin}`,
        `Generate release token for ${vin}`,
      ],
    };
  }

  // Container lookup: e.g. "CAAU5189072" or "MSKU1234567"
  const containerMatch = msg.match(/\b([A-Z]{4}\d{7})\b/i);
  if (containerMatch) {
    const containerNum = containerMatch[1].toUpperCase();
    const res = await searchContainersTool(containerNum);
    return {
      reply: res.reply,
      toolExecuted: 'search_containers',
      actionCards: res.actionCards,
      suggestedPrompts: [
        `Show vehicles inside ${containerNum}`,
        'List active containers',
        'System Overview',
      ],
    };
  }

  // Shipping Overview / Stats
  if (
    lower.includes('overview') ||
    lower.includes('stats') ||
    lower.includes('dashboard summary') ||
    lower.includes('how many cars') ||
    lower.includes('how many vehicles') ||
    lower.includes('kpi')
  ) {
    const res = await getSystemOverviewTool();
    return {
      reply: res.reply,
      toolExecuted: 'get_system_overview',
      actionCards: res.actionCards,
      suggestedPrompts: [
        'Show active containers',
        'Show pending dispatches',
        'List unpaid invoices',
        'Search carriers',
      ],
    };
  }

  // Customer Ledger & Balances
  if (
    lower.includes('balance') ||
    lower.includes('ledger') ||
    lower.includes('how much does') ||
    lower.includes('owe')
  ) {
    const custName = msg
      .replace(/(?:customer|client|show|get|check|what is|the|balance|ledger|of|for|how much does|owe)/gi, '')
      .trim();
    if (custName.length >= 2) {
      const res = await getCustomerLedgerTool(custName);
      return {
        reply: res.reply,
        toolExecuted: 'get_customer_ledger',
        actionCards: res.actionCards,
        suggestedPrompts: [
          'List unpaid invoices',
          'System Overview',
          'Customer Directory',
        ],
      };
    }
  }

  // Invoices
  if (lower.includes('invoice') || lower.includes('unpaid') || lower.includes('billings')) {
    const status = lower.includes('unpaid') || lower.includes('pending')
      ? 'PENDING'
      : lower.includes('overdue')
      ? 'OVERDUE'
      : undefined;
    const res = await listInvoicesTool(status);
    return {
      reply: res.reply,
      toolExecuted: 'list_invoices',
      actionCards: res.actionCards,
      suggestedPrompts: [
        'Show pending invoices',
        'System Overview',
        'Go to Invoices',
      ],
    };
  }

  // Containers List
  if (lower.includes('container')) {
    const status = lower.includes('active')
      ? 'IN_TRANSIT'
      : lower.includes('waiting')
      ? 'WAITING_FOR_LOADING'
      : undefined;
    const query = msg.replace(/(?:show|list|find|get|all|active|ocean|containers?)/gi, '').trim();
    const res = await searchContainersTool(query, status);
    return {
      reply: res.reply,
      toolExecuted: 'search_containers',
      actionCards: res.actionCards,
      suggestedPrompts: [
        'List active containers',
        'System Overview',
        'Go to Containers',
      ],
    };
  }

  // Dispatches
  if (lower.includes('dispatch') || lower.includes('towing') || lower.includes('pickup')) {
    const res = await listDispatchesTool();
    return {
      reply: res.reply,
      toolExecuted: 'list_dispatches',
      actionCards: res.actionCards,
      suggestedPrompts: [
        'Show active transits',
        'List carriers',
        'System Overview',
      ],
    };
  }

  // Transits
  if (lower.includes('transit') || lower.includes('overland') || lower.includes('carrier leg')) {
    const res = await listTransitsTool();
    return {
      reply: res.reply,
      toolExecuted: 'list_transits',
      actionCards: res.actionCards,
      suggestedPrompts: [
        'Show active dispatches',
        'System Overview',
        'Go to Transits',
      ],
    };
  }

  // Search Shipments by query / keyword
  if (lower.includes('shipment') || lower.includes('car') || lower.includes('vehicle') || lower.includes('find') || lower.includes('search')) {
    const query = msg.replace(/(?:search|find|look up|show|shipment|shipments|vehicles?|cars?|for)/gi, '').trim();
    const res = await searchShipmentsTool(query);
    return {
      reply: res.reply,
      toolExecuted: 'search_shipments',
      actionCards: res.actionCards,
      suggestedPrompts: [
        'System Overview',
        'Active containers',
        'List dispatches',
      ],
    };
  }

  // 3. TokenRouter LLM Intelligence for Complex Operational Queries
  if (await isTokenRouterConfigured()) {
    try {
      const systemPrompt = `You are the JACXI Shipping Operations Copilot for administrators.
You have authority to inspect and orchestrate logistics across vehicle intake, ocean containerization, towing dispatches, overland transits, invoicing, customer ledgers, and WhatsApp updates.

Available internal tools:
- "get_system_overview": Returns live metrics (yard on-hand, ocean, unpaid receivables).
- "search_shipments": Arguments: {"query": string, "status"?: string}. Searches by VIN, lot, make, model.
- "search_containers": Arguments: {"query": string}. Searches ocean bookings and containers.
- "search_carriers": Arguments: {"query": string}. Searches towing and transit carrier companies.
- "get_damage_summary": Arguments: {"query": string}. Searches vehicles with damage or condition notes.
- "get_customer_ledger": Arguments: {"customerQuery": string}. Retrieves billing balance and invoices.
- "draft_whatsapp": Arguments: {"shipmentIdOrVin": string}. Generates milestone WhatsApp notification.
- "generate_release_token": Arguments: {"shipmentIdOrVin": string}. Issues gate pass release token for released cars.
- "navigate_admin": Arguments: {"query": string}. Direct link to settings, tariffs, pricing, or audit logs.

If the user's request requires executing one of these tools, output JSON only:
{"tool": "<tool_name>", "args": { ... }, "commentary": "Brief 1-sentence operator summary"}

Otherwise, provide an expert, concise operational answer in Markdown.`;

      const completion = await createTokenRouterChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          ...history.slice(-4),
          { role: 'user', content: msg },
        ],
        { maxTokens: 600, temperature: 0.2 }
      );

      const completionText = completion.content?.trim() || '';

      let parsedToolCall: Record<string, any> | null = null;
      try {
        parsedToolCall = extractJsonObject(completionText) as Record<string, any>;
      } catch {
        parsedToolCall = null;
      }

      if (parsedToolCall?.tool && typeof parsedToolCall.tool === 'string') {
        const tool = parsedToolCall.tool;
        const args = (parsedToolCall.args || {}) as Record<string, any>;
        const commentary = typeof parsedToolCall.commentary === 'string' ? parsedToolCall.commentary : undefined;

        if (tool === 'get_system_overview') {
          const res = await getSystemOverviewTool();
          return {
            reply: commentary ? `${commentary}\n\n${res.reply}` : res.reply,
            toolExecuted: 'get_system_overview',
            actionCards: res.actionCards,
            suggestedPrompts: ['Active containers', 'List dispatches', 'Unpaid invoices'],
          };
        }

        if (tool === 'search_shipments') {
          const res = await searchShipmentsTool(String(args.query || ''));
          return {
            reply: commentary ? `${commentary}\n\n${res.reply}` : res.reply,
            toolExecuted: 'search_shipments',
            actionCards: res.actionCards,
            suggestedPrompts: ['System Overview', 'Active containers', 'Draft WhatsApp'],
          };
        }

        if (tool === 'search_containers') {
          const res = await searchContainersTool(String(args.query || ''));
          return {
            reply: commentary ? `${commentary}\n\n${res.reply}` : res.reply,
            toolExecuted: 'search_containers',
            actionCards: res.actionCards,
            suggestedPrompts: ['List containers', 'System Overview'],
          };
        }

        if (tool === 'search_carriers') {
          const res = await searchCarriersTool(String(args.query || ''));
          return {
            reply: commentary ? `${commentary}\n\n${res.reply}` : res.reply,
            toolExecuted: 'search_carriers',
            actionCards: res.actionCards,
            suggestedPrompts: ['List dispatches', 'System Overview'],
          };
        }

        if (tool === 'get_damage_summary') {
          const res = await getShipmentDamageTool(String(args.query || ''));
          return {
            reply: commentary ? `${commentary}\n\n${res.reply}` : res.reply,
            toolExecuted: 'get_damage_summary',
            actionCards: res.actionCards,
            suggestedPrompts: ['Vehicle Inspections', 'System Overview'],
          };
        }

        if (tool === 'get_customer_ledger') {
          const res = await getCustomerLedgerTool(String(args.customerQuery || ''));
          return {
            reply: commentary ? `${commentary}\n\n${res.reply}` : res.reply,
            toolExecuted: 'get_customer_ledger',
            actionCards: res.actionCards,
            suggestedPrompts: ['Unpaid invoices', 'Customer Directory'],
          };
        }

        if (tool === 'draft_whatsapp') {
          const res = await draftWhatsAppUpdateTool(String(args.shipmentIdOrVin || ''));
          return {
            reply: res.reply,
            toolExecuted: 'draft_whatsapp',
            actionCards: res.actionCards,
            suggestedPrompts: ['System Overview', 'View Shipments'],
          };
        }

        if (tool === 'generate_release_token') {
          const res = await generateReleaseTokenTool(String(args.shipmentIdOrVin || ''), user);
          return {
            reply: res.reply,
            toolExecuted: 'generate_release_token',
            actionCards: res.actionCards,
            suggestedPrompts: ['Assign Transit', 'System Overview'],
          };
        }

        if (tool === 'navigate_admin') {
          const res = await navigateAdminTool(String(args.query || ''));
          return {
            reply: res.reply,
            toolExecuted: 'navigate_admin',
            actionCards: res.actionCards,
            suggestedPrompts: ['System Overview', 'Active containers'],
          };
        }
      }

      // If LLM returned conversational guidance
      if (completionText.length > 10) {
        return {
          reply: completionText,
          toolExecuted: 'tokenrouter_copilot_assistant',
          actionCards: [
            {
              type: 'NAVIGATION',
              title: 'Operations Quick Access',
              subtitle: 'Navigate relevant dashboard workspaces',
              primaryAction: { label: 'System Overview', actionId: 'system_overview' },
              secondaryAction: { label: 'Shipments Hub', href: '/dashboard/shipments' },
            },
          ],
          suggestedPrompts: [
            'Show system overview',
            'List active containers',
            'Search carriers',
            'List unpaid invoices',
          ],
        };
      }
    } catch (llmError) {
      console.warn('TokenRouter LLM copilot completion failed, falling back to deterministic guide:', llmError);
    }
  }

  // 4. Fallback / General Assistant guidance
  return {
    reply: `👋 Hello ${user.name || 'Admin'}! I am your **JACXI Operations Copilot**. I can execute tasks across the entire admin panel:

- 🔍 **Search & Track:** Look up any 17-digit VIN, lot number, or container (e.g. \`CAAU5189072\`).
- ⚡ **Update Shipments:** Type \`update status of [VIN] to LOADED\` or \`mark [VIN] as DELIVERED\`.
- 🚢 **Ocean Containers:** Ask for \`active containers\`, bookings, vessel schedules, and manifests.
- 💵 **Financials & Ledgers:** Query \`balance of [Customer Name]\` or \`list unpaid invoices\`.
- 🚚 **Dispatches & Transits:** Check \`active dispatches\`, towing legs, or overland transit runs.
- 🏢 **Carrier Partners:** Ask \`who are our carriers?\` or \`find towing companies\`.
- 📱 **WhatsApp Updates:** Type \`draft whatsapp for [VIN]\` to compose ready-to-send milestone alerts.
- 🔑 **Gate Passes:** Ask to \`generate release token for [VIN]\`.
- 📊 **Executive Overview:** Type \`overview\` for real-time yard, transit, and revenue numbers.

What would you like to inspect or manage?`,
    actionCards: [
      {
        type: 'NAVIGATION',
        title: 'Quick Admin Actions',
        subtitle: 'Select an operational tool or view real-time data',
        primaryAction: { label: 'System Overview', actionId: 'system_overview' },
        secondaryAction: { label: 'Open Shipments', href: '/dashboard/shipments' },
      },
    ],
    suggestedPrompts: [
      'Show system overview',
      'List active containers',
      'Show active dispatches',
      'List carriers',
      'Damaged vehicles',
      'List unpaid invoices',
    ],
  };
}
