#!/usr/bin/env node

import { parseArgs } from "node:util";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { readTomlProfile, runSetup, printSetupUsage, getConfigPath, SUPPORTED_CLIENTS } from "@pionex-ai/core";
import type { ClientId } from "@pionex-ai/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

function applyProfileToEnv(profile: ReturnType<typeof readTomlProfile>): void {
  // Priority:
  // 1. Existing env vars (from user shell or client config env)
  // 2. Fallback to ~/.pionex/config.toml profile values
  if (!process.env.PIONEX_API_KEY && profile.api_key) {
    process.env.PIONEX_API_KEY = profile.api_key;
  }
  if (!process.env.PIONEX_API_SECRET && profile.secret_key) {
    process.env.PIONEX_API_SECRET = profile.secret_key;
  }
  if (!process.env.PIONEX_BASE_URL && profile.base_url) {
    process.env.PIONEX_BASE_URL = profile.base_url;
  }
}

function handleSetup(): void {
  const { values } = parseArgs({
    options: {
      client: { type: "string", short: "c" },
    },
    allowPositionals: true,
  });

  const client = values.client;
  if (!client || !SUPPORTED_CLIENTS.includes(client as ClientId)) {
    printSetupUsage();
    process.exitCode = 1;
    return;
  }

  if (!getConfigPath(client as ClientId)) {
    process.stderr.write(`Unsupported client: ${client}\n`);
    process.exit(1);
  }

  runSetup({ client: client as ClientId });
}

async function main(): Promise<void> {
  if (process.argv[2] === "setup") {
    handleSetup();
    return;
  }

  if (process.argv[2] === "--help" || process.argv[2] === "-h") {
    process.stdout.write(
      `Usage: pionex-trade-mcp [setup --client <cursor|claude-desktop|windsurf|vscode>]\n\n` +
        `Without arguments: start the MCP server. Credentials are read from ~/.pionex/config.toml.\n` +
        `Run "pionex config init" first to create the config, then "pionex-trade-mcp setup --client cursor".\n`
    );
    return;
  }

  const profile = readTomlProfile();
  applyProfileToEnv(profile);

  const runServerPath = join(__dirname, "..", "src", "run-server.mjs");
  await import(pathToFileURL(runServerPath).href);
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
