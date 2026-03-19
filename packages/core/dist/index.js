// src/config/toml.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { parse, stringify } from "smol-toml";
function configFilePath() {
  return join(homedir(), ".pionex", "config.toml");
}
function readFullConfig() {
  const path2 = configFilePath();
  if (!existsSync(path2)) return { profiles: {} };
  const raw = readFileSync(path2, "utf-8");
  return parse(raw);
}
function readTomlProfile(profileName) {
  const config = readFullConfig();
  const name = profileName ?? config.default_profile ?? "default";
  return config.profiles?.[name] ?? {};
}
function writeFullConfig(config) {
  const path2 = configFilePath();
  const dir = dirname(path2);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path2, stringify(config), "utf-8");
}

// src/setup.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
var CLIENT_NAMES = {
  "claude-desktop": "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  vscode: "VS Code",
  "claude-code": "Claude Code CLI",
  openclaw: "OpenClaw (mcporter)"
};
var SUPPORTED_CLIENTS = Object.keys(CLIENT_NAMES);
function appData() {
  return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
}
var CLAUDE_CONFIG_FILE = "claude_desktop_config.json";
function findMsStoreClaudePath() {
  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  const packagesDir = path.join(localAppData, "Packages");
  try {
    const entries = fs.readdirSync(packagesDir);
    const claudePkg = entries.find((e) => e.startsWith("Claude_"));
    if (claudePkg) {
      const configPath = path.join(
        packagesDir,
        claudePkg,
        "LocalCache",
        "Roaming",
        "Claude",
        CLAUDE_CONFIG_FILE
      );
      if (fs.existsSync(configPath) || fs.existsSync(path.dirname(configPath))) {
        return configPath;
      }
    }
  } catch {
  }
  return null;
}
function getConfigPath(client) {
  const home = os.homedir();
  const platform = process.platform;
  switch (client) {
    case "claude-desktop":
      if (platform === "win32") {
        return findMsStoreClaudePath() ?? path.join(appData(), "Claude", CLAUDE_CONFIG_FILE);
      }
      if (platform === "darwin") {
        return path.join(home, "Library", "Application Support", "Claude", CLAUDE_CONFIG_FILE);
      }
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "Claude", CLAUDE_CONFIG_FILE);
    case "cursor":
      return path.join(home, ".cursor", "mcp.json");
    case "windsurf":
      return path.join(home, ".codeium", "windsurf", "mcp_config.json");
    case "vscode":
      return path.join(process.cwd(), ".mcp.json");
    case "claude-code":
      return null;
    case "openclaw":
      return path.join(home, ".openclaw", "workspace", "config", "mcporter.json");
  }
}
var NPX_PACKAGE = "@pionex/pionex-trade-mcp";
function buildEntry(client) {
  if (client === "vscode") {
    return { type: "stdio", command: "npx", args: ["-y", NPX_PACKAGE] };
  }
  return { command: "npx", args: ["-y", NPX_PACKAGE] };
}
function mergeJsonConfig(configPath, serverName, entry) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let data = {};
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse existing config at ${configPath}`);
    }
  }
  if (typeof data.mcpServers !== "object" || data.mcpServers === null) {
    data.mcpServers = {};
  }
  data.mcpServers[serverName] = entry;
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
function runSetup(options) {
  const { client } = options;
  const name = CLIENT_NAMES[client];
  const serverName = "pionex-trade-mcp";
  if (client === "claude-code") {
    const claudeArgs = [
      "mcp",
      "add",
      "--scope",
      "user",
      "--transport",
      "stdio",
      serverName,
      "--",
      "npx",
      "-y",
      NPX_PACKAGE
    ];
    process.stdout.write(`Running: claude ${claudeArgs.join(" ")}
`);
    execFileSync("claude", claudeArgs, { stdio: "inherit" });
    process.stdout.write(`\u2713 Configured ${name}
`);
    return;
  }
  const configPath = getConfigPath(client);
  if (!configPath) {
    throw new Error(`${name} is not supported on this platform`);
  }
  const entry = buildEntry(client);
  mergeJsonConfig(configPath, serverName, entry);
  process.stdout.write(
    `\u2713 Configured ${name}
  ${configPath}
  Restart ${name} to apply changes.
`
  );
}
function printSetupUsage() {
  process.stdout.write(
    `Usage: pionex-trade-mcp setup --client <client>

Clients:
` + SUPPORTED_CLIENTS.map((id) => `  ${id.padEnd(16)} ${CLIENT_NAMES[id]}`).join("\n") + `

Credentials are read from ${configFilePath()}. Run "pionex-ai-kit config init" (from pionex-ai-kit) first.
`
  );
}

// src/constants.ts
var PIONEX_API_DEFAULT_BASE_URL = "https://api.pionex.com";
var MODULES = ["market", "account", "orders"];
var DEFAULT_MODULES = ["market", "account", "orders"];

// src/utils/errors.ts
var ConfigError = class extends Error {
  suggestion;
  constructor(message, suggestion) {
    super(message);
    this.name = "ConfigError";
    this.suggestion = suggestion;
  }
};
var PionexApiError = class extends Error {
  status;
  endpoint;
  responseText;
  constructor(message, opts) {
    super(message);
    this.name = "PionexApiError";
    this.status = opts?.status;
    this.endpoint = opts?.endpoint;
    this.responseText = opts?.responseText;
  }
};
function toToolErrorPayload(error) {
  if (error instanceof ConfigError) {
    return {
      error: true,
      type: "ConfigError",
      message: error.message,
      suggestion: error.suggestion
    };
  }
  if (error instanceof PionexApiError) {
    return {
      error: true,
      type: "PionexApiError",
      message: error.message,
      status: error.status,
      endpoint: error.endpoint,
      responseText: error.responseText
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: true, type: "Error", message };
}

// src/config.ts
function parseModuleList(rawModules) {
  if (!rawModules || rawModules.trim().length === 0) return [...DEFAULT_MODULES];
  const trimmed = rawModules.trim().toLowerCase();
  if (trimmed === "all") return [...MODULES];
  const requested = trimmed.split(",").map((x) => x.trim()).filter(Boolean);
  if (requested.length === 0) return [...DEFAULT_MODULES];
  const out = [];
  for (const m of requested) {
    if (!MODULES.includes(m)) {
      throw new ConfigError(`Unknown module "${m}".`, `Use one of: ${MODULES.join(", ")} or "all".`);
    }
    out.push(m);
  }
  return Array.from(new Set(out));
}
function loadConfig(cli) {
  const toml = readTomlProfile(cli.profile);
  const apiKey = process.env.PIONEX_API_KEY?.trim() || toml.api_key;
  const apiSecret = process.env.PIONEX_API_SECRET?.trim() || toml.secret_key;
  const hasAuth = Boolean(apiKey && apiSecret);
  const partialAuth = Boolean(apiKey) || Boolean(apiSecret);
  if (partialAuth && !hasAuth) {
    throw new ConfigError(
      "Partial Pionex API credentials detected.",
      "Set both PIONEX_API_KEY and PIONEX_API_SECRET (env vars or config.toml profile)."
    );
  }
  const baseUrl = (cli.baseUrl?.trim() || process.env.PIONEX_BASE_URL?.trim() || toml.base_url || PIONEX_API_DEFAULT_BASE_URL).replace(/\/+$/, "");
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    throw new ConfigError(`Invalid base URL "${baseUrl}".`, "PIONEX_BASE_URL must start with http:// or https://");
  }
  return {
    apiKey,
    apiSecret,
    hasAuth,
    baseUrl,
    modules: parseModuleList(cli.modules),
    readOnly: cli.readOnly
  };
}

// src/client/rest-client.ts
import crypto from "crypto";
function requireAuth(config) {
  if (!config.apiKey || !config.apiSecret) {
    throw new ConfigError(
      "This operation requires authentication, but no Pionex API credentials were found.",
      "Run 'pionex-ai-kit onboard' to create ~/.pionex/config.toml, or set PIONEX_API_KEY and PIONEX_API_SECRET."
    );
  }
  return { apiKey: config.apiKey, apiSecret: config.apiSecret };
}
function buildQueryString(query) {
  if (!query) return "";
  const entries = Object.entries(query).filter(([, v]) => v !== void 0 && v !== null);
  if (entries.length === 0) return "";
  const params = new URLSearchParams();
  for (const [k, v] of entries) params.set(k, String(v));
  return params.toString();
}
function buildSignedRequest(config, method, path2, query, bodyJson) {
  const { apiKey, apiSecret } = requireAuth(config);
  const timestamp = Date.now().toString();
  const params = { ...query, timestamp };
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const pathUrl = `${path2}?${queryString}`;
  let payload = `${method}${pathUrl}`;
  if (bodyJson != null) payload += bodyJson;
  const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");
  const url = `${config.baseUrl}${pathUrl}`;
  const headers = {
    "PIONEX-KEY": apiKey,
    "PIONEX-SIGNATURE": signature,
    "Content-Type": "application/json"
  };
  return { url, headers, bodyJson };
}
async function readTextSafe(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
var PionexRestClient = class {
  config;
  constructor(config) {
    this.config = config;
  }
  async publicGet(path2, query = {}) {
    const qs = buildQueryString(query);
    const endpoint = qs ? `${path2}?${qs}` : path2;
    const url = `${this.config.baseUrl}${endpoint}`;
    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint, responseText: txt });
    }
    const data = await res.json();
    return { endpoint, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
  async signedGet(path2, query = {}) {
    const { url, headers } = buildSignedRequest(this.config, "GET", path2, query, null);
    const endpoint = `${path2}?${buildQueryString({ ...query, timestamp: "..." })}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path2, responseText: txt });
    }
    const data = await res.json();
    return { endpoint: path2, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
  async signedPost(path2, body) {
    const bodyJson = JSON.stringify(body);
    const { url, headers, bodyJson: bj } = buildSignedRequest(this.config, "POST", path2, {}, bodyJson);
    const res = await fetch(url, { method: "POST", headers, body: bj ?? void 0 });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path2, responseText: txt });
    }
    const data = await res.json();
    return { endpoint: path2, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
  async signedDelete(path2, body) {
    const bodyJson = JSON.stringify(body);
    const { url, headers, bodyJson: bj } = buildSignedRequest(this.config, "DELETE", path2, {}, bodyJson);
    const res = await fetch(url, { method: "DELETE", headers, body: bj ?? void 0 });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path2, responseText: txt });
    }
    const data = await res.json();
    return { endpoint: path2, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  }
};

// src/tools/market.ts
function registerMarketTools() {
  return [
    {
      name: "pionex_market_get_depth",
      module: "market",
      isWrite: false,
      description: "Get order book depth (bids and asks) for a symbol. Use for spread, liquidity, or best bid/ask.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Price levels (1-100), default 5" }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const limit = args.limit == null ? void 0 : Number(args.limit);
        const q = { symbol };
        if (limit != null && Number.isFinite(limit)) q.limit = limit;
        return (await client.publicGet("/api/v1/market/depth", q)).data;
      }
    },
    {
      name: "pionex_market_get_trades",
      module: "market",
      isWrite: false,
      description: "Get recent trades for a symbol. Use for latest price and volume.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Default 5 (1-100)" }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const limit = args.limit == null ? void 0 : Number(args.limit);
        const q = { symbol };
        if (limit != null && Number.isFinite(limit)) q.limit = limit;
        return (await client.publicGet("/api/v1/market/trades", q)).data;
      }
    },
    {
      name: "pionex_market_get_symbol_info",
      module: "market",
      isWrite: false,
      description: "Get symbol metadata (precision, min size, price limits). Call before placing orders to avoid amount/size filter errors.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbols: {
            type: "string",
            description: 'Optional. One or more symbols, comma-separated, e.g. "BTC_USDT" or "BTC_USDT,ADA_USDT".'
          },
          type: {
            type: "string",
            enum: ["SPOT", "PERP"],
            description: "Optional. If no symbols are specified, filter by type (default SPOT)."
          }
        }
      },
      async handler(args, { client }) {
        const q = {};
        if (args.symbols) q.symbols = String(args.symbols);
        if (!args.symbols && args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/common/symbols", q)).data;
      }
    },
    {
      name: "pionex_market_get_tickers",
      module: "market",
      isWrite: false,
      description: "Get 24-hour ticker(s): open, close, high, low, volume, amount, count. Optional symbol or type (SPOT/PERP).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT; if omitted, returns all tickers filtered by type" },
          type: { type: "string", enum: ["SPOT", "PERP"], description: "If symbol is not specified, filter by type." }
        }
      },
      async handler(args, { client }) {
        const q = {};
        if (args.symbol) q.symbol = String(args.symbol);
        if (args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/market/tickers", q)).data;
      }
    },
    {
      name: "pionex_market_get_klines",
      module: "market",
      isWrite: false,
      description: "Get OHLCV klines (candlestick) for a symbol. Use for charts or historical price/volume.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          interval: { type: "string", enum: ["1M", "5M", "15M", "30M", "60M", "4H", "8H", "12H", "1D"], description: "Kline interval." },
          endTime: { type: "integer", description: "End time in milliseconds." },
          limit: { type: "integer", description: "Default 100 (1-500)." }
        },
        required: ["symbol", "interval"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const interval = String(args.interval);
        const q = { symbol, interval };
        if (args.endTime != null) q.endTime = Number(args.endTime);
        if (args.limit != null) q.limit = Number(args.limit);
        return (await client.publicGet("/api/v1/market/klines", q)).data;
      }
    }
  ];
}

// src/tools/account.ts
function registerAccountTools() {
  return [
    {
      name: "pionex_account_get_balance",
      module: "account",
      isWrite: false,
      description: "Query spot account balances for all currencies. Requires API key and secret in ~/.pionex/config.toml or env.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      async handler(_args, { client }) {
        return (await client.signedGet("/api/v1/account/balances")).data;
      }
    }
  ];
}

// src/tools/orders.ts
function registerOrdersTools() {
  return [
    {
      name: "pionex_orders_new_order",
      module: "orders",
      isWrite: true,
      description: "Create a spot order on Pionex. LIMIT requires symbol/side/type=LIMIT/price/size. MARKET BUY requires amount (quote). MARKET SELL requires size (base).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          side: { type: "string", enum: ["BUY", "SELL"] },
          type: { type: "string", enum: ["LIMIT", "MARKET"] },
          clientOrderId: { type: "string", description: "Optional client order id (max 64 chars)" },
          size: { type: "string", description: "Quantity; required for limit and market sell" },
          price: { type: "string", description: "Required for limit order" },
          amount: { type: "string", description: "Quote amount; required for market buy" },
          IOC: { type: "boolean", description: "Immediate-or-cancel, default false" }
        },
        required: ["symbol", "side", "type"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; order placement is disabled.");
        }
        const body = {};
        if (args.symbol != null) body.symbol = String(args.symbol);
        if (args.side != null) body.side = String(args.side);
        if (args.type != null) body.type = String(args.type);
        if (args.clientOrderId != null) body.clientOrderId = String(args.clientOrderId);
        if (args.size != null) body.size = String(args.size);
        if (args.price != null) body.price = String(args.price);
        if (args.amount != null) body.amount = String(args.amount);
        if (args.IOC != null) body.IOC = Boolean(args.IOC);
        return (await client.signedPost("/api/v1/trade/order", body)).data;
      }
    },
    {
      name: "pionex_orders_get_order",
      module: "orders",
      isWrite: false,
      description: "Get a single order by order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          orderId: { type: "integer", description: "Order id" }
        },
        required: ["symbol", "orderId"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const orderId = Number(args.orderId);
        return (await client.signedGet("/api/v1/trade/order", { symbol, orderId })).data;
      }
    },
    {
      name: "pionex_orders_get_order_by_client_order_id",
      module: "orders",
      isWrite: false,
      description: "Get a single order by client order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          clientOrderId: { type: "string", description: "Client order id" }
        },
        required: ["symbol", "clientOrderId"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const clientOrderId = String(args.clientOrderId);
        return (await client.signedGet("/api/v1/trade/orderByClientOrderId", { symbol, clientOrderId })).data;
      }
    },
    {
      name: "pionex_orders_get_open_orders",
      module: "orders",
      isWrite: false,
      description: "List open (unfilled) orders for a symbol.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { symbol: { type: "string", description: "e.g. BTC_USDT" } },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        return (await client.signedGet("/api/v1/trade/openOrders", { symbol })).data;
      }
    },
    {
      name: "pionex_orders_get_all_orders",
      module: "orders",
      isWrite: false,
      description: "List order history for a symbol (filled and cancelled), with optional limit.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Default 1 (1-100)" }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const q = { symbol };
        if (args.limit != null) q.limit = Number(args.limit);
        return (await client.signedGet("/api/v1/trade/allOrders", q)).data;
      }
    },
    {
      name: "pionex_orders_cancel_order",
      module: "orders",
      isWrite: true,
      description: "Cancel an open order by order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          orderId: { type: "integer", description: "Order id" }
        },
        required: ["symbol", "orderId"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; order cancellation is disabled.");
        }
        const symbol = String(args.symbol);
        const orderId = Number(args.orderId);
        return (await client.signedDelete("/api/v1/trade/order", { symbol, orderId })).data;
      }
    },
    {
      name: "pionex_orders_get_fills",
      module: "orders",
      isWrite: false,
      description: "Get filled trades (fills) for a symbol in a time range. Requires API key. Returns up to 100 latest fills.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          startTime: { type: "integer", description: "Start time in milliseconds." },
          endTime: { type: "integer", description: "End time in milliseconds." }
        },
        required: ["symbol"]
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const q = { symbol };
        if (args.startTime != null) q.startTime = Number(args.startTime);
        if (args.endTime != null) q.endTime = Number(args.endTime);
        return (await client.signedGet("/api/v1/trade/fills", q)).data;
      }
    },
    {
      name: "pionex_orders_cancel_all_orders",
      module: "orders",
      isWrite: true,
      description: "Cancel all open orders for a symbol.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { symbol: { type: "string", description: "e.g. BTC_USDT" } },
        required: ["symbol"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; cancel-all is disabled.");
        }
        const symbol = String(args.symbol);
        return (await client.signedDelete("/api/v1/trade/allOrders", { symbol })).data;
      }
    }
  ];
}

// src/tools/index.ts
function allToolSpecs() {
  return [...registerMarketTools(), ...registerAccountTools(), ...registerOrdersTools()];
}
function buildTools(config) {
  const enabled = new Set(config.modules);
  const tools = allToolSpecs().filter((t) => enabled.has(t.module));
  if (!config.readOnly) return tools;
  return tools.filter((t) => !t.isWrite);
}
function createToolRunner(client, config) {
  const fullConfig = { ...config, modules: [...MODULES] };
  const toolMap = new Map(allToolSpecs().map((t) => [t.name, t]));
  return async (toolName, args) => {
    const tool = toolMap.get(toolName);
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const data = await tool.handler(args, { config: fullConfig, client });
    return { endpoint: toolName, requestTime: (/* @__PURE__ */ new Date()).toISOString(), data };
  };
}

// src/tools/types.ts
function toMcpTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      readOnlyHint: !tool.isWrite,
      destructiveHint: tool.isWrite,
      idempotentHint: !tool.isWrite,
      openWorldHint: false
    }
  };
}
export {
  ConfigError,
  DEFAULT_MODULES,
  MODULES,
  PIONEX_API_DEFAULT_BASE_URL,
  PionexApiError,
  PionexRestClient,
  SUPPORTED_CLIENTS,
  buildTools,
  configFilePath,
  createToolRunner,
  getConfigPath,
  loadConfig,
  printSetupUsage,
  readFullConfig,
  readTomlProfile,
  runSetup,
  toMcpTool,
  toToolErrorPayload,
  stringify as tomlStringify,
  writeFullConfig
};
//# sourceMappingURL=index.js.map