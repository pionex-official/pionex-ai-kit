import {
  SUPPORTED_CLIENTS,
  configFilePath,
  readFullConfig,
  runSetup,
  version,
  writeFullConfig
<<<<<<<< HEAD:packages/cli/dist/kit-LUI2MN26.js
} from "./chunk-NGPWUQ2A.js";
========
} from "./chunk-NAOQJBW5.js";
>>>>>>>> main:packages/cli/dist/kit-6KS3OFXY.js

// src/kit.ts
import { createInterface } from "readline";
import { Command } from "commander";
var DEFAULT_PROFILE_NAME = "pionx-prod";
var DEFAULT_BASE_URL = "https://api.pionex.com";
function ask(rl, question, defaultValue = "") {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve((answer ?? "").trim() || defaultValue)));
}
async function cmdOnboard() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(`
  pionex-ai-kit v${version}
`);
  process.stdout.write("  \u26A0\uFE0F  Security Tips: NEVER send API keys in agent chat. Create a dedicated API Key for your agent. Please test thoroughly before connecting to large real-money accounts.\n");
  process.stdout.write("  \u26A0\uFE0F  \u5B89\u5168\u63D0\u793A\uFF1A\u5207\u52FF\u5728 Agent \u5BF9\u8BDD\u4E2D\u53D1\u9001 API Key\u3002\u8BF7\u4E3A Agent \u521B\u5EFA\u4E13\u7528API Key\u63A5\u5165\uFF0C\u5148\u7528\u5C0F\u91D1\u989D\u5145\u5206\u9A8C\u8BC1\u540E\u518D\u63A5\u5165\u5B9E\u76D8\u3002\n\n");
  process.stdout.write("Pionex CLI \u2014 Configuration Wizard\n\n");
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
  rl.close();
  let config = { profiles: {} };
  try {
    config = readFullConfig();
  } catch {
    config = { profiles: {} };
  }
  if (!config.profiles) config.profiles = {};
  const profile = {
    api_key: apiKey,
    secret_key: secretKey,
    base_url: DEFAULT_BASE_URL
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
    "  Next: run 'pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor' or 'pionex-trade-mcp setup --client cursor' to register the MCP server.\n  You can replace 'cursor' with 'claude-desktop', 'windsurf', 'vscode', 'claude-code', 'claude' or 'openclaw' depending on which agent you want to configure.\n\n"
  );
}
function buildKitProgram() {
  const program = new Command("pionex-ai-kit").version(version, "-v, --version", "Print version number").description("Pionex CLI: configure credentials and set up MCP client integration");
  program.command("onboard").description("Interactive wizard to create ~/.pionex/config.toml (API key + secret)").action(() => {
    cmdOnboard().catch((e) => {
      process.stderr.write(String(e) + "\n");
      process.exit(1);
    });
  });
  program.command("setup").description(`Write MCP client config to register the Pionex MCP server
  Supported clients: ${[...SUPPORTED_CLIENTS, "claude (alias for claude-code)"].join(", ")}`).option("--mcp <server>", "MCP server to register (default: pionex-trade-mcp)").requiredOption("--client <client>", `AI client to configure (${SUPPORTED_CLIENTS.join("|")})`).action((opts) => {
    const targetMcp = opts.mcp ?? "pionex-trade-mcp";
    if (targetMcp !== "pionex-trade-mcp") {
      process.stderr.write(`Unsupported MCP server: ${targetMcp}. Currently only 'pionex-trade-mcp' is supported.
`);
      process.exit(1);
    }
    const normalizedClient = opts.client === "claude" ? "claude-code" : opts.client;
    if (!SUPPORTED_CLIENTS.includes(normalizedClient)) {
      process.stderr.write(
        `Unsupported client: ${opts.client}. Supported: ${[...SUPPORTED_CLIENTS, "claude (alias for claude-code)"].join(", ")}
`
      );
      process.exit(1);
    }
    runSetup({ client: normalizedClient });
  });
  return program;
}
export {
  buildKitProgram
};
<<<<<<<< HEAD:packages/cli/dist/kit-LUI2MN26.js
//# sourceMappingURL=kit-LUI2MN26.js.map
========
//# sourceMappingURL=kit-6KS3OFXY.js.map
>>>>>>>> main:packages/cli/dist/kit-6KS3OFXY.js
