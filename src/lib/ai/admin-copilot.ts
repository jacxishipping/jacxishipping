import { prisma } from '@/lib/db';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { hasPermission } from '@/lib/rbac';
import { createAiInteractionLog } from '@/lib/ai/audit';

export type ActionCardType =
  | 'SHIPMENT'
  | 'CONTAINER'
  | 'DISPATCH'
  | 'TRANSIT'
  | 'LEDGER'
  | 'INVOICE'
  | 'NAVIGATION'
  | 'CONFIRMATION'
  | 'OVERVIEW';

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
      { vehicleVIN: { contains: cleanQ, mode: 'insensitive' } },
      { lotNumber: { contains: cleanQ, mode: 'insensitive' } },
      { vehicleMake: { contains: cleanQ, mode: 'insensitive' } },
      { vehicleModel: { contains: cleanQ, mode: 'insensitive' } },
      { user: { name: { contains: cleanQ, mode: 'insensitive' } } },
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
        { label: 'Customer', value: s.user?.name || 'Unassigned' },
        { label: 'Container', value: s.container?.containerNumber || 'None' },
        { label: 'Location / Port', value: `${s.purchaseLocation || 'Yard'} → ${s.container?.destinationPort || 'POD'}` },
      ],
      primaryAction: { label: 'View Details', href: `/dashboard/shipments/${s.id}` },
      secondaryAction: {
        label: 'Update Status',
        actionId: 'prompt_status_update',
        payload: { shipmentId: s.id, currentStatus: s.status, vin: s.vehicleVIN },
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
      shipments: { select: { id: true } },
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
      subtitle: `Booking: ${c.bookingNumber || 'N/A'} · Carrier: ${c.shippingLine || 'N/A'}`,
      badge: { label: c.status, tone },
      metrics: [
        { label: 'Vehicles', value: `${c.shipments.length} loaded` },
        { label: 'Ports', value: `${c.loadingPort || 'POL'} → ${c.destinationPort || 'POD'}` },
        { label: 'ETA', value: etaStr },
      ],
      primaryAction: { label: 'View Container', href: `/dashboard/containers/${c.id}` },
      secondaryAction: { label: 'Manifest & Loading', href: `/dashboard/containers/${c.id}` },
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
  ]);

  const unpaidTotal = unpaidInvoices._sum.total || 0;

  const card: ActionCard = {
    type: 'OVERVIEW',
    title: 'JACXI Shipping Operations Brief',
    subtitle: 'Real-time platform operations and financial summary',
    badge: { label: 'System Live', tone: 'success' },
    metrics: [
      { label: 'On-Hand Yard', value: `${onHandShipments} cars` },
      { label: 'Active In-Transit', value: `${inTransitShipments} cars` },
      { label: 'Ocean Containers', value: `${activeContainers} active` },
      { label: 'Pending Dispatches', value: `${activeDispatches} orders` },
      { label: 'Outstanding Receivables', value: `$${unpaidTotal.toLocaleString()}` },
      { label: 'Total Shipments', value: `${totalShipments} cars` },
    ],
    primaryAction: { label: 'Operations Dashboard', href: '/dashboard/operations' },
    secondaryAction: { label: 'Financial Overview', href: '/dashboard/finance' },
  };

  return {
    reply: `### 📊 Real-Time Operations Overview\n- **Vehicles On-Hand:** ${onHandShipments}\n- **In-Transit / Ocean:** ${inTransitShipments}\n- **Delivered All-Time:** ${deliveredShipments}\n- **Active Containers:** ${activeContainers}\n- **Active Towing Dispatches:** ${activeDispatches}\n- **Outstanding Invoices:** ${unpaidInvoices._count} ($${unpaidTotal.toLocaleString()} USD)`,
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
      company: { select: { name: true } },
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
      company: { select: { name: true } },
      shipments: { select: { id: true, vehicleVIN: true } },
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
  user: ContextUser
): Promise<AdminCopilotResponse> {
  const msg = userMessage.trim();
  const lower = msg.toLowerCase();

  // 1. Check for specific action confirmations (e.g. from action card button payloads)
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

  // 2. High-speed deterministic regex & intent routing (Fail-safe, 0 latency)

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
      suggestedPrompts: [`Inspect ${vinOrId}`, 'System Overview', 'Active containers'],
    };
  }

  // VIN Lookup (17-char or partial VIN query)
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
        `Mark ${vin} as IN_TRANSIT`,
        `Show customer ledger for ${vin}`,
      ],
    };
  }

  // Container lookup: e.g. "CAAU5189072" or "container CAAU..."
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
        'Search customer ledger',
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
        'System Overview',
        'Go to Dispatches',
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

  // 3. Fallback / General Assistant guidance
  return {
    reply: `👋 Hello ${user.name || 'Admin'}! I am your **JACXI Operations Copilot**. I can execute tasks across the entire admin panel:

- 🔍 **Search & Track:** Look up any 17-digit VIN, lot number, or container (e.g. \`CAAU5189072\`).
- ⚡ **Update Shipments:** Type \`update status of [VIN] to LOADED\` or \`mark [VIN] as DELIVERED\`.
- 🚢 **Ocean Containers:** Ask for \`active containers\`, bookings, vessel schedules, and manifests.
- 💵 **Financials & Ledgers:** Query \`balance of [Customer Name]\` or \`list unpaid invoices\`.
- 🚚 **Dispatches & Transits:** Check \`active dispatches\` or towing legs.
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
      'List unpaid invoices',
    ],
  };
}

