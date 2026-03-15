#!/usr/bin/env node

import { createInterface } from "node:readline";
import {
  readFullConfig,
  writeFullConfig,
  configFilePath,
  runSetup,
  SUPPORTED_CLIENTS,
  type PionexTomlConfig,
  type PionexProfile,
  type ClientId,
} from "@pionex-ai/core";

const DEFAULT_PROFILE_NAME = "pionx-prod";
const DEFAULT_BASE_URL = "https://api.pionex.com";

function ask(rl: ReturnType<typeof createInterface>, question: string, defaultValue = ""): Promise<string> {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve((answer ?? "").trim() || defaultValue)));
}

async function cmdOnboard(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write("\n  pionex-ai-kit v0.2.x\n");
  process.stdout.write("  ⚠️  Security Tips: NEVER send API keys in agent chat. Create a dedicated API Key for your agent. Please test thoroughly before connecting to large real-money accounts.\n");
  process.stdout.write("  ⚠️  安全提示：切勿在 Agent 对话中发送 API Key。请为 Agent 创建专用API Key接入，先用小金额充分验证后再接入实盘。\n\n");

  process.stdout.write("Pionex CLI — Configuration Wizard\n\n");
  process.stdout.write("Go to https://www.pionex.com/zh-CN/my-account/api to create an API Key (trade permission required)\n\n");
  process.stdout.write("Credentials will be saved to " + configFilePath() + "\n\n");

  const apiKey = await ask(rl, "Pionex API Key");
  if (!apiKey) {
    process.stderr.write("  Error: API Key cannot be empty.\n");
    rl.close();
    process.exit(1);
  }

  const secretKey = await ask(rl, "Pionex API Secret");
  if (!secretKey) {
    process.stderr.write("  Error: API Secret cannot be empty.\n");
    rl.close();
    process.exit(1);
  }

  const profileName = await ask(rl, "Profile name", DEFAULT_PROFILE_NAME);

  rl.close();

  let config: PionexTomlConfig = { profiles: {} };
  try {
    config = readFullConfig();
  } catch {
    config = { profiles: {} };
  }
  if (!config.profiles) config.profiles = {};

  const profile: PionexProfile = {
    api_key: apiKey,
    secret_key: secretKey,
    base_url: DEFAULT_BASE_URL,
  };
  config.profiles[profileName] = profile;
  config.default_profile = profileName;

  try {
    writeFullConfig(config);
  } catch (e) {
    process.stderr.write("  Failed to write config: " + (e instanceof Error ? e.message : String(e)) + "\n");
    process.exit(1);
  }

  process.stdout.write("\n  Config saved to " + configFilePath() + "\n");
  process.stdout.write("  Default profile: " + profileName + "\n");
  process.stdout.write("  Usage: pionex-ai-kit onboard\n");
  process.stdout.write(
    "  Next: run 'pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor' or " +
      "'pionex-trade-mcp setup --client cursor' to register the MCP server.\n" +
      "  You can replace 'cursor' with 'claude-desktop', 'windsurf', 'vscode', 'claude-code', or 'open_claw' depending on which agent you want to configure.\n\n",
  );
}

function printHelp(): void {
  process.stdout.write(`
Usage: pionex-ai-kit <command>

Commands:
  onboard        Interactive wizard to create ~/.pionex/config.toml (API key, secret)
  help           Show this help

The MCP server (pionex-trade-mcp) reads credentials from ~/.pionex/config.toml.
Install it with: npm install -g pionex-trade-mcp
Then run: pionex-trade-mcp setup --client cursor

Shortcuts:
  setup          Equivalent to 'pionex-trade-mcp setup --client <client>' (for pionex-trade-mcp)

`);
}

function parseSetupArgs(argv: string[]): { mcp?: string; client?: string } {
  let mcp: string | undefined;
  let client: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--mcp" && argv[i + 1]) {
      mcp = argv[++i];
    } else if (arg.startsWith("--mcp=")) {
      mcp = arg.slice("--mcp=".length);
    } else if (arg === "--client" && argv[i + 1]) {
      client = argv[++i];
    } else if (arg.startsWith("--client=")) {
      client = arg.slice("--client=".length);
    }
  }
  return { mcp, client };
}

function cmdSetup(argv: string[]): void {
  const { mcp, client } = parseSetupArgs(argv);
  const targetMcp = mcp ?? "pionex-trade-mcp";
  if (targetMcp !== "pionex-trade-mcp") {
    process.stderr.write(`Unsupported MCP server: ${targetMcp}. Currently only 'pionex-trade-mcp' is supported.\n`);
    process.exit(1);
  }
  if (!client) {
    process.stderr.write(
      "Usage: pionex-ai-kit setup --mcp=pionex-trade-mcp --client <" +
        SUPPORTED_CLIENTS.join("|") +
        ">\n",
    );
    process.exit(1);
  }
  if (!SUPPORTED_CLIENTS.includes(client as ClientId)) {
    process.stderr.write(
      `Unsupported client: ${client}. Supported: ${SUPPORTED_CLIENTS.join(", ")}\n`,
    );
    process.exit(1);
  }
  runSetup({ client: client as ClientId });
}

function main(): void {
  const cmd = process.argv[2];
  if (cmd === "onboard") {
    cmdOnboard().catch((e) => {
      process.stderr.write(String(e) + "\n");
      process.exit(1);
    });
    return;
  }
  if (cmd === "setup") {
    cmdSetup(process.argv.slice(3));
    return;
  }
  if (cmd === "help" || cmd === "--help" || cmd === "-h" || !cmd) {
    printHelp();
    return;
  }
  process.stderr.write("Unknown command: " + cmd + ". Run 'pionex-ai-kit help'.\n");
  process.exit(1);
}

main();
