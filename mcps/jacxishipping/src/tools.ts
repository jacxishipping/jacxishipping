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
          description: 'Maximum results to return (default 15)',
          defaultValue: '15',
        },
      ],
      sampleArgs: {
        status: 'active',
        limit: 10,
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
          description: 'Maximum results to return (default 15)',
          defaultValue: '15',
        },
      ],
      sampleArgs: {
        status: 'IN_TRANSIT',
        limit: 10,
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
        'Search customers by name, email, phone, or 8-character login code and list their vehicle shipments.',
      parameters: [
        {
          name: 'query',
          type: 'string',
          required: true,
          description: 'Customer name, email, phone number, or login code',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Maximum customers to return (default 10)',
          defaultValue: '10',
        },
      ],
      sampleArgs: {
        query: 'Aziz',
        limit: 5,
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
          description: 'Maximum dispatches to return (default 15)',
          defaultValue: '15',
        },
      ],
      sampleArgs: {
        limit: 10,
      },
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
        .default(15)
        .describe('Maximum number of containers to return (default 15, max 50)'),
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
        .default(15)
        .describe('Maximum number of shipments to return (default 15, max 50)'),
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
    'Search customers by name, email, phone, or 8-character login code and list their vehicle shipments.',
    {
      query: z.string().min(1).describe('Customer name, email, phone number, or login code'),
      limit: z.number().optional().default(10).describe('Max customers to return (default 10)'),
    },
    async ({ query, limit }: { query: string; limit: number }) => {
      try {
        const customers = await provider.searchCustomers(query, limit);
        await provider.logMcpActivity({
          tool: 'search_customer',
          query,
          entityType: 'CUSTOMER',
          entityId: query,
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
      limit: z.number().optional().default(15).describe('Max dispatches to return'),
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
        const containers = await provider.listContainers({ status: 'active', limit: 25 });
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
