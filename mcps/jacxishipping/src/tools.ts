import { z } from 'zod';
import { JacxiDataProvider } from './data-provider';

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

        // Format primary result with markdown
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

            // Container Info
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

            // Inland Dispatch
            if (item.dispatch) {
              md += `\n**Inland Dispatch**:\n`;
              md += `  - **Carrier**: ${item.dispatch.carrier || 'Towing'}\n`;
              md += `  - **Route**: ${item.dispatch.origin || 'Pickup'} -> ${item.dispatch.destination || 'Export Yard'}\n`;
              if (item.dispatch.status) md += `  - **Dispatch Status**: ${item.dispatch.status}\n`;
            }

            // Timeline / Tracking
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
            {
              type: 'text',
              text: formatted,
            },
            {
              type: 'text',
              text: `JSON Payload:\n` + JSON.stringify(results, null, 2),
            },
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
            {
              type: 'text',
              text: formatted,
            },
            {
              type: 'text',
              text: `JSON Payload:\n` + JSON.stringify(results, null, 2),
            },
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

        if (!tracking) {
          return {
            content: [
              {
                type: 'text',
                text: `No tracking information found for "${query}".`,
              },
            ],
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
            {
              type: 'text',
              text: md,
            },
            {
              type: 'text',
              text: `JSON Payload:\n` + JSON.stringify(tracking, null, 2),
            },
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

        if (containers.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No containers found matching the criteria.',
              },
            ],
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
            {
              type: 'text',
              text: md,
            },
            {
              type: 'text',
              text: `JSON Payload:\n` + JSON.stringify(containers, null, 2),
            },
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

        if (shipments.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No vehicle shipments found matching the criteria.',
              },
            ],
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
            {
              type: 'text',
              text: md,
            },
            {
              type: 'text',
              text: `JSON Payload:\n` + JSON.stringify(shipments, null, 2),
            },
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
            {
              type: 'text',
              text: md,
            },
            {
              type: 'text',
              text: `JSON Payload:\n` + JSON.stringify(stats, null, 2),
            },
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
}

