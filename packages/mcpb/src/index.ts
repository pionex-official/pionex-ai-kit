#!/usr/bin/env node

import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, toToolErrorPayload } from "@pionex-ai/core";
import { createServer } from "./server.js";

function printHelp(): void {
  process.stdout.write(`
Usage: pionex-mcp [options]

Options:
  --modules <list>     Comma-separated list of modules to load
                       Available: market, account, orders, bot
                       Default: market,account,orders,bot

  --profile <name>     Profile to load from ~/.pionex/config.toml
  --base-url <url>     Override API base URL
  --read-only          Expose only read/query tools
  --help               Show this help message
  --version            Show version

Credentials (priority: env vars > ~/.pionex/config.toml):
  PIONEX_API_KEY       Pionex API key
  PIONEX_API_SECRET    Pionex API secret
  PIONEX_BASE_URL      Optional API base URL override
`);
}

function parseCli() {
  const parsed = parseArgs({
    options: {
      modules: { type: "string" },
      profile: { type: "string" },
      "base-url": { type: "string" },
      "read-only": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      version: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });
  return {
    modules: parsed.values.modules,
    profile: parsed.values.profile,
    baseUrl: parsed.values["base-url"],
    readOnly: parsed.values["read-only"] ?? false,
    help: parsed.values.help ?? false,
    version: parsed.values.version ?? false,
  };
}

async function main(): Promise<void> {
  const cli = parseCli();

  if (cli.help) {
    printHelp();
    return;
  }

  if (cli.version) {
    process.stdout.write(`pionex-mcp\n`);
    return;
  }

  const config = loadConfig({
    modules: cli.modules,
    profile: cli.profile,
    baseUrl: cli.baseUrl,
    readOnly: cli.readOnly,
  });
  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const payload = toToolErrorPayload(error);
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
});
