#!/usr/bin/env node

// Entry point for MCP server: delegates to src/index.mjs (tools/common, tools/market, tools/account, tools/orders).
import("./src/index.mjs").catch((err) => {
  console.error("Pionex MCP server error:", err);
  process.exit(1);
});

