import { z } from 'zod';
import { JacxiDataProvider } from './data-provider';
import { McpToolMetadata } from './types';

export function getMcpToolsCatalog(): McpToolMetadata[] {
  return [
    {
      name: 'search_vin',
      category: 'Search',
      description:
        'Search for a vehicle shipment by full (17-char) or partial VIN, auction lot number, or shipment ID.',
      parameters: [
        {
          name: 'vin',
          type: 'string',
          required: true,
          description: 'Full or partial Vehicle Identification Number (VIN), lot number, or shipment ID',
        },
        {
          name: 'includeTracking',
          type: 'boolean',
          required: false,
          description: 'Include chronological tracking milestone events',
          defaultValue: 'true',
        },
      ],
      sampleArgs: {
        vin: 'JTEBU5JR4A5011946',
        includeTracking: true,
      },
    },
    {
      name: 'search_container',
      category: 'Search',
      description:
        'Search for an ocean freight container by container number, booking number, or tracking ID.',
      parameters: [
        {
          name: 'containerNumber',
          type: 'string',
          required: true,
          description: 'Container number (e.g. CAAU5189072, MSKU...), booking number, or tracking ID',
        },
        {
          name: 'includeShipments',
          type: 'boolean',
          required: false,
          description: 'Include list of all vehicles loaded inside the container',
          defaultValue: 'true',
        },
      ],
      sampleArgs: {
        containerNumber: 'CAAU5189072',
        includeShipments: true,
      },
    },
    {
      name: 'track',
      category: 'Tracking',
      description:
        'Universal live tracking resolver for any VIN, container number, booking number, or lot number.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'VIN, Container number, Booking number, or Lot number',
        },
      ],
      sampleArgs: {
        query: 'CAAU5189072',
      },
    },
    {
      name: 'list_containers',
      category: 'Operations',
      description:
        'List ocean freight containers with filters for lifecycle status, destination port, or search keyword.',
      parameters: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: "Filter by status: 'active', 'IN_TRANSIT', 'LOADED', 'WAITING_FOR_LOADING', 'ARRIVED', 'DELIVERED', 'CREATED'",
        },
        {
          name: 'destinationPort',
          type: 'string',
          required: false,
          description: 'Filter by destination port (e.g. Mersin, Dubai)',
        },
        {
          name: 'search',
          type: 'string',
          required: false,
          description: 'Keyword search for container, booking, or vessel',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Optional maximum results to return (omit to return all containers)',
        },
      ],
      sampleArgs: {
        status: 'active',
      },
    },
    {
      name: 'list_shipments',
      category: 'Operations',
      description:
        'List vehicle shipments with filters for status, search query, or container assignment.',
      parameters: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: "Filter by status: 'ON_HAND', 'DISPATCHING', 'IN_TRANSIT', 'RELEASED', 'DELIVERED'",
        },
        {
          name: 'search',
          type: 'string',
          required: false,
          description: 'Search by VIN, make, model, or lot number',
        },
        {
          name: 'containerNumber',
          type: 'string',
          required: false,
          description: 'Filter by assigned container number',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Optional maximum results to return (omit to return all shipments)',
        },
      ],
      sampleArgs: {
        status: 'IN_TRANSIT',
      },
    },
    {
      name: 'get_shipping_overview',
      category: 'Analytics',
      description:
        'Get real-time operational shipping statistics, container breakdowns, and yard inventory counts.',
      parameters: [],
      sampleArgs: {},
    },
    {
      name: 'search_customer',
      category: 'Search',
      description:
        'Search or list all customers by name, email, phone, or 8-character login code and list all their vehicle shipments.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: false,
          description: 'Customer name, email, phone number, login code, or "all" to list every customer',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Optional maximum customers to return (omit to return all matching customers)',
        },
      ],
      sampleArgs: {
        query: 'all',
      },
    },
    {
      name: 'list_dispatches',
      category: 'Operations',
      description:
        'List inland towing dispatches from US auction yards (Copart/IAAI) to export port terminals.',
      parameters: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by dispatch status (e.g. PENDING, IN_TRANSIT, COMPLETED)',
        },
        {
          name: 'search',
          type: 'string',
          required: false,
          description: 'Search by reference number, origin, or destination',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Optional maximum dispatches to return (omit to return all dispatches)',
        },
      ],
      sampleArgs: {},
    },
    {
      name: 'get_container_manifest',
      category: 'Operations',
      description:
        'Generate a complete cargo manifest report for a container, including all loaded vehicles, VINs, customers, and customs readiness.',
      parameters: [
        {
          name: 'containerNumber',
          type: 'string',
          required: true,
          description: 'Container number (e.g. CAAU5189072)',
        },
      ],
      sampleArgs: {
        containerNumber: 'CAAU5189072',
      },
    },
    {
      name: 'calculate_shipping_quote',
      category: 'Quotes',
      description:
        'Calculate an estimated end-to-end shipping quote (inland towing + ocean freight + transit) from US ports to destination.',
      parameters: [
        {
          name: 'vehicleType',
          type: 'string',
          required: true,
          description: 'Vehicle type (e.g. Sedan, SUV, Pickup Truck)',
        },
        {
          name: 'originPort',
          type: 'string',
          required: false,
          description: 'US Port of Loading (e.g. Savannah, Houston, New York, Los Angeles)',
        },
        {
          name: 'destination',
          type: 'string',
          required: false,
          description: 'Final destination (e.g. Mersin, Islam Qala, Herat, Kabul, Dubai)',
        },
      ],
      sampleArgs: {
        vehicleType: 'SUV',
        originPort: 'Houston, TX',
        destination: 'Islam Qala, Afghanistan',
      },
    },
    {
      name: 'create_shipment',
      category: 'Mutations & Admin',
      description:
        'Create a new vehicle shipment record in Jacxi Shipping with VIN, vehicle details, lot number, customer assignment, and container assignment.',
      parameters: [
        { name: 'vehicleVIN', type: 'string', required: true, description: '17-character Vehicle Identification Number' },
        { name: 'vehicleYear', type: 'number', required: false, description: 'Model year (e.g. 2021)' },
        { name: 'vehicleMake', type: 'string', required: false, description: 'Vehicle make (e.g. TOYOTA)' },
        { name: 'vehicleModel', type: 'string', required: false, description: 'Vehicle model (e.g. HIGHLANDER)' },
        { name: 'lotNumber', type: 'string', required: false, description: 'Copart or IAAI lot number' },
        { name: 'customerQuery', type: 'string', required: false, description: 'Customer email, name, ID, or loginCode' },
        { name: 'containerNumber', type: 'string', required: false, description: 'Optional container number to assign' },
        { name: 'price', type: 'number', required: false, description: 'Shipping fare in USD' },
      ],
      sampleArgs: {
        vehicleVIN: '5TDGZRBH7MS098765',
        vehicleYear: 2021,
        vehicleMake: 'TOYOTA',
        vehicleModel: 'HIGHLANDER',
        lotNumber: '61029384',
        customerQuery: 'Aziz ahmad',
        price: 1650,
      },
    },
    {
      name: 'update_shipment',
      category: 'Mutations & Admin',
      description:
        'Update an existing vehicle shipment status, container assignment, shipping price, payment status, keys/title status, or internal notes.',
      parameters: [
        { name: 'vinOrId', type: 'string', required: true, description: 'VIN, lot number, or shipment ID' },
        { name: 'status', type: 'string', required: false, description: 'ON_HAND, DISPATCHING, IN_TRANSIT, IN_TRANSIT_TO_DESTINATION, DELIVERED' },
        { name: 'containerNumber', type: 'string', required: false, description: 'Container number to assign (or empty string to unassign)' },
        { name: 'price', type: 'number', required: false, description: 'Updated shipping price in USD' },
        { name: 'paymentStatus', type: 'string', required: false, description: 'PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED' },
        { name: 'hasKey', type: 'boolean', required: false, description: 'Whether vehicle has keys' },
        { name: 'hasTitle', type: 'boolean', required: false, description: 'Whether vehicle has export title' },
      ],
      sampleArgs: {
        vinOrId: 'JTEBU5JR4A5011946',
        status: 'IN_TRANSIT',
        hasKey: true,
        hasTitle: true,
      },
    },
    {
      name: 'create_container',
      category: 'Mutations & Admin',
      description:
        'Create a new ocean freight container with container number, booking number, shipping line, vessel, voyage, ports, and ETA.',
      parameters: [
        { name: 'containerNumber', type: 'string', required: true, description: 'Container number (e.g. MSKU9012345)' },
        { name: 'bookingNumber', type: 'string', required: false, description: 'Carrier booking reference' },
        { name: 'shippingLine', type: 'string', required: false, description: 'Shipping line (e.g. MAERSK, MSC, CMA CGM)' },
        { name: 'vesselName', type: 'string', required: false, description: 'Vessel name' },
        { name: 'loadingPort', type: 'string', required: false, description: 'Port of Loading (e.g. Houston, TX)' },
        { name: 'destinationPort', type: 'string', required: false, description: 'Port of Discharge (e.g. Mersin, Turkey)' },
        { name: 'estimatedArrival', type: 'string', required: false, description: 'ETA ISO date string (YYYY-MM-DD)' },
      ],
      sampleArgs: {
        containerNumber: 'MSKU9012345',
        shippingLine: 'MAERSK',
        loadingPort: 'Houston, TX',
        destinationPort: 'Mersin',
      },
    },
    {
      name: 'update_container_and_tracking',
      category: 'Mutations & Admin',
      description:
        'Update an ocean container status, ETA, current location, or progress %, and optionally append a new tracking milestone event.',
      parameters: [
        { name: 'containerNumber', type: 'string', required: true, description: 'Container number or booking number' },
        { name: 'status', type: 'string', required: false, description: 'CREATED, WAITING_FOR_LOADING, LOADED, IN_TRANSIT, ARRIVED_PORT, CUSTOMS_CLEARANCE, RELEASED, CLOSED' },
        { name: 'currentLocation', type: 'string', required: false, description: 'Current port or ocean position' },
        { name: 'estimatedArrival', type: 'string', required: false, description: 'Updated ETA (YYYY-MM-DD)' },
        { name: 'progress', type: 'number', required: false, description: 'Journey progress percentage (0-100)' },
        { name: 'milestoneStatus', type: 'string', required: false, description: 'Optional new tracking event status to append' },
        { name: 'milestoneDescription', type: 'string', required: false, description: 'Optional description for the new milestone' },
      ],
      sampleArgs: {
        containerNumber: 'CAAU5189072',
        currentLocation: 'Mediterranean Sea (En route to Mersin)',
        progress: 75,
        milestoneStatus: 'Vessel In Transit',
        milestoneDescription: 'Passed Gibraltar Strait en route to Mersin port',
      },
    },
    {
      name: 'create_dispatch',
      category: 'Mutations & Admin',
      description:
        'Create a new US domestic inland towing dispatch from auction yard to warehouse/port and optionally assign vehicle VINs.',
      parameters: [
        { name: 'origin', type: 'string', required: true, description: 'Pickup location / auction yard' },
        { name: 'destination', type: 'string', required: true, description: 'Delivery warehouse or port terminal' },
        { name: 'companyQuery', type: 'string', required: false, description: 'Dispatch carrier company name or ID' },
        { name: 'cost', type: 'number', required: false, description: 'Towing dispatch cost in USD' },
      ],
      sampleArgs: {
        origin: 'Copart Dallas, TX',
        destination: 'Houston Export Terminal, TX',
        cost: 325,
      },
    },
    {
      name: 'list_and_manage_transits',
      category: 'Operations',
      description:
        'List, create, or add tracking events to overland transits (e.g. Mersin / Dubai to Herat / Kabul, Afghanistan).',
      parameters: [
        { name: 'action', type: 'string', required: false, description: "'list' (default), 'create', or 'add_event'" },
        { name: 'search', type: 'string', required: false, description: 'Search by transit reference number, origin, or destination' },
        { name: 'status', type: 'string', required: false, description: 'PENDING, DISPATCHED, IN_TRANSIT, ARRIVED, DELIVERED, CANCELLED' },
        { name: 'referenceNumber', type: 'string', required: false, description: 'Transit reference number (for create or add_event)' },
        { name: 'origin', type: 'string', required: false, description: 'Transit origin (e.g. Mersin, Turkey or Dubai, UAE)' },
        { name: 'destination', type: 'string', required: false, description: 'Transit destination (e.g. Herat / Islam Qala, Afghanistan)' },
      ],
      sampleArgs: {
        action: 'list',
      },
    },
    {
      name: 'manage_customer',
      category: 'Mutations & Admin',
      description:
        'Create a new customer profile or reset/generate a customer 8-character loginCode.',
      parameters: [
        { name: 'action', type: 'string', required: true, description: "'create' or 'reset_login_code'" },
        { name: 'customerQuery', type: 'string', required: false, description: 'Existing customer name, email, or ID (for reset_login_code)' },
        { name: 'name', type: 'string', required: false, description: 'Customer full name (for create)' },
        { name: 'email', type: 'string', required: false, description: 'Customer email address' },
        { name: 'phone', type: 'string', required: false, description: 'Customer phone / WhatsApp' },
        { name: 'city', type: 'string', required: false, description: 'Customer city' },
        { name: 'country', type: 'string', required: false, description: 'Customer country' },
      ],
      sampleArgs: {
        action: 'reset_login_code',
        customerQuery: 'Aziz ahmad',
      },
    },
    {
      name: 'get_customer_ledger_and_balance',
      category: 'Accounting & Billing',
      description:
        'Get a customer financial statement, current balance, debit/credit ledger entries, collection status, and unpaid invoices.',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Customer name, email, ID, or 8-char loginCode' },
      ],
      sampleArgs: {
        query: 'Aziz ahmad',
      },
    },
    {
      name: 'list_and_search_invoices',
      category: 'Accounting & Billing',
      description:
        'Search and list customer invoices (UserInvoice) by invoice number, customer, VIN, container number, or payment status.',
      parameters: [
        { name: 'query', type: 'string', required: false, description: 'Invoice number (INV-...), customer name, VIN, or container #' },
        { name: 'status', type: 'string', required: false, description: 'DRAFT, PENDING, SENT, PAID, OVERDUE, CANCELLED' },
        { name: 'limit', type: 'number', required: false, description: 'Optional max invoices to return (omit to return all)' },
      ],
      sampleArgs: {},
    },
    {
      name: 'get_financial_and_expense_summary',
      category: 'Accounting & Billing',
      description:
        'Get company-wide billing totals, collected payments, outstanding receivables, and container/dispatch operational expenses.',
      parameters: [
        { name: 'containerNumber', type: 'string', required: false, description: 'Optional container number to filter container expenses' },
        { name: 'limit', type: 'number', required: false, description: 'Optional max expenses to return (omit to return all)' },
      ],
      sampleArgs: {},
    },
    {
      name: 'fetch_auction_lot',
      category: 'Live Scrapers & AIS',
      description:
        'Fetch live vehicle data from Copart / IAAI auction by lot number (via Oxylabs scraper) and check existing Jacxi shipments.',
      parameters: [
        { name: 'lotOrVin', type: 'string', required: true, description: 'Copart/IAAI numeric lot number (e.g. 59292076) or VIN' },
      ],
      sampleArgs: {
        lotOrVin: '59292076',
      },
    },
    {
      name: 'sync_live_container_tracking',
      category: 'Live Scrapers & AIS',
      description:
        'Trigger a live ocean carrier & vessel AIS tracking refresh for a container and return updated milestones and ETA.',
      parameters: [
        { name: 'containerNumber', type: 'string', required: true, description: 'Container number (e.g. CAAU5189072)' },
      ],
      sampleArgs: {
        containerNumber: 'CAAU5189072',
      },
    },
    {
      name: 'list_and_generate_documents',
      category: 'Documents & Alerts',
      description:
        'List shipment/container documents (BOL, Title, Customs, Photos) or generate an official vehicle Release Gate Pass token.',
      parameters: [
        { name: 'action', type: 'string', required: false, description: "'list' (default) or 'generate_gate_pass'" },
        { name: 'query', type: 'string', required: false, description: 'VIN, container number, or document name' },
        { name: 'limit', type: 'number', required: false, description: 'Optional max documents to return (omit to return all)' },
      ],
      sampleArgs: {
        action: 'list',
      },
    },
    {
      name: 'send_customer_notification',
      category: 'Documents & Alerts',
      description:
        'Send an in-app notification alert to a customer or staff member regarding a shipment, container, or invoice update.',
      parameters: [
        { name: 'customerQuery', type: 'string', required: true, description: 'Customer name, email, loginCode, or user ID' },
        { name: 'title', type: 'string', required: true, description: 'Notification title' },
        { name: 'description', type: 'string', required: true, description: 'Notification message body' },
        { name: 'type', type: 'string', required: false, description: 'INFO, SUCCESS, WARNING, or ERROR' },
      ],
      sampleArgs: {
        customerQuery: 'Aziz ahmad',
        title: 'Container CAAU5189072 Tracking Update',
        description: 'Your 2010 TOYOTA 4Runner (VIN: JTEBU5JR4A5011946) is in transit to Mersin port.',
        type: 'INFO',
      },
    },
  ];
}

export function registerJacxiTools(server: any, provider: JacxiDataProvider) {
  // =========================================================================
  // 1. SEARCH VIN
  // =========================================================================
  server.tool(
    'search_vin',
    'Search for a vehicle shipment by full or partial VIN, lot number, or shipment ID in Jacxi Shipping.',
    {
      vin: z
        .string()
        .min(1)
        .describe('Vehicle Identification Number (VIN), partial VIN, lot number, or shipment ID'),
      includeTracking: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include tracking milestones and timeline events'),
    },
    async ({ vin, includeTracking }: { vin: string; includeTracking: boolean }) => {
      try {
        const results = await provider.searchVin(vin, includeTracking);
        await provider.logMcpActivity({
          tool: 'search_vin',
          query: vin,
          entityType: 'SHIPMENT',
          entityId: vin,
          responseSummary: `Found ${results.length} vehicle(s)`,
          requestPayload: { vin, includeTracking },
          responsePayload: { count: results.length },
        });

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No vehicle shipment found matching query: "${vin}". Please verify the VIN or lot number.`,
              },
            ],
          };
        }

        const formatted = results
          .map((item, idx) => {
            const carDesc = [item.year, item.make, item.model].filter(Boolean).join(' ') || 'Vehicle';
            let md = `### ${idx + 1}. ${carDesc} (VIN: \`${item.vin}\`)\n`;
            md += `- **Status**: \`${item.status}\`\n`;
            if (item.lotNumber) md += `- **Lot Number**: ${item.lotNumber} (${item.auctionName || 'Auction'})\n`;
            if (item.color) md += `- **Color**: ${item.color} | **Type**: ${item.vehicleType || 'Auto'}\n`;
            if (item.hasKey !== undefined && item.hasKey !== null) {
              md += `- **Keys**: ${item.hasKey ? 'Yes' : 'No'} | **Title**: ${item.hasTitle ? 'Yes' : 'No'} (${item.titleStatus || 'N/A'})\n`;
            }
            if (item.customer?.name) {
              md += `- **Customer**: ${item.customer.name} (${item.customer.email || 'No email'})\n`;
            }
            if (item.currentLocation) {
              md += `- **Current Location**: ${item.currentLocation}\n`;
            }

            if (item.container) {
              md += `\n**Container Assignment**:\n`;
              md += `  - **Container #**: \`${item.container.containerNumber}\`\n`;
              if (item.container.shippingLine) md += `  - **Shipping Line**: ${item.container.shippingLine}\n`;
              if (item.container.vesselName) md += `  - **Vessel**: ${item.container.vesselName} (Voyage: ${item.container.voyageNumber || 'N/A'})\n`;
              if (item.container.loadingPort) md += `  - **POL (Loading Port)**: ${item.container.loadingPort}\n`;
              if (item.container.destinationPort) md += `  - **POD (Destination Port)**: ${item.container.destinationPort}\n`;
              if (item.container.estimatedArrival) md += `  - **ETA**: ${item.container.estimatedArrival}\n`;
              if (item.container.progress !== null && item.container.progress !== undefined) {
                md += `  - **Progress**: ${item.container.progress}%\n`;
              }
            } else {
              md += `\n**Container**: Not yet loaded into an ocean container.\n`;
            }

            if (item.dispatch) {
              md += `\n**Inland Dispatch**:\n`;
              md += `  - **Carrier**: ${item.dispatch.carrier || 'Towing'}\n`;
              md += `  - **Route**: ${item.dispatch.origin || 'Pickup'} -> ${item.dispatch.destination || 'Export Yard'}\n`;
              if (item.dispatch.status) md += `  - **Dispatch Status**: ${item.dispatch.status}\n`;
            }

            if (includeTracking && item.trackingEvents && item.trackingEvents.length > 0) {
              md += `\n**Tracking Milestones**:\n`;
              for (const ev of item.trackingEvents) {
                const dateStr = ev.timestamp ? new Date(ev.timestamp).toLocaleDateString() : '';
                md += `  - [${ev.actual ? 'x' : ' '}] **${ev.status}** ${dateStr ? `(${dateStr})` : ''}: ${ev.description || ev.location || ''}\n`;
              }
            }

            md += `\n- **Web App Link**: [View in Jacxi App](${item.webAppUrl})\n`;
            md += `- **Data Source**: \`${item.dataSource}\`\n`;
            return md;
          })
          .join('\n---\n\n');

        return {
          content: [
            { type: 'text', text: formatted },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(results, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to search VIN: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 2. SEARCH CONTAINER
  // =========================================================================
  server.tool(
    'search_container',
    'Search for an ocean freight container by container number, booking number, or tracking number.',
    {
      containerNumber: z
        .string()
        .min(1)
        .describe('Container number (e.g. MSKU1234567, ABCU...), booking number, or tracking ID'),
      includeShipments: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to list all vehicles / shipments loaded inside this container'),
    },
    async ({
      containerNumber,
      includeShipments,
    }: {
      containerNumber: string;
      includeShipments: boolean;
    }) => {
      try {
        const results = await provider.searchContainer(containerNumber, includeShipments);
        await provider.logMcpActivity({
          tool: 'search_container',
          query: containerNumber,
          entityType: 'CONTAINER',
          entityId: containerNumber,
          responseSummary: `Found ${results.length} container(s)`,
          requestPayload: { containerNumber, includeShipments },
          responsePayload: { count: results.length },
        });

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No container found matching query: "${containerNumber}".`,
              },
            ],
          };
        }

        const formatted = results
          .map((c, idx) => {
            let md = `### ${idx + 1}. Container \`${c.containerNumber}\`\n`;
            md += `- **Status**: \`${c.status}\`\n`;
            if (c.shippingLine) md += `- **Shipping Line**: ${c.shippingLine}\n`;
            if (c.bookingNumber) md += `- **Booking #**: ${c.bookingNumber}\n`;
            if (c.vesselName) md += `- **Vessel**: ${c.vesselName} (Voyage: ${c.voyageNumber || 'N/A'})\n`;
            if (c.loadingPort) md += `- **POL (Port of Loading)**: ${c.loadingPort}\n`;
            if (c.destinationPort) md += `- **POD (Port of Discharge)**: ${c.destinationPort}\n`;
            if (c.departureDate) md += `- **Departure Date**: ${new Date(c.departureDate).toLocaleDateString()}\n`;
            if (c.estimatedArrival) md += `- **Estimated Arrival (ETA)**: ${new Date(c.estimatedArrival).toLocaleDateString()}\n`;
            if (c.actualArrival) md += `- **Actual Arrival**: ${new Date(c.actualArrival).toLocaleDateString()}\n`;
            if (c.currentLocation) md += `- **Current Location**: ${c.currentLocation}\n`;
            if (c.progress !== null && c.progress !== undefined) md += `- **Progress**: ${c.progress}%\n`;
            md += `- **Capacity**: ${c.shipmentCount} / ${c.maxCapacity || 4} vehicles loaded\n`;

            if (includeShipments && c.shipments && c.shipments.length > 0) {
              md += `\n**Vehicles Loaded in Container**:\n`;
              for (const s of c.shipments) {
                md += `  - **${s.vehicle}** | VIN: \`${s.vin || 'N/A'}\` | Lot: ${s.lotNumber || 'N/A'} | Status: \`${s.status}\` ${s.customerName ? `(${s.customerName})` : ''}\n`;
              }
            }

            md += `\n- **Web App Link**: [View Container in Jacxi App](${c.webAppUrl})\n`;
            md += `- **Data Source**: \`${c.dataSource}\`\n`;
            return md;
          })
          .join('\n---\n\n');

        return {
          content: [
            { type: 'text', text: formatted },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(results, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to search container: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 3. TRACK (UNIVERSAL)
  // =========================================================================
  server.tool(
    'track',
    'Universal live tracking for any VIN, container number, booking number, or lot number.',
    {
      query: z
        .string()
        .min(1)
        .describe('Tracking query: VIN (17 digits), container number, booking number, or lot number'),
    },
    async ({ query }: { query: string }) => {
      try {
        const tracking = await provider.track(query);
        await provider.logMcpActivity({
          tool: 'track',
          query,
          entityType: tracking?.resolvedType || 'TRACKING',
          entityId: query,
          responseSummary: tracking ? `Resolved as ${tracking.resolvedType} (${tracking.shipmentStatus})` : 'Not found',
          requestPayload: { query },
        });

        if (!tracking) {
          return {
            content: [{ type: 'text', text: `No tracking information found for "${query}".` }],
          };
        }

        let md = `## 🚢 Tracking Summary: \`${tracking.requestedNumber}\`\n`;
        md += `- **Resolved As**: \`${tracking.resolvedType}\`\n`;
        if (tracking.containerNumber) md += `- **Container #**: \`${tracking.containerNumber}\`\n`;
        if (tracking.containerType) md += `- **Description**: ${tracking.containerType}\n`;
        if (tracking.shipmentStatus) md += `- **Status**: \`${tracking.shipmentStatus}\`\n`;
        if (tracking.progress !== null && tracking.progress !== undefined) md += `- **Journey Progress**: ${tracking.progress}%\n`;
        if (tracking.origin) md += `- **Origin / POL**: ${tracking.origin} ${tracking.originDate ? `(${tracking.originDate})` : ''}\n`;
        if (tracking.destination) md += `- **Destination / POD**: ${tracking.destination} ${tracking.destinationDate ? `(${tracking.destinationDate})` : ''}\n`;
        if (tracking.estimatedArrival) md += `- **ETA**: ${tracking.estimatedArrival}\n`;
        if (tracking.currentLocation) md += `- **Current Location**: ${tracking.currentLocation}\n`;
        if (tracking.company?.name) md += `- **Carrier / Shipping Line**: ${tracking.company.name}\n`;

        if (tracking.events && tracking.events.length > 0) {
          md += `\n### Timeline & Events:\n`;
          for (const ev of tracking.events) {
            const timeStr = ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Pending';
            const icon = ev.actual ? '✅' : '⏳';
            md += `- ${icon} **${ev.status}** (${timeStr})\n`;
            if (ev.location) md += `  - *Location*: ${ev.location}\n`;
            if (ev.vessel) md += `  - *Vessel*: ${ev.vessel} ${ev.voyage ? `(Voyage: ${ev.voyage})` : ''}\n`;
            if (ev.description) md += `  - *Details*: ${ev.description}\n`;
          }
        }

        if (tracking.webAppUrl) {
          md += `\n[Track on Jacxi Shipping Portal](${tracking.webAppUrl})\n`;
        }
        md += `- **Source**: \`${tracking.dataSource}\`\n`;

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(tracking, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to track: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 4. LIST CONTAINERS
  // =========================================================================
  server.tool(
    'list_containers',
    'List ocean freight containers with filters for status, destination port, or search keyword.',
    {
      status: z
        .string()
        .optional()
        .describe("Container status filter: 'active', 'IN_TRANSIT', 'LOADED', 'WAITING_FOR_LOADING', 'ARRIVED', 'DELIVERED', 'CREATED'"),
      destinationPort: z
        .string()
        .optional()
        .describe('Filter by destination port name (e.g. Mersin, Dubai, Poti)'),
      search: z
        .string()
        .optional()
        .describe('Search query for container number, booking number, or vessel name'),
      limit: z
        .number()
        .optional()
        .describe('Optional maximum number of containers to return (omit to return all containers)'),
    },
    async (args: {
      status?: string;
      destinationPort?: string;
      search?: string;
      limit?: number;
    }) => {
      try {
        const containers = await provider.listContainers(args);
        await provider.logMcpActivity({
          tool: 'list_containers',
          query: args.search || args.status || 'all',
          entityType: 'CONTAINER',
          responseSummary: `Listed ${containers.length} containers`,
          requestPayload: args,
        });

        if (containers.length === 0) {
          return {
            content: [{ type: 'text', text: 'No containers found matching the criteria.' }],
          };
        }

        let md = `### Found ${containers.length} Containers\n\n`;
        md += `| Container # | Line | Vessel | Destination | Status | Vehicles | ETA |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        for (const c of containers) {
          const eta = c.estimatedArrival ? new Date(c.estimatedArrival).toLocaleDateString() : 'N/A';
          md += `| \`${c.containerNumber}\` | ${c.shippingLine || '-'} | ${c.vesselName || '-'} | ${c.destinationPort || '-'} | \`${c.status}\` | ${c.shipmentCount} | ${eta} |\n`;
        }

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(containers, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list containers: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 5. LIST SHIPMENTS
  // =========================================================================
  server.tool(
    'list_shipments',
    'List vehicle shipments with filters for status, search query, or container assignment.',
    {
      status: z
        .string()
        .optional()
        .describe("Filter by status: 'ON_HAND', 'DISPATCHING', 'IN_TRANSIT', 'RELEASED', 'DELIVERED'"),
      search: z
        .string()
        .optional()
        .describe('Search by VIN, make, model, or lot number'),
      containerNumber: z
        .string()
        .optional()
        .describe('Filter by assigned container number'),
      limit: z
        .number()
        .optional()
        .describe('Optional maximum number of shipments to return (omit to return all shipments)'),
    },
    async (args: {
      status?: string;
      search?: string;
      containerNumber?: string;
      limit?: number;
    }) => {
      try {
        const shipments = await provider.listShipments(args);
        await provider.logMcpActivity({
          tool: 'list_shipments',
          query: args.search || args.status || 'all',
          entityType: 'SHIPMENT',
          responseSummary: `Listed ${shipments.length} shipments`,
          requestPayload: args,
        });

        if (shipments.length === 0) {
          return {
            content: [{ type: 'text', text: 'No vehicle shipments found matching the criteria.' }],
          };
        }

        let md = `### Found ${shipments.length} Vehicle Shipments\n\n`;
        md += `| Vehicle | VIN | Lot # | Status | Container | Customer |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        for (const s of shipments) {
          const veh = [s.year, s.make, s.model].filter(Boolean).join(' ') || 'Vehicle';
          const containerNum = s.container ? `\`${s.container.containerNumber}\`` : '*Unassigned*';
          const cust = s.customer?.name || '-';
          md += `| ${veh} | \`${s.vin}\` | ${s.lotNumber || '-'} | \`${s.status}\` | ${containerNum} | ${cust} |\n`;
        }

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(shipments, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list shipments: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 6. SHIPPING OVERVIEW STATS
  // =========================================================================
  server.tool(
    'get_shipping_overview',
    'Get overall statistics on shipments, ocean containers, and yard operations.',
    {},
    async () => {
      try {
        const stats = await provider.getStats();
        await provider.logMcpActivity({
          tool: 'get_shipping_overview',
          query: 'overview',
          entityType: 'ANALYTICS',
          responseSummary: `${stats.totalShipments} shipments, ${stats.totalContainers} containers`,
        });

        let md = `## 📊 Jacxi Shipping Overview\n\n`;
        md += `- **Total Shipments**: **${stats.totalShipments}**\n`;
        md += `- **Total Containers**: **${stats.totalContainers}**\n`;
        md += `- **Active Ocean Containers**: **${stats.activeOceanContainers}**\n`;
        md += `- **Vehicles On Hand at Export Yard**: **${stats.yardOnHandShipments}**\n`;
        md += `- **Data Source**: \`${stats.dataSource}\`\n\n`;

        md += `### Shipments Breakdown by Status:\n`;
        for (const [st, count] of Object.entries(stats.shipmentsByStatus)) {
          md += `- \`${st}\`: ${count}\n`;
        }

        md += `\n### Containers Breakdown by Status:\n`;
        for (const [st, count] of Object.entries(stats.containersByStatus)) {
          md += `- \`${st}\`: ${count}\n`;
        }

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(stats, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get shipping stats: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 7. SEARCH CUSTOMER
  // =========================================================================
  server.tool(
    'search_customer',
    'Search or list all customers by name, email, phone, or 8-character login code and list all their vehicle shipments.',
    {
      query: z
        .string()
        .optional()
        .default('all')
        .describe('Customer name, email, phone number, login code, or "all" to list every customer'),
      limit: z
        .number()
        .optional()
        .describe('Optional maximum customers to return (omit to return all matching customers)'),
    },
    async ({ query, limit }: { query?: string; limit?: number }) => {
      try {
        const customers = await provider.searchCustomers(query || 'all', limit);
        await provider.logMcpActivity({
          tool: 'search_customer',
          query: query || 'all',
          entityType: 'CUSTOMER',
          entityId: query || 'all',
          responseSummary: `Found ${customers.length} customer(s)`,
          requestPayload: { query, limit },
        });

        if (customers.length === 0) {
          return {
            content: [{ type: 'text', text: `No customers found matching "${query}".` }],
          };
        }

        let md = `### Found ${customers.length} Customer(s)\n\n`;
        for (const cust of customers) {
          md += `#### 👤 ${cust.name || 'Unnamed'} (${cust.email})\n`;
          if (cust.phone) md += `- **Phone**: ${cust.phone}\n`;
          if (cust.city || cust.country) md += `- **Location**: ${[cust.city, cust.country].filter(Boolean).join(', ')}\n`;
          md += `- **Total Shipments**: ${cust.shipmentCount}\n`;
          if (cust.shipments.length > 0) {
            md += `- **Vehicles**:\n`;
            for (const s of cust.shipments) {
              md += `  - **${s.vehicle}** (VIN: \`${s.vin || 'N/A'}\`) — Status: \`${s.status}\` ${s.containerNumber ? `[Container: \`${s.containerNumber}\`]` : ''}\n`;
            }
          }
          md += `\n`;
        }

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(customers, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to search customers: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 8. LIST DISPATCHES
  // =========================================================================
  server.tool(
    'list_dispatches',
    'List inland towing dispatches from US auction yards to export port terminals.',
    {
      status: z.string().optional().describe('Filter by dispatch status'),
      search: z.string().optional().describe('Search by reference number, origin, or destination'),
      limit: z.number().optional().describe('Optional max dispatches to return (omit to return all)'),
    },
    async (args: { status?: string; search?: string; limit?: number }) => {
      try {
        const dispatches = await provider.listDispatches(args);
        await provider.logMcpActivity({
          tool: 'list_dispatches',
          query: args.search || args.status || 'all',
          entityType: 'DISPATCH',
          responseSummary: `Found ${dispatches.length} dispatch(es)`,
          requestPayload: args,
        });

        if (dispatches.length === 0) {
          return {
            content: [{ type: 'text', text: 'No dispatches found matching the criteria.' }],
          };
        }

        let md = `### Found ${dispatches.length} Inland Dispatches\n\n`;
        md += `| Ref # | Route | Carrier | Status | Vehicles |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- |\n`;
        for (const d of dispatches) {
          md += `| \`${d.referenceNumber}\` | ${d.origin} → ${d.destination} | ${d.carrierName || 'Towing'} | \`${d.status}\` | ${d.shipmentCount} |\n`;
        }

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(dispatches, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list dispatches: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 9. GET CONTAINER MANIFEST
  // =========================================================================
  server.tool(
    'get_container_manifest',
    'Generate a complete cargo manifest report for a container, including all loaded vehicles, VINs, and customer breakdown.',
    {
      containerNumber: z.string().min(1).describe('Container number (e.g. CAAU5189072)'),
    },
    async ({ containerNumber }: { containerNumber: string }) => {
      try {
        const results = await provider.searchContainer(containerNumber, true);
        await provider.logMcpActivity({
          tool: 'get_container_manifest',
          query: containerNumber,
          entityType: 'CONTAINER',
          entityId: containerNumber,
          responseSummary: results[0]
            ? `Manifest for ${results[0].containerNumber} (${results[0].shipmentCount} units)`
            : 'Container not found',
        });

        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `Container "${containerNumber}" not found.` }],
          };
        }

        const c = results[0];
        let md = `## 📋 Official Container Manifest: \`${c.containerNumber}\`\n\n`;
        md += `- **Booking Number**: ${c.bookingNumber || 'N/A'}\n`;
        md += `- **Shipping Line**: ${c.shippingLine || 'N/A'}\n`;
        md += `- **Vessel / Voyage**: ${c.vesselName || 'TBA'} / ${c.voyageNumber || 'TBA'}\n`;
        md += `- **Port of Loading (POL)**: ${c.loadingPort || 'N/A'}\n`;
        md += `- **Port of Discharge (POD)**: ${c.destinationPort || 'N/A'}\n`;
        md += `- **Departure Date**: ${c.departureDate ? new Date(c.departureDate).toLocaleDateString() : 'Pending'}\n`;
        md += `- **Estimated Arrival (ETA)**: ${c.estimatedArrival ? new Date(c.estimatedArrival).toLocaleDateString() : 'Pending'}\n`;
        md += `- **Total Loaded Units**: ${c.shipmentCount} / ${c.maxCapacity || 4}\n\n`;

        md += `### Cargo Itemization\n`;
        md += `| # | Vehicle | VIN | Lot # | Customer | Status |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        c.shipments.forEach((s, idx) => {
          md += `| ${idx + 1} | **${s.vehicle}** | \`${s.vin || 'N/A'}\` | ${s.lotNumber || '-'} | ${s.customerName || '-'} | \`${s.status}\` |\n`;
        });

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(c, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to generate manifest: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 10. CALCULATE SHIPPING QUOTE
  // =========================================================================
  server.tool(
    'calculate_shipping_quote',
    'Calculate an estimated shipping quote (inland towing + ocean freight + transit) from US ports to final destination.',
    {
      vehicleType: z.string().describe('Vehicle type (e.g. Sedan, SUV, Pickup Truck)'),
      originPort: z.string().optional().describe('US Port of Loading (e.g. Savannah, Houston, New York, Los Angeles)'),
      destination: z.string().optional().describe('Final destination (e.g. Mersin, Islam Qala, Herat, Kabul, Dubai)'),
    },
    async (args: { vehicleType: string; originPort?: string; destination?: string }) => {
      const quote = provider.calculateQuote(args);
      await provider.logMcpActivity({
        tool: 'calculate_shipping_quote',
        query: `${args.vehicleType} to ${args.destination || 'Destination'}`,
        entityType: 'QUOTE',
        responseSummary: `Estimated total: $${quote.totalEstimatedUsd} USD`,
        requestPayload: args,
        responsePayload: quote,
      });

      let md = `## 💰 Estimated Shipping Quote\n\n`;
      md += `- **Vehicle Type**: ${quote.vehicleType}\n`;
      md += `- **Origin Port (POL)**: ${quote.originPort}\n`;
      md += `- **Final Destination**: ${quote.destination}\n`;
      md += `- **Estimated Transit Time**: ${quote.estimatedTransitDays}\n\n`;
      md += `### Cost Breakdown (USD)\n`;
      md += `- **Inland Towing Estimate**: \`$${quote.inlandTowingEstimateUsd}\`\n`;
      md += `- **Ocean Container Freight**: \`$${quote.oceanFreightUsd}\`\n`;
      md += `- **Customs & Overland Transit**: \`$${quote.customsAndTransitUsd}\`\n`;
      md += `- **Total Estimated Rate**: **\`$${quote.totalEstimatedUsd} USD\`**\n\n`;
      md += `### Notes:\n`;
      for (const note of quote.notes) {
        md += `- ${note}\n`;
      }

      return {
        content: [
          { type: 'text', text: md },
          { type: 'text', text: `JSON Payload:\n` + JSON.stringify(quote, null, 2) },
        ],
      };
    }
  );

  // =========================================================================
  // 11. CREATE SHIPMENT
  // =========================================================================
  server.tool(
    'create_shipment',
    'Create a new vehicle shipment in Jacxi Shipping with VIN, make, model, year, lot number, customer, and optional container.',
    {
      vehicleVIN: z.string().min(5).describe('Vehicle Identification Number (VIN)'),
      vehicleYear: z.number().optional().describe('Vehicle model year (e.g. 2021)'),
      vehicleMake: z.string().optional().describe('Vehicle make (e.g. TOYOTA)'),
      vehicleModel: z.string().optional().describe('Vehicle model (e.g. 4RUNNER)'),
      vehicleColor: z.string().optional().describe('Vehicle exterior color'),
      vehicleType: z.string().optional().default('SEDAN').describe('Vehicle type (SEDAN, SUV, PICKUP, VAN, MOTORCYCLE)'),
      lotNumber: z.string().optional().describe('Copart or IAAI auction lot number'),
      auctionName: z.string().optional().describe('Auction house (e.g. Copart, IAAI)'),
      customerQuery: z.string().optional().describe('Customer email, name, ID, or 8-char loginCode'),
      containerNumber: z.string().optional().describe('Optional container number to assign'),
      price: z.number().optional().describe('Customer shipping price in USD'),
      purchasePrice: z.number().optional().describe('Vehicle purchase price in USD'),
      hasKey: z.boolean().optional().describe('Whether vehicle has keys'),
      hasTitle: z.boolean().optional().describe('Whether vehicle has export title'),
      status: z.string().optional().describe('ON_HAND, DISPATCHING, IN_TRANSIT, DELIVERED'),
    },
    async (args: any) => {
      try {
        const res = await provider.createShipment(args);
        return {
          content: [
            { type: 'text', text: `✅ ${res.message}\n\n` + JSON.stringify(res, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create shipment: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 12. UPDATE SHIPMENT
  // =========================================================================
  server.tool(
    'update_shipment',
    'Update an existing vehicle shipment by VIN, lot number, or shipment ID (status, container assignment, price, payment status, keys/title, notes).',
    {
      vinOrId: z.string().min(1).describe('VIN, lot number, or shipment ID'),
      status: z.string().optional().describe('ON_HAND, DISPATCHING, IN_TRANSIT, IN_TRANSIT_TO_DESTINATION, DELIVERED'),
      containerNumber: z.string().optional().describe('Container number to assign (or empty string to unassign)'),
      price: z.number().optional().describe('Updated shipping fare in USD'),
      paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
      hasKey: z.boolean().optional(),
      hasTitle: z.boolean().optional(),
      internalNotes: z.string().optional(),
    },
    async (args: any) => {
      try {
        const res = await provider.updateShipment(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update shipment: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 13. CREATE CONTAINER
  // =========================================================================
  server.tool(
    'create_container',
    'Create a new ocean freight container in Jacxi Shipping.',
    {
      containerNumber: z.string().min(4).describe('Container number (e.g. MSKU9012345)'),
      bookingNumber: z.string().optional().describe('Carrier booking reference'),
      shippingLine: z.string().optional().describe('Shipping line (e.g. MAERSK, MSC, CMA CGM, HAPAG-LLOYD)'),
      vesselName: z.string().optional().describe('Vessel name'),
      voyageNumber: z.string().optional().describe('Voyage number'),
      loadingPort: z.string().optional().describe('Port of Loading (e.g. Houston, Savannah, New York)'),
      destinationPort: z.string().optional().describe('Port of Discharge (e.g. Mersin, Dubai, Jebel Ali)'),
      estimatedArrival: z.string().optional().describe('Estimated arrival date (YYYY-MM-DD)'),
      maxCapacity: z.number().optional().default(4).describe('Max vehicle capacity (default 4)'),
      status: z.string().optional().describe('Initial container status (default CREATED)'),
      notes: z.string().optional(),
    },
    async (args: any) => {
      try {
        const res = await provider.createContainer(args);
        return {
          content: [{ type: 'text', text: `✅ ${res.message}\n\n` + JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create container: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 14. UPDATE CONTAINER & ADD TRACKING MILESTONE
  // =========================================================================
  server.tool(
    'update_container_and_tracking',
    'Update an ocean container status, ETA, current location, or progress %, and optionally append a new tracking milestone event.',
    {
      containerNumber: z.string().min(1).describe('Container number or booking number'),
      status: z.string().optional().describe('CREATED, WAITING_FOR_LOADING, LOADED, IN_TRANSIT, ARRIVED_PORT, CUSTOMS_CLEARANCE, RELEASED, CLOSED'),
      currentLocation: z.string().optional().describe('Current port or ocean position'),
      vesselName: z.string().optional().describe('Updated vessel name'),
      voyageNumber: z.string().optional().describe('Updated voyage number'),
      estimatedArrival: z.string().optional().describe('Updated ETA (YYYY-MM-DD)'),
      progress: z.number().optional().describe('Journey progress percentage (0-100)'),
      milestoneStatus: z.string().optional().describe('Optional new tracking milestone title to record'),
      milestoneLocation: z.string().optional().describe('Optional location for the new tracking milestone'),
      milestoneDescription: z.string().optional().describe('Optional detailed description for the new milestone'),
    },
    async (args: any) => {
      try {
        const res = await provider.updateContainerAndTracking(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to update container: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 15. CREATE DISPATCH
  // =========================================================================
  server.tool(
    'create_dispatch',
    'Create a new US domestic inland towing dispatch from auction yard to port/warehouse and optionally assign VINs.',
    {
      origin: z.string().min(1).describe('Pickup location / auction yard'),
      destination: z.string().min(1).describe('Delivery warehouse or port terminal'),
      referenceNumber: z.string().optional().describe('Optional custom dispatch reference number'),
      companyQuery: z.string().optional().describe('Carrier company name or ID'),
      cost: z.number().optional().describe('Dispatch towing cost in USD'),
      status: z.string().optional().describe('PENDING, DISPATCHED, IN_TRANSIT, ARRIVED_AT_PORT, COMPLETED'),
      notes: z.string().optional(),
      vins: z.array(z.string()).optional().describe('Optional list of vehicle VINs to assign to this dispatch'),
    },
    async (args: any) => {
      try {
        const res = await provider.createDispatch(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to create dispatch: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 16. LIST & MANAGE OVERLAND TRANSITS (MERSIN / DUBAI -> AFGHANISTAN)
  // =========================================================================
  server.tool(
    'list_and_manage_transits',
    'List, search, create, or add milestone events to overland transits (e.g. Mersin or Dubai to Herat / Islam Qala / Kabul, Afghanistan).',
    {
      action: z.enum(['list', 'create', 'add_event']).optional().default('list'),
      search: z.string().optional().describe('Search by reference number, origin, or destination'),
      status: z.string().optional().describe('PENDING, DISPATCHED, IN_TRANSIT, ARRIVED, DELIVERED, CANCELLED'),
      referenceNumber: z.string().optional().describe('Transit reference number (for create or add_event)'),
      origin: z.string().optional().describe('Origin city/port (e.g. Mersin, Turkey or Dubai, UAE)'),
      destination: z.string().optional().describe('Destination city (e.g. Herat or Kabul, Afghanistan)'),
      cost: z.number().optional().describe('Agreed overland transit cost in USD'),
      eventStatus: z.string().optional().describe('Event status when action=add_event'),
      eventLocation: z.string().optional().describe('Border crossing or city when action=add_event (e.g. Dogubayazit, Islam Qala)'),
      eventDescription: z.string().optional().describe('Event description when action=add_event'),
      vins: z.array(z.string()).optional().describe('Vehicle VINs to assign when action=create'),
      limit: z.number().optional().describe('Optional max transits to return (omit to return all)'),
    },
    async (args: any) => {
      try {
        const res = await provider.listAndManageTransits(args);
        await provider.logMcpActivity({
          tool: 'list_and_manage_transits',
          query: args.referenceNumber || args.search || args.action || 'list',
          entityType: 'TRANSIT',
          responseSummary:
            res.action === 'list'
              ? `Listed ${res.transits?.length || 0} overland transit(s)`
              : `Executed transit ${res.action}`,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed transit operation: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 17. MANAGE CUSTOMER (CREATE OR RESET 8-CHAR LOGIN CODE)
  // =========================================================================
  server.tool(
    'manage_customer',
    'Create a new customer account or reset/generate a customer 8-character loginCode.',
    {
      action: z.enum(['create', 'reset_login_code']).describe("'create' a new customer or 'reset_login_code' for an existing customer"),
      customerQuery: z.string().optional().describe('Customer name, email, or ID (when resetting login code)'),
      name: z.string().optional().describe('Customer full name'),
      email: z.string().optional().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone / WhatsApp number'),
      city: z.string().optional().describe('Customer city'),
      country: z.string().optional().describe('Customer country'),
    },
    async (args: any) => {
      try {
        const res = await provider.manageCustomer(args);
        await provider.logMcpActivity({
          tool: 'manage_customer',
          query: args.email || args.customerQuery || args.action,
          entityType: 'CUSTOMER',
          responseSummary: res.message || 'Customer operation completed',
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed customer operation: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 18. GET CUSTOMER LEDGER & BALANCE
  // =========================================================================
  server.tool(
    'get_customer_ledger_and_balance',
    'Get a customer financial statement, current balance, debit/credit ledger entries, collection status, and unpaid/paid invoices.',
    {
      query: z.string().min(1).describe('Customer name, email, user ID, or 8-character loginCode'),
    },
    async ({ query }: { query: string }) => {
      try {
        const ledger = await provider.getCustomerLedgerAndBalance(query);
        await provider.logMcpActivity({
          tool: 'get_customer_ledger_and_balance',
          query,
          entityType: 'LEDGER',
          responseSummary: ledger
            ? `${ledger.customerName || ledger.customerEmail}: Balance $${ledger.currentBalance} USD (${ledger.unpaidInvoicesCount} unpaid invoices)`
            : 'Customer not found',
        });

        if (!ledger) {
          return {
            content: [{ type: 'text', text: `No customer found matching "${query}".` }],
          };
        }

        let md = `## 💳 Customer Financial Statement: ${ledger.customerName || ledger.customerEmail}\n\n`;
        md += `- **Email**: ${ledger.customerEmail}\n`;
        md += `- **Login Code**: \`${ledger.loginCode || 'N/A'}\`\n`;
        md += `- **Collection Status**: \`${ledger.collectionStatus}\`\n`;
        md += `- **Current Ledger Balance**: **\`$${ledger.currentBalance.toLocaleString()} USD\`**\n`;
        md += `- **Total Debits**: \`$${ledger.totalDebits.toLocaleString()}\` | **Total Credits**: \`$${ledger.totalCredits.toLocaleString()}\`\n`;
        md += `- **Unpaid Invoices**: ${ledger.unpaidInvoicesCount} (\`$${ledger.unpaidInvoicesAmount.toLocaleString()} USD\` remaining)\n`;

        return {
          content: [
            { type: 'text', text: md },
            { type: 'text', text: `JSON Payload:\n` + JSON.stringify(ledger, null, 2) },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get customer ledger: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 19. LIST & SEARCH INVOICES
  // =========================================================================
  server.tool(
    'list_and_search_invoices',
    'Search and list customer invoices (UserInvoice) by invoice number, customer name/email, VIN, container number, or status.',
    {
      query: z.string().optional().describe('Invoice number (e.g. INV-...), customer name, VIN, or container number'),
      status: z.string().optional().describe('DRAFT, PENDING, SENT, PAID, OVERDUE, CANCELLED'),
      limit: z.number().optional().describe('Optional max invoices to return (omit to return all)'),
    },
    async (args: any) => {
      try {
        const invoices = await provider.listAndSearchInvoices(args);
        await provider.logMcpActivity({
          tool: 'list_and_search_invoices',
          query: args.query || args.status || 'all',
          entityType: 'INVOICE',
          responseSummary: `Found ${invoices.length} invoice(s)`,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(invoices, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to search invoices: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 20. GET FINANCIAL & EXPENSE SUMMARY
  // =========================================================================
  server.tool(
    'get_financial_and_expense_summary',
    'Get company-wide billing totals, collected payments, outstanding receivables, and container/dispatch operational expenses.',
    {
      containerNumber: z.string().optional().describe('Optional container number to filter expenses'),
      limit: z.number().optional().describe('Optional max expenses to return (omit to return all)'),
    },
    async (args: any) => {
      try {
        const summary = await provider.getFinancialAndExpenseSummary(args);
        await provider.logMcpActivity({
          tool: 'get_financial_and_expense_summary',
          query: args.containerNumber || 'company-wide',
          entityType: 'FINANCE',
          responseSummary: `Billed: $${summary.invoicing.totalBilledUsd}, Collected: $${summary.invoicing.totalCollectedUsd}`,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get financial summary: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 21. FETCH AUCTION LOT (LIVE COPART / IAAI SCRAPER)
  // =========================================================================
  server.tool(
    'fetch_auction_lot',
    'Fetch live vehicle specs and auction details from Copart / IAAI by lot number and check existing Jacxi shipments.',
    {
      lotOrVin: z.string().min(1).describe('Copart/IAAI numeric lot number (e.g. 59292076) or VIN'),
    },
    async ({ lotOrVin }: { lotOrVin: string }) => {
      try {
        const res = await provider.fetchAuctionLot(lotOrVin);
        await provider.logMcpActivity({
          tool: 'fetch_auction_lot',
          query: lotOrVin,
          entityType: 'AUCTION_LOT',
          responseSummary: res.liveAuctionData
            ? `Fetched live Copart lot ${lotOrVin}`
            : `Checked ${res.existingShipmentsInJacxi.length} existing Jacxi record(s) for ${lotOrVin}`,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch auction lot: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 22. SYNC LIVE CONTAINER TRACKING (CARRIER & VESSEL AIS)
  // =========================================================================
  server.tool(
    'sync_live_container_tracking',
    'Trigger a live ocean carrier & vessel AIS tracking refresh for a container and return updated milestones and ETA.',
    {
      containerNumber: z.string().min(1).describe('Container number (e.g. CAAU5189072)'),
    },
    async ({ containerNumber }: { containerNumber: string }) => {
      try {
        const res = await provider.syncLiveContainerTracking(containerNumber);
        await provider.logMcpActivity({
          tool: 'sync_live_container_tracking',
          query: containerNumber,
          entityType: 'CONTAINER',
          responseSummary: `Synced live carrier tracking for ${containerNumber}`,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to sync live tracking: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 23. LIST DOCUMENTS & GENERATE GATE PASS
  // =========================================================================
  server.tool(
    'list_and_generate_documents',
    'List shipment/container documents (BOL, Title, Customs, Photos) or generate an official vehicle Release Gate Pass token.',
    {
      action: z.enum(['list', 'generate_gate_pass']).optional().default('list'),
      query: z.string().optional().describe('VIN, container number, lot number, or document name'),
      limit: z.number().optional().describe('Optional max documents to return (omit to return all)'),
    },
    async (args: any) => {
      try {
        const res = await provider.listAndGenerateDocuments(args);
        await provider.logMcpActivity({
          tool: 'list_and_generate_documents',
          query: args.query || args.action || 'list',
          entityType: 'DOCUMENT',
          responseSummary:
            res.action === 'generate_gate_pass'
              ? `Generated Gate Pass ${res.gatePass?.releaseToken} for ${res.gatePass?.vin}`
              : `Listed ${res.documents?.length || 0} document(s)`,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed document/gate-pass operation: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // 24. SEND CUSTOMER NOTIFICATION
  // =========================================================================
  server.tool(
    'send_customer_notification',
    'Send an in-app notification alert to a customer or staff member regarding a shipment, container, or invoice update.',
    {
      customerQuery: z.string().min(1).describe('Customer name, email, loginCode, or user ID'),
      title: z.string().min(1).describe('Notification title'),
      description: z.string().min(1).describe('Notification message body'),
      type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional().default('INFO'),
      link: z.string().optional().describe('Optional dashboard link (e.g. /dashboard/shipments/...)'),
    },
    async (args: any) => {
      try {
        const res = await provider.sendCustomerNotification(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to send notification: ${err?.message || err}` }],
        };
      }
    }
  );

  // =========================================================================
  // MCP RESOURCES & PROMPTS
  // =========================================================================
  if (typeof server.resource === 'function') {
    server.resource(
      'shipping-overview',
      'jacxi://stats/overview',
      async (uri: URL) => {
        const stats = await provider.getStats();
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }
    );

    server.resource(
      'active-containers',
      'jacxi://containers/active',
      async (uri: URL) => {
        const containers = await provider.listContainers({ status: 'active' });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(containers, null, 2),
            },
          ],
        };
      }
    );
  }

  if (typeof server.prompt === 'function') {
    server.prompt(
      'customer-tracking-update',
      'Draft a professional customer tracking update message for a vehicle VIN or container',
      { query: z.string().describe('VIN or Container Number') },
      async ({ query }: { query: string }) => {
        const tracking = await provider.track(query);
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please draft a polite, clear WhatsApp and Email update for our Jacxi Shipping customer regarding "${query}". Here is the live tracking data:\n\n${JSON.stringify(
                  tracking,
                  null,
                  2
                )}`,
              },
            },
          ],
        };
      }
    );
  }
}
