#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { JacxiDataProvider } from './data-provider';
import { registerJacxiTools } from './tools';

async function main() {
  // Ensure non-protocol logs only go to stderr to prevent corrupting stdio transport
  console.error('[jacxishipping-mcp] Initializing Jacxi Shipping MCP Server...');

  const server = new McpServer({
    name: 'jacxishipping',
    version: '1.0.0',
  });

  const provider = new JacxiDataProvider();
  registerJacxiTools(server, provider);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[jacxishipping-mcp] Server connected via Stdio transport and ready.');

  // Handle process termination gracefully
  const shutdown = async () => {
    console.error('[jacxishipping-mcp] Shutting down...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[jacxishipping-mcp] Fatal error starting server:', error);
  process.exit(1);
});

