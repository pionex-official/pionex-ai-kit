import { createInterface } from "node:readline";
import { Command } from "commander";
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
import { version } from "./helpers.js";

const DEFAULT_PROFILE_NAME = "pionx-prod";
const DEFAULT_BASE_URL = "https://api.pionex.com";

function ask(rl: ReturnType<typeof createInterface>, question: string, defaultValue = ""): Promise<string> {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve((answer ?? "").trim() || defaultValue)));
}

async function cmdOnboard(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  process.stdout.write(`\n  pionex-ai-kit v${version}\n`);
  process.stdout.write("  ⚠️  Security Tips: NEVER send API keys in agent chat. Create a dedicated API Key for your agent. Please test thoroughly before connecting to large real-money accounts.\n");
  process.stdout.write("  ⚠️  安全提示：切勿在 Agent 对话中发送 API Key。请为 Agent 创建专用API Key接入，先用小金额充分验证后再接入实盘。\n\n");

  process.stdout.write("Pionex CLI — Configuration Wizard\n\n");
  process.stdout.write("Go to https://www.pionex.com/my-account/api to create an API Key (trade permission required)\n\n");
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
  const profileName = DEFAULT_PROFILE_NAME;
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
      "  You can replace 'cursor' with 'claude-desktop', 'windsurf', 'vscode', 'claude-code', 'claude', 'openclaw' or 'codex' depending on which agent you want to configure.\n\n",
  );
}

export function buildKitProgram(): Command {
  const program = new Command("pionex-ai-kit")
    .version(version, "-v, --version", "Print version number")
    .description("Pionex CLI: configure credentials and set up MCP client integration");

  program
    .command("onboard")
    .description("Interactive wizard to create ~/.pionex/config.toml (API key + secret)")
    .action(() => {
      cmdOnboard().catch((e) => {
        process.stderr.write(String(e) + "\n");
        process.exit(1);
      });
    });

  program
    .command("setup")
    .description(`Write MCP client config to register the Pionex MCP server\n  Supported clients: ${[...SUPPORTED_CLIENTS, "claude (alias for claude-code)"].join(", ")}`)
    .option("--mcp <server>", "MCP server to register (default: pionex-trade-mcp)")
    .requiredOption("--client <client>", `AI client to configure (${SUPPORTED_CLIENTS.join("|")})`)
    .action((opts: { mcp?: string; client: string }) => {
      const targetMcp = opts.mcp ?? "pionex-trade-mcp";
      if (targetMcp !== "pionex-trade-mcp") {
        process.stderr.write(`Unsupported MCP server: ${targetMcp}. Currently only 'pionex-trade-mcp' is supported.\n`);
        process.exit(1);
      }
      const normalizedClient = opts.client === "claude" ? "claude-code" : opts.client;
      if (!SUPPORTED_CLIENTS.includes(normalizedClient as ClientId)) {
        process.stderr.write(
          `Unsupported client: ${opts.client}. Supported: ${[...SUPPORTED_CLIENTS, "claude (alias for claude-code)"].join(", ")}\n`,
        );
        process.exit(1);
      }
      runSetup({ client: normalizedClient as ClientId });
    });

  return program;
}
