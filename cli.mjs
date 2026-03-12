#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import os from "os";
import readline from "readline";

const PIONEX_SERVER_ENTRY = {
  command: "npx",
  args: ["pionex-mcp-server"],
  env: {},
};

const CONFIG_PATHS = {
  cursor: path.join(os.homedir(), ".cursor", "mcp.json"),
  openclaw: path.join(os.homedir(), ".openclaw", "openclaw.json"),
};

// mcporter config used by OpenClaw workspace:
// ~/.openclaw/workspace/config/mcporter.json
const MCPORTER_CONFIG_PATH = path.join(
  os.homedir(),
  ".openclaw",
  "workspace",
  "config",
  "mcporter.json"
);

function ask(rl, question, defaultValue = "") {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function runSetup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n  Pionex MCP Server — Setup\n");
  console.log("  This will add the Pionex MCP server to your client config and store API credentials.\n");

  const clientAnswer = await ask(
    rl,
    "Which client? (1 = Cursor, 2 = OpenClaw, 3 = Both)",
    "3"
  );
  const choice = clientAnswer === "1" ? "cursor" : clientAnswer === "2" ? "openclaw" : "both";
  const clients = choice === "both" ? ["cursor", "openclaw"] : [choice];

  const apiKey = await ask(rl, "Pionex API Key");
  if (!apiKey) {
    console.error("  API Key is required.");
    rl.close();
    process.exit(1);
  }

  const apiSecret = await ask(rl, "Pionex API Secret");
  if (!apiSecret) {
    console.error("  API Secret is required.");
    rl.close();
    process.exit(1);
  }

  const baseUrl = await ask(rl, "Pionex Base URL", "https://api.pionex.com");

  rl.close();

  const entry = {
    ...PIONEX_SERVER_ENTRY,
    env: {
      PIONEX_API_KEY: apiKey,
      PIONEX_API_SECRET: apiSecret,
      PIONEX_BASE_URL: baseUrl,
    },
  };

  // 1) Update per-client MCP configs (Cursor, OpenClaw).
  for (const client of clients) {
    const configPath = CONFIG_PATHS[client];
    const dir = path.dirname(configPath);

    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      console.error(`  Failed to create directory for ${client}:`, e.message);
      continue;
    }

    let data = {};
    try {
      const raw = await fs.readFile(configPath, "utf8");
      data = JSON.parse(raw);
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.warn(`  Could not read ${configPath}, will create new file. (${e.message})`);
      }
    }

    if (!data.mcpServers) {
      data.mcpServers = {};
    }
    data.mcpServers.pionex = entry;

    try {
      await fs.writeFile(configPath, JSON.stringify(data, null, 2), "utf8");
      console.log(`  Wrote: ${configPath}`);
    } catch (e) {
      console.error(`  Failed to write ${configPath}:`, e.message);
    }
  }

  // 2) Update mcporter config for OpenClaw workspace so mcporter can also discover this server.
  try {
    const dir = path.dirname(MCPORTER_CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });

    let data = {};
    try {
      const raw = await fs.readFile(MCPORTER_CONFIG_PATH, "utf8");
      data = JSON.parse(raw);
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.warn(
          `  Could not read ${MCPORTER_CONFIG_PATH}, will create new file. (${e.message})`
        );
      }
    }

    if (!data.mcpServers) {
      data.mcpServers = {};
    }
    data.mcpServers.pionex = entry;

    // Preserve any existing top-level keys (like imports) and other servers.
    await fs.writeFile(
      MCPORTER_CONFIG_PATH,
      JSON.stringify(data, null, 2),
      "utf8"
    );
    console.log(`  Wrote: ${MCPORTER_CONFIG_PATH}`);
  } catch (e) {
    console.error(
      `  Failed to write mcporter config at ${MCPORTER_CONFIG_PATH}:`,
      e.message
    );
  }

  console.log(
    "\n  Done. Restart Cursor or OpenClaw so the new MCP server is loaded.\n"
  );
}

const sub = process.argv[2];
if (sub === "setup") {
  runSetup().catch((err) => {
    console.error("Setup error:", err);
    process.exit(1);
  });
} else {
  import("./server.mjs").catch((err) => {
    console.error("Pionex MCP server error:", err);
    process.exit(1);
  });
}

