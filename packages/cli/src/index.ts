#!/usr/bin/env node

import { createInterface } from "node:readline";
import { basename } from "node:path";
import {
  readFullConfig,
  writeFullConfig,
  configFilePath,
  runSetup,
  SUPPORTED_CLIENTS,
  type PionexTomlConfig,
  type PionexProfile,
  type ClientId,
  loadConfig,
  PionexRestClient,
  createToolRunner,
  toToolErrorPayload,
  parseAndValidateCreateFuturesGridBuOrderData,
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
      "  You can replace 'cursor' with 'claude-desktop', 'windsurf', 'vscode', 'claude-code', 'claude' or 'openclaw' depending on which agent you want to configure.\n\n",
  );
}

function printHelp(): void {
  process.stdout.write(`
Usage: pionex-ai-kit <command>

Commands:
  onboard        Interactive wizard to create ~/.pionex/config.toml (API key, secret)
  help           Show this help

The MCP server (pionex-trade-mcp) reads credentials from ~/.pionex/config.toml.
Use 'pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>' to write MCP client config
that runs 'npx @pionex/pionex-trade-mcp' (no keys are written to the client config).

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

  // Allow 'claude' as an alias for 'claude-code'
  const normalizedClient = client === "claude" ? "claude-code" : client;

  if (!SUPPORTED_CLIENTS.includes(normalizedClient as ClientId)) {
    process.stderr.write(
      `Unsupported client: ${client}. Supported: ${[...SUPPORTED_CLIENTS, "claude (alias for claude-code)"].join(
        ", ",
      )}\n`,
    );
    process.exit(1);
  }

  runSetup({ client: normalizedClient as ClientId });
}

type FlagValue = string | boolean;

function parseFlags(argv: string[]): { positionals: string[]; flags: Record<string, FlagValue> } {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positionals.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    if (eq !== -1) {
      const k = a.slice(2, eq);
      const v = a.slice(eq + 1);
      flags[k] = v === "true" ? true : v === "false" ? false : v;
      continue;
    }
    const k = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[k] = true;
      continue;
    }
    flags[k] = next;
    i++;
  }

  return { positionals, flags };
}

function printPionexHelp(): void {
  process.stdout.write(`
Usage: pionex-trade-cli <group> <command> [args] [--flags]

Groups:
  market   Market data (public)
  account  Account data (requires auth)
  orders   Spot orders (requires auth)
  bot      Bot commands (requires auth) — use sub-route futures_grid (more bot types may be added later)

Examples:
  pionex-trade-cli market depth BTC_USDT --limit 5
  pionex-trade-cli market tickers --symbol BTC_USDT
  pionex-trade-cli market symbols --symbols BTC_USDT
  pionex-trade-cli account balance
  pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 10
  pionex-trade-cli orders cancel --symbol BTC_USDT --order-id 123
  pionex-trade-cli bot futures_grid get --bu-order-id <id>
  pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"110000","bottom":"90000","row":100,"grid_type":"arithmetic","trend":"long","leverage":5,"quoteInvestment":"100"}'

Global flags:
  --profile <name>     Profile in ~/.pionex/config.toml
  --modules <list>     Comma-separated modules (market,account,orders or all)
  --base-url <url>     Override API base URL
  --read-only          Disable write operations (orders new/cancel)
  --dry-run            Print resolved futures-grid create body without executing (bot futures_grid create only)

Futures grid create (pionex-trade-cli bot futures_grid create) — strict OpenAPI (same validation as MCP):
  --base               Required; normalized to <BASE>.PERP if suffix missing
  --quote              Required (e.g. USDT)
  --bu-order-data-json Required JSON object — ONLY keys from CreateFuturesGridOrderData in openapi_bot.yaml
  Optional: --copy-from, --copy-type, --copy-bot-order-id
  buOrderData required: top, bottom, row, grid_type, trend, leverage, quoteInvestment
  buOrderData optional (names only): extraMargin, condition, conditionDirection, lossStopType, lossStop,
    lossStopDelay, profitStopType, profitStop, profitStopDelay, lossStopHigh, shareRatio, investCoin,
    investmentFrom, uiInvestCoin, lossStopLimitPrice, lossStopLimitHighPrice, profitStopLimitPrice,
    slippage, bonusId, uiExtraData, movingIndicatorType, movingIndicatorInterval, movingIndicatorParam,
    movingTrailingUpParam, cateType, movingTop, movingBottom, enableFollowClosed
  Unknown keys → error
  YAML: https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml
  Docs: https://www.pionex.com/docs/api-docs/bot-api/futures-grid
`);
}

function parseJsonFlag(raw: unknown, flagName: string): Record<string, unknown> {
  if (typeof raw !== "string") {
    throw new Error(`Missing required flag: --${flagName}`);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid --${flagName}: ${msg}`);
  }
}

async function runPionexCommand(argv: string[]): Promise<void> {
  const { positionals, flags } = parseFlags(argv);
  const group = positionals[0];
  /** For \`bot\` group, positionals are: bot <sub-route> <command> ... */
  const command = group === "bot" ? positionals[2] : positionals[1];

  if (!group || group === "help" || group === "--help" || group === "-h") {
    printPionexHelp();
    return;
  }

  const config = loadConfig({
    profile: typeof flags.profile === "string" ? flags.profile : undefined,
    modules: typeof flags.modules === "string" ? flags.modules : undefined,
    baseUrl: typeof flags["base-url"] === "string" ? (flags["base-url"] as string) : typeof flags.baseUrl === "string" ? (flags.baseUrl as string) : undefined,
    readOnly: Boolean(flags["read-only"] || flags.readOnly),
  });

  const client = new PionexRestClient(config);
  const runTool = createToolRunner(client, config);

  const dryRun = Boolean(flags["dry-run"] || flags.dryRun);

  // market
  if (group === "market") {
    if (command === "depth") {
      const symbol = positionals[2];
      if (!symbol) throw new Error("Missing symbol. Example: pionex-trade-cli market depth BTC_USDT");
      const limit = flags.limit != null ? Number(flags.limit) : undefined;
      const out = await runTool("pionex_market_get_depth", { symbol, limit });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "trades") {
      const symbol = positionals[2];
      if (!symbol) throw new Error("Missing symbol. Example: pionex-trade-cli market trades BTC_USDT");
      const limit = flags.limit != null ? Number(flags.limit) : undefined;
      const out = await runTool("pionex_market_get_trades", { symbol, limit });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "symbols") {
      const symbols = typeof flags.symbols === "string" ? flags.symbols : undefined;
      const type = typeof flags.type === "string" ? flags.type : undefined;
      const out = await runTool("pionex_market_get_symbol_info", { symbols, type });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "tickers") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const type = typeof flags.type === "string" ? flags.type : undefined;
      const out = await runTool("pionex_market_get_tickers", { symbol, type });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "klines") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : positionals[2];
      const interval = typeof flags.interval === "string" ? flags.interval : positionals[3];
      if (!symbol || !interval) throw new Error("Missing symbol/interval. Example: pionex-trade-cli market klines BTC_USDT 60M");
      const endTime = flags.endTime != null ? Number(flags.endTime) : undefined;
      const limit = flags.limit != null ? Number(flags.limit) : undefined;
      const out = await runTool("pionex_market_get_klines", { symbol, interval, endTime, limit });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    throw new Error(`Unknown market command: ${command}`);
  }

  // account
  if (group === "account") {
    if (command === "balance") {
      const out = await runTool("pionex_account_get_balance", {});
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    throw new Error(`Unknown account command: ${command}`);
  }

  // orders
  if (group === "orders") {
    if (command === "new") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const side = typeof flags.side === "string" ? flags.side : undefined;
      const type = typeof flags.type === "string" ? flags.type : undefined;
      const clientOrderId = typeof flags["client-order-id"] === "string" ? (flags["client-order-id"] as string) : typeof flags.clientOrderId === "string" ? (flags.clientOrderId as string) : undefined;
      const size = typeof flags.size === "string" ? flags.size : undefined;
      const price = typeof flags.price === "string" ? flags.price : undefined;
      const amount = typeof flags.amount === "string" ? flags.amount : undefined;
      const IOC = typeof flags.IOC === "boolean" ? flags.IOC : undefined;
      if (!symbol || !side || !type) throw new Error("Missing required flags: --symbol --side --type");
      const payload = { symbol, side, type, clientOrderId, size, price, amount, IOC };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_orders_new_order", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_orders_new_order", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "get") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const orderId = flags["order-id"] != null ? Number(flags["order-id"]) : undefined;
      if (!symbol || orderId == null) throw new Error("Missing required flags: --symbol --order-id");
      const out = await runTool("pionex_orders_get_order", { symbol, orderId });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "open") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      if (!symbol) throw new Error("Missing required flag: --symbol");
      const out = await runTool("pionex_orders_get_open_orders", { symbol });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "all") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const limit = flags.limit != null ? Number(flags.limit) : undefined;
      if (!symbol) throw new Error("Missing required flag: --symbol");
      const out = await runTool("pionex_orders_get_all_orders", { symbol, limit });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "fills") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const startTime = flags.startTime != null ? Number(flags.startTime) : undefined;
      const endTime = flags.endTime != null ? Number(flags.endTime) : undefined;
      if (!symbol) throw new Error("Missing required flag: --symbol");
      const out = await runTool("pionex_orders_get_fills", { symbol, startTime, endTime });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "cancel") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const orderId = flags["order-id"] != null ? Number(flags["order-id"]) : undefined;
      if (!symbol || orderId == null) throw new Error("Missing required flags: --symbol --order-id");
      const payload = { symbol, orderId };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_orders_cancel_order", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_orders_cancel_order", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "cancel-all") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      if (!symbol) throw new Error("Missing required flag: --symbol");
      const payload = { symbol };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_orders_cancel_all_orders", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_orders_cancel_all_orders", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    throw new Error(`Unknown orders command: ${command}`);
  }

  // bot
  if (group === "bot") {
    const botRoute = positionals[1];
    if (!botRoute || botRoute !== "futures_grid") {
      throw new Error(
        `Missing or unknown bot route: ${botRoute ?? "(none)"}. Use: pionex-trade-cli bot futures_grid <get|create|adjust_params|reduce|cancel> ...`
      );
    }
    if (!command) {
      throw new Error(
        "Missing bot command. Example: pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{...}'"
      );
    }
    if (command === "get") {
      const buOrderId =
        typeof flags["bu-order-id"] === "string"
          ? (flags["bu-order-id"] as string)
          : typeof flags.buOrderId === "string"
            ? (flags.buOrderId as string)
            : undefined;
      const lang = typeof flags.lang === "string" ? flags.lang : undefined;
      if (!buOrderId) throw new Error("Missing required flag: --bu-order-id");
      const out = await runTool("pionex_bot_futures_grid_get_order", { buOrderId, lang });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "create") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      const copyFrom = typeof flags["copy-from"] === "string" ? (flags["copy-from"] as string) : typeof flags.copyFrom === "string" ? (flags.copyFrom as string) : undefined;
      const copyType = typeof flags["copy-type"] === "string" ? (flags["copy-type"] as string) : typeof flags.copyType === "string" ? (flags.copyType as string) : undefined;
      const copyBotOrderId =
        typeof flags["copy-bot-order-id"] === "string"
          ? (flags["copy-bot-order-id"] as string)
          : typeof flags.copyBotOrderId === "string"
            ? (flags.copyBotOrderId as string)
            : undefined;
      const buOrderDataRaw = parseJsonFlag(flags["bu-order-data-json"] ?? flags.buOrderDataJson, "bu-order-data-json");
      if (!base || !quote) {
        throw new Error("Missing required flags: --base --quote --bu-order-data-json");
      }
      const buOrderData = parseAndValidateCreateFuturesGridBuOrderData(buOrderDataRaw);
      const payload: Record<string, unknown> = { base, quote, copyFrom, copyType, copyBotOrderId, buOrderData };
      if (dryRun) {
        const out = await runTool("pionex_bot_futures_grid_create", { ...payload, __dryRun: true });
        process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_bot_futures_grid_create", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "adjust_params") {
      const payload = parseJsonFlag(flags["body-json"] ?? flags.bodyJson, "body-json");
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_bot_futures_grid_adjust_params", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_bot_futures_grid_adjust_params", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "reduce") {
      const payload = parseJsonFlag(flags["body-json"] ?? flags.bodyJson, "body-json");
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_bot_futures_grid_reduce", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_bot_futures_grid_reduce", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    if (command === "cancel") {
      const buOrderId =
        typeof flags["bu-order-id"] === "string"
          ? (flags["bu-order-id"] as string)
          : typeof flags.buOrderId === "string"
            ? (flags.buOrderId as string)
            : undefined;
      const closeNote = typeof flags["close-note"] === "string" ? (flags["close-note"] as string) : typeof flags.closeNote === "string" ? (flags.closeNote as string) : undefined;
      const closeSellModel =
        typeof flags["close-sell-model"] === "string"
          ? (flags["close-sell-model"] as string)
          : typeof flags.closeSellModel === "string"
            ? (flags.closeSellModel as string)
            : undefined;
      const immediate = typeof flags.immediate === "boolean" ? flags.immediate : undefined;
      const closeSlippage =
        typeof flags["close-slippage"] === "string"
          ? (flags["close-slippage"] as string)
          : typeof flags.closeSlippage === "string"
            ? (flags.closeSlippage as string)
            : undefined;
      if (!buOrderId) throw new Error("Missing required flag: --bu-order-id");
      const payload = { buOrderId, closeNote, closeSellModel, immediate, closeSlippage };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_bot_futures_grid_cancel", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_bot_futures_grid_cancel", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }
    throw new Error(`Unknown futures_grid command: ${command}`);
  }

  throw new Error(`Unknown group: ${group}`);
}

function main(): void {
  const invokedAs = basename(process.argv[1] || "");
  const cmd = process.argv[2];

  // Backwards-compatible: keep "pionex-ai-kit onboard/setup/help"
  if (invokedAs.includes("pionex-ai-kit")) {
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
    return;
  }

  // New: "pionex-trade-cli <group> <command> ..."
  runPionexCommand(process.argv.slice(2)).catch((e) => {
    const payload = toToolErrorPayload(e);
    process.stderr.write(JSON.stringify(payload, null, 2) + "\n");
    process.exit(1);
  });
}

main();
