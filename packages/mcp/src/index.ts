#!/usr/bin/env node

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { readTomlProfile } from "@pionex-ai/core";

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

async function main(): Promise<void> {
  if (process.argv[2] === "--help" || process.argv[2] === "-h") {
    process.stdout.write(
      `Usage: pionex-trade-mcp\n\n` +
        `Starts the Pionex MCP server (stdio). Credentials are read from ~/.pionex/config.toml\n` +
        `and/or the environment (PIONEX_API_KEY, PIONEX_API_SECRET, PIONEX_BASE_URL).\n\n` +
        `To configure IDEs or agents (Cursor, Claude Desktop, Windsurf, VS Code, OpenClaw),\n` +
        `use the companion CLI: pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>.\n`
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
