#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerMarketTools } from "./tools/market/index.mjs";
import { registerAccountTools } from "./tools/account/index.mjs";
import { registerOrdersTools } from "./tools/orders/index.mjs";

const server = new McpServer(
  {
    name: "pionex-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerMarketTools(server);
registerAccountTools(server);
registerOrdersTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

