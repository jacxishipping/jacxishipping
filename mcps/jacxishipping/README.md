# Jacxi Shipping MCP Server

Model Context Protocol (MCP) server for the **Jacxi Shipping** web application. It enables AI assistants and agents (Antigravity, Claude, Cursor, ChatGPT, etc.) to query real-time vehicle identification numbers (VIN), ocean shipping containers, live tracking milestones, and operational logistics data directly from your web app.

---

## Features & Available Tools

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `search_vin` | `vin` (string, required)<br>`includeTracking` (bool, default `true`) | Searches vehicles by full or partial VIN, lot number, or shipment ID. Returns car details, photos count, container assignment, dispatch carrier, delivery status, and web link. |
| `search_container` | `containerNumber` (string, required)<br>`includeShipments` (bool, default `true`) | Searches ocean containers by container number (e.g. `CAAU5189072`), booking number, or tracking ID. Returns vessel name, voyage, POL/POD ports, ETAs, and all vehicles loaded inside. |
| `track` | `query` (string, required) | Universal live tracking for any VIN, container number, booking number, or lot number. Returns milestone progression, locations, and status events. |
| `list_containers` | `status` (optional)<br>`destinationPort` (optional)<br>`search` (optional)<br>`limit` (default `15`) | Lists containers with status filters (`active`, `IN_TRANSIT`, `LOADED`, `CREATED`, etc.) and destination ports. |
| `list_shipments` | `status` (optional)<br>`search` (optional)<br>`containerNumber` (optional)<br>`limit` (default `15`) | Lists shipments with status filters (`ON_HAND`, `DISPATCHING`, `IN_TRANSIT`, `DELIVERED`). |
| `get_shipping_overview` | *None* | High-level logistics overview: total shipments, total containers, active ocean containers, and yard on-hand inventory. |

---

## 3-Tier Resilient Architecture

The MCP server implements an automatic fallback data provider:

1. **Direct Database (Prisma / PostgreSQL)**: If `DATABASE_URL` is set, it executes direct queries with full relational joins (`Shipment`, `Container`, `Dispatch`, `Transit`, `User`).
2. **Web App REST API**: If the database is not directly accessible, it queries the running Jacxi Next.js web application (`/api/tracking`, `/api/search`, `/api/containers`, `/api/shipments`).
3. **Local Snapshot Fallback**: If both database and web server are offline, it queries the local backup snapshot (`backups/jacxi-backup-*.json`), ensuring instant query responses during development or offline testing.

Each result includes a `dataSource` indicator (`database`, `api`, or `snapshot`).

---

## Configuration

### 1. Antigravity Configuration (`~/.gemini/config/mcp_config.json`)

Already configured in your global Antigravity config:

```json
{
  "mcpServers": {
    "jacxishipping": {
      "command": "node",
      "args": [
        "C:/Users/Administrator/Documents/GitHub/jacxishipping/node_modules/tsx/dist/cli.mjs",
        "C:/Users/Administrator/Documents/GitHub/jacxishipping/mcps/jacxishipping/src/index.ts"
      ],
      "env": {
        "JACXISHIPPING_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. Claude Desktop (`%APPDATA%/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "jacxishipping": {
      "command": "node",
      "args": [
        "C:/Users/Administrator/Documents/GitHub/jacxishipping/node_modules/tsx/dist/cli.mjs",
        "C:/Users/Administrator/Documents/GitHub/jacxishipping/mcps/jacxishipping/src/index.ts"
      ],
      "env": {
        "JACXISHIPPING_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 3. Environment Variables (Optional)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string for direct Prisma access | Reads from root `.env` |
| `JACXISHIPPING_APP_URL` | Base URL of the Jacxi Shipping web app | `http://localhost:3000` |

---

## Running and Testing

### Run Provider Unit Tests
```bash
node node_modules/tsx/dist/cli.mjs mcps/jacxishipping/test-client.ts
```

### Run MCP JSON-RPC Stdio Protocol Test
```bash
node node_modules/tsx/dist/cli.mjs mcps/jacxishipping/test-protocol.ts
```

### Run Standalone HTTP / SSE / OpenAPI Gateway (for ChatGPT, Gemini, Grok)
```bash
npm run mcp:http
```

### Run Server Standalone (Stdio for Desktop MCP Clients)
```bash
npm run mcp:server
```

---

## Connecting External Chatbots & Agents

See [CONNECTING_AI_AGENTS.md](./CONNECTING_AI_AGENTS.md) for detailed setup guides and code examples for:
- **ChatGPT**: Custom GPT Actions via OpenAPI 3.1
- **Google Gemini**: Gemini API & Google AI Studio function declarations
- **xAI Grok**: Grok API OpenAI-compatible function calling
- **Anthropic Claude**: Claude Desktop & Claude API


