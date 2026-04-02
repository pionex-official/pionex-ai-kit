#!/usr/bin/env node

import { createInterface } from "node:readline";
import { basename } from "node:path";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
const { version } = _require("../package.json") as { version: string };
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

  process.stdout.write(`\n  pionex-ai-kit v${version}\n`);
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
  earn     Dual Investment (requires auth for most commands) — use sub-route dual

Examples:
  pionex-trade-cli market depth BTC_USDT --limit 5
  pionex-trade-cli market tickers --symbol BTC_USDT
  pionex-trade-cli market book-tickers --symbol BTC_USDT
  pionex-trade-cli market symbols --symbols BTC_USDT
  pionex-trade-cli account balance
  pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 10
  pionex-trade-cli orders cancel --symbol BTC_USDT --order-id 123
  pionex-trade-cli orders fills-by-order-id --symbol BTC_USDT --order-id 123
  pionex-trade-cli bot order_list [--status running|canceled] [--base BTC] [--quote USDT] [--page-token <token>] [--bu-order-types futures_grid,spot_grid,smart_copy]
  pionex-trade-cli bot futures_grid get --bu-order-id <id>
  pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"110000","bottom":"90000","row":100,"grid_type":"arithmetic","trend":"long","leverage":5,"quoteInvestment":"100"}'
  pionex-trade-cli earn dual symbols --base BTC
  pionex-trade-cli earn dual open-products --base BTC --quote USDXO --type DUAL_BASE --currency USDT
  pionex-trade-cli earn dual prices --base BTC --quote USDXO --product-ids BTC-USDXO-260402-68000-P-USDT
  pionex-trade-cli earn dual invest --base BTC --product-id BTC-USDXO-260402-68000-P-USDT --currency-amount 100 --profit 0.0039
  pionex-trade-cli earn dual revoke-invest --base BTC --client-dual-id my-order-001 --dry-run
  pionex-trade-cli earn dual collect --base BTC --client-dual-id my-order-001 --dry-run

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
  const firstArg = argv[0];
  if (firstArg === "-v" || firstArg === "--version") {
    process.stdout.write(version + "\n");
    return;
  }

  const { positionals, flags } = parseFlags(argv);
  const group = positionals[0];
  /** For \`bot\` and \`earn\` groups, positionals are: <group> <sub-route> <command> ... */
  const command = (group === "bot" || group === "earn") ? positionals[2] : positionals[1];

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
    if (command === "book-tickers" || command === "bookTickers") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const type = typeof flags.type === "string" ? flags.type : undefined;
      const out = await runTool("pionex_market_get_book_tickers", { symbol, type });
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
    if (command === "fills-by-order-id" || command === "fillsByOrderId") {
      const symbol = typeof flags.symbol === "string" ? flags.symbol : undefined;
      const orderId = flags["order-id"] != null ? Number(flags["order-id"]) : undefined;
      if (!symbol || orderId == null) throw new Error("Missing required flags: --symbol --order-id");
      const out = await runTool("pionex_orders_get_fills_by_order_id", { symbol, orderId });
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

    // bot order_list — top-level bot command (not under a sub-route)
    if (botRoute === "order_list") {
      const status = typeof flags.status === "string" ? flags.status : undefined;
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      const pageToken =
        typeof flags["page-token"] === "string"
          ? (flags["page-token"] as string)
          : typeof flags.pageToken === "string"
            ? (flags.pageToken as string)
            : undefined;
      const buOrderTypesRaw =
        typeof flags["bu-order-types"] === "string"
          ? (flags["bu-order-types"] as string)
          : typeof flags.buOrderTypes === "string"
            ? (flags.buOrderTypes as string)
            : undefined;
      const buOrderTypes = buOrderTypesRaw
        ? buOrderTypesRaw.split(",").map((s) => s.trim())
        : undefined;
      const out = await runTool("pionex_bot_order_list", {
        status,
        base,
        quote,
        pageToken,
        buOrderTypes,
      });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (!botRoute || botRoute !== "futures_grid") {
      throw new Error(
        `Missing or unknown bot route: ${botRoute ?? "(none)"}. Use: pionex-trade-cli bot order_list [...] or bot futures_grid <get|create|adjust_params|reduce|cancel> ...`
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
    throw new Error(`Unknown futures_grid command: ${command}. Available: get, create, adjust_params, reduce, cancel`);
  }

  // earn
  if (group === "earn") {
    const earnRoute = positionals[1];
    if (!earnRoute || earnRoute !== "dual") {
      throw new Error(
        `Missing or unknown earn route: ${earnRoute ?? "(none)"}. Use: pionex-trade-cli earn dual <command>\n` +
          `Commands: symbols, open-products, prices, index, delivery-prices, balances, get-invests, records, invest, revoke-invest, collect`,
      );
    }
    if (!command || command === "help" || flags.help === true || flags.h === true) {
      process.stdout.write(`
Usage: pionex-trade-cli earn dual <command> [--flags]

Public commands (no API key required):
  symbols            List supported trading pairs [--base BTC]
  open-products      List open products --base BTC --quote USDXO --type DUAL_BASE|DUAL_CURRENCY [--currency USDT]
                     (BTC/ETH: --quote USDXO; others: --quote USDT)
                     Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY} (C=DUAL_BASE, P=DUAL_CURRENCY)
  prices             Get yield rates --base BTC --quote USDXO --product-ids id1,id2
                     (All three flags required. Always call before invest — profit value must be passed unchanged.)
  index              Get index price --base BTC --quote USDXO
  delivery-prices    Get delivery prices --base BTC [--quote USDXO] [--start-time ms] [--end-time ms]

Auth commands (View permission):
  balances           Get Dual Investment balances [--merge]
  records            Get investment history --base BTC --end-time ms [--quote USDT] [--limit 20] [--start-time ms]
  get-invests        Batch query orders [--base BTC] --client-dual-ids id1,id2

Auth commands (Earn permission, write):
  invest             Create investment --base BTC --product-id <id> (--base-amount N | --currency-amount N) --profit N [--client-dual-id id] [--dry-run]
  revoke-invest      Revoke pending order --base BTC --product-id <id> --client-dual-id <id> [--dry-run]
  collect            Collect settled earnings --base BTC --client-dual-id <id> --product-id <id> [--dry-run]

Note: For BTC/ETH: --quote USDXO --currency USDT|USDC. For other bases: --quote USDT --currency USDT.
`);
      return;
    }

    if (command === "symbols") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const out = await runTool("pionex_earn_dual_symbols", { base });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "open-products" || command === "openProducts") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      const type = typeof flags.type === "string" ? flags.type : undefined;
      const currency = typeof flags.currency === "string" ? flags.currency : undefined;
      if (!base || !quote || !type) throw new Error("Missing required flags: --base --quote --type (DUAL_BASE|DUAL_CURRENCY)");
      const out = await runTool("pionex_earn_dual_open_products", { base, quote, type, currency });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "prices") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      const productIdsRaw = typeof flags["product-ids"] === "string" ? (flags["product-ids"] as string) : typeof flags.productIds === "string" ? (flags.productIds as string) : undefined;
      const productIds = productIdsRaw ? productIdsRaw.split(",").map((s) => s.trim()) : undefined;
      if (!base || !quote || !productIds || productIds.length === 0) throw new Error("Missing required flags: --base --quote --product-ids id1,id2");
      const out = await runTool("pionex_earn_dual_prices", { base, quote, productIds });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "index") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      if (!base || !quote) throw new Error("Missing required flags: --base --quote");
      const out = await runTool("pionex_earn_dual_index", { base, quote });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "delivery-prices" || command === "deliveryPrices") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      if (!base) throw new Error("Missing required flag: --base");
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      const startTime = flags["start-time"] != null ? Number(flags["start-time"]) : flags.startTime != null ? Number(flags.startTime) : undefined;
      const endTime = flags["end-time"] != null ? Number(flags["end-time"]) : flags.endTime != null ? Number(flags.endTime) : undefined;
      const out = await runTool("pionex_earn_dual_delivery_prices", { base, quote, startTime, endTime });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "balances") {
      const merge = typeof flags.merge === "boolean" ? flags.merge : undefined;
      const out = await runTool("pionex_earn_dual_balances", { merge });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "get-invests" || command === "getInvests") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const clientDualIdsRaw = typeof flags["client-dual-ids"] === "string" ? (flags["client-dual-ids"] as string) : typeof flags.clientDualIds === "string" ? (flags.clientDualIds as string) : undefined;
      const clientDualIds = clientDualIdsRaw ? clientDualIdsRaw.split(",").map((s) => s.trim()) : undefined;
      const out = await runTool("pionex_earn_dual_get_invests", { base, clientDualIds });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "records") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const endTime = flags["end-time"] != null ? Number(flags["end-time"]) : flags.endTime != null ? Number(flags.endTime) : undefined;
      if (!base || endTime == null) throw new Error("Missing required flags: --base --end-time <ms>");
      const quote = typeof flags.quote === "string" ? flags.quote : undefined;
      const currency = typeof flags.currency === "string" ? flags.currency : undefined;
      const filter = typeof flags.filter === "string" ? flags.filter : undefined;
      const startTime = flags["start-time"] != null ? Number(flags["start-time"]) : flags.startTime != null ? Number(flags.startTime) : undefined;
      const limit = flags.limit != null ? Number(flags.limit) : undefined;
      const out = await runTool("pionex_earn_dual_records", { base, quote, currency, filter, startTime, endTime, limit });
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "invest") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      if (!base) throw new Error("Missing required flag: --base");
      const productId = typeof flags["product-id"] === "string" ? (flags["product-id"] as string) : typeof flags.productId === "string" ? (flags.productId as string) : undefined;
      const clientDualId = typeof flags["client-dual-id"] === "string" ? (flags["client-dual-id"] as string) : typeof flags.clientDualId === "string" ? (flags.clientDualId as string) : undefined;
      const baseAmount = typeof flags["base-amount"] === "string" ? (flags["base-amount"] as string) : typeof flags.baseAmount === "string" ? (flags.baseAmount as string) : undefined;
      const currencyAmount = typeof flags["currency-amount"] === "string" ? (flags["currency-amount"] as string) : typeof flags.currencyAmount === "string" ? (flags.currencyAmount as string) : undefined;
      const profit = typeof flags.profit === "string" ? flags.profit : undefined;
      const payload = { base, productId, clientDualId, baseAmount, currencyAmount, profit };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_earn_dual_invest", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_earn_dual_invest", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "revoke-invest" || command === "revokeInvest") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const clientDualId = typeof flags["client-dual-id"] === "string" ? (flags["client-dual-id"] as string) : typeof flags.clientDualId === "string" ? (flags.clientDualId as string) : undefined;
      const productId = typeof flags["product-id"] === "string" ? (flags["product-id"] as string) : typeof flags.productId === "string" ? (flags.productId as string) : undefined;
      if (!base || !clientDualId || !productId) throw new Error("Missing required flags: --base --client-dual-id --product-id");
      const payload = { base, clientDualId, productId };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_earn_dual_revoke_invest", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_earn_dual_revoke_invest", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    if (command === "collect") {
      const base = typeof flags.base === "string" ? flags.base : undefined;
      const clientDualId = typeof flags["client-dual-id"] === "string" ? (flags["client-dual-id"] as string) : typeof flags.clientDualId === "string" ? (flags.clientDualId as string) : undefined;
      const productId = typeof flags["product-id"] === "string" ? (flags["product-id"] as string) : typeof flags.productId === "string" ? (flags.productId as string) : undefined;
      if (!base || !clientDualId || !productId) throw new Error("Missing required flags: --base --client-dual-id --product-id");
      const payload = { base, clientDualId, productId };
      if (dryRun) {
        process.stdout.write(JSON.stringify({ tool: "pionex_earn_dual_collect", args: payload }, null, 2) + "\n");
        return;
      }
      const out = await runTool("pionex_earn_dual_collect", payload);
      process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
      return;
    }

    throw new Error(`Unknown earn dual command: ${command}`);
  }

  throw new Error(`Unknown group: ${group}`);
}

function main(): void {
  const invokedAs = basename(process.argv[1] || "");
  const cmd = process.argv[2];

  // Backwards-compatible: keep "pionex-ai-kit onboard/setup/help"
  if (invokedAs.includes("pionex-ai-kit")) {
    if (cmd === "-v" || cmd === "--version") {
      process.stdout.write(version + "\n");
      return;
    }
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
