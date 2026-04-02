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
var MODULES = ["market", "account", "orders", "bot", "earn_dual"];
var DEFAULT_MODULES = ["market", "account", "orders", "bot", "earn_dual"];

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
  async signedDeleteQuery(path2, query = {}) {
    const { url, headers } = buildSignedRequest(this.config, "DELETE", path2, query, null);
    const res = await fetch(url, { method: "DELETE", headers });
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
      name: "pionex_market_get_book_tickers",
      module: "market",
      isWrite: false,
      description: "Get best bid/ask ticker(s). Optional symbol or type (SPOT/PERP).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT; if omitted, returns all book tickers filtered by type" },
          type: { type: "string", enum: ["SPOT", "PERP"], description: "If symbol is not specified, filter by type." }
        }
      },
      async handler(args, { client }) {
        const q = {};
        if (args.symbol) q.symbol = String(args.symbol);
        if (args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/market/bookTickers", q)).data;
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
      name: "pionex_orders_get_fills_by_order_id",
      module: "orders",
      isWrite: false,
      description: "Get fills for a specific order by symbol and orderId.",
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
        return (await client.signedGet("/api/v1/trade/fillsByOrderId", { symbol, orderId })).data;
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

// src/schemas/futures-grid-create.ts
var CREATE_FUTURES_GRID_ORDER_DATA_KEYS = [
  "top",
  "bottom",
  "row",
  "grid_type",
  "trend",
  "leverage",
  "extraMargin",
  "quoteInvestment",
  "condition",
  "conditionDirection",
  "lossStopType",
  "lossStop",
  "lossStopDelay",
  "profitStopType",
  "profitStop",
  "profitStopDelay",
  "lossStopHigh",
  "shareRatio",
  "investCoin",
  "investmentFrom",
  "uiInvestCoin",
  "lossStopLimitPrice",
  "lossStopLimitHighPrice",
  "profitStopLimitPrice",
  "slippage",
  "bonusId",
  "uiExtraData",
  "movingIndicatorType",
  "movingIndicatorInterval",
  "movingIndicatorParam",
  "movingTrailingUpParam",
  "cateType",
  "movingTop",
  "movingBottom",
  "enableFollowClosed"
];
var ORDER_DATA_KEY_SET = new Set(CREATE_FUTURES_GRID_ORDER_DATA_KEYS);
function asNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected non-empty string.`);
  }
  return value.trim();
}
function asFiniteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid "${field}": expected finite number.`);
  }
  return value;
}
function asPositiveNumber(value, field) {
  const n = asFiniteNumber(value, field);
  if (n <= 0) throw new Error(`Invalid "${field}": expected number > 0.`);
  return n;
}
function asPositiveInteger(value, field) {
  const n = asPositiveNumber(value, field);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected positive integer.`);
  }
  return n;
}
function asBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid "${field}": expected boolean.`);
  }
  return value;
}
function assertEnum(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}
function asPositiveDecimalString(value, field) {
  const s = asNonEmptyString(value, field);
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  return s;
}
function asPositiveDecimalStringLoose(value, field) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  return asPositiveDecimalString(value, field);
}
function asNonNegativeDecimalString(value, field) {
  const s = asNonEmptyString(value, field);
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected non-negative decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid "${field}": expected non-negative decimal string.`);
  }
  return s;
}
function asOptionalString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`Invalid "${field}": expected string.`);
  }
  return value;
}
function asOptionalNonNegativeNumber(value, field) {
  const n = asFiniteNumber(value, field);
  if (n < 0) throw new Error(`Invalid "${field}": expected number >= 0.`);
  return n;
}
function parseAndValidateCreateFuturesGridBuOrderData(raw) {
  const data = { ...raw };
  for (const k of Object.keys(data)) {
    if (!ORDER_DATA_KEY_SET.has(k)) {
      throw new Error(`Unknown buOrderData property "${k}". Allowed keys: ${CREATE_FUTURES_GRID_ORDER_DATA_KEYS.join(", ")}.`);
    }
  }
  const top = asPositiveDecimalStringLoose(data.top, "buOrderData.top");
  const bottom = asPositiveDecimalStringLoose(data.bottom, "buOrderData.bottom");
  if (Number(top) <= Number(bottom)) {
    throw new Error('Invalid "buOrderData.top": expected top > bottom.');
  }
  const row = asPositiveInteger(data.row, "buOrderData.row");
  const gridType = asNonEmptyString(data.grid_type, "buOrderData.grid_type");
  assertEnum(gridType, "buOrderData.grid_type", ["arithmetic", "geometric"]);
  const trend = asNonEmptyString(data.trend, "buOrderData.trend");
  assertEnum(trend, "buOrderData.trend", ["long", "short", "no_trend"]);
  const leverage = asPositiveNumber(data.leverage, "buOrderData.leverage");
  const quoteInvestment = asPositiveDecimalStringLoose(data.quoteInvestment, "buOrderData.quoteInvestment");
  const out = {
    top,
    bottom,
    row,
    grid_type: gridType,
    trend,
    leverage,
    quoteInvestment
  };
  if (data.extraMargin != null) {
    out.extraMargin = asNonNegativeDecimalString(data.extraMargin, "buOrderData.extraMargin");
  }
  if (data.condition != null) out.condition = asOptionalString(data.condition, "buOrderData.condition");
  if (data.conditionDirection != null) {
    const v = asNonEmptyString(data.conditionDirection, "buOrderData.conditionDirection");
    assertEnum(v, "buOrderData.conditionDirection", ["-1", "1"]);
    out.conditionDirection = v;
  }
  if (data.lossStopType != null) {
    const v = asNonEmptyString(data.lossStopType, "buOrderData.lossStopType");
    assertEnum(v, "buOrderData.lossStopType", ["price", "profit_amount", "profit_ratio", "price_limit"]);
    out.lossStopType = v;
  }
  if (data.lossStop != null) out.lossStop = asOptionalString(data.lossStop, "buOrderData.lossStop");
  if (data.lossStopDelay != null) out.lossStopDelay = asOptionalNonNegativeNumber(data.lossStopDelay, "buOrderData.lossStopDelay");
  if (data.profitStopType != null) {
    const v = asNonEmptyString(data.profitStopType, "buOrderData.profitStopType");
    assertEnum(v, "buOrderData.profitStopType", ["price", "profit_amount", "profit_ratio", "price_limit"]);
    out.profitStopType = v;
  }
  if (data.profitStop != null) out.profitStop = asOptionalString(data.profitStop, "buOrderData.profitStop");
  if (data.profitStopDelay != null) out.profitStopDelay = asOptionalNonNegativeNumber(data.profitStopDelay, "buOrderData.profitStopDelay");
  if (data.lossStopHigh != null) out.lossStopHigh = asOptionalString(data.lossStopHigh, "buOrderData.lossStopHigh");
  if (data.shareRatio != null) out.shareRatio = asOptionalString(data.shareRatio, "buOrderData.shareRatio");
  if (data.investCoin != null) out.investCoin = asOptionalString(data.investCoin, "buOrderData.investCoin");
  if (data.investmentFrom != null) {
    const v = asNonEmptyString(data.investmentFrom, "buOrderData.investmentFrom");
    assertEnum(v, "buOrderData.investmentFrom", ["USER", "LOCK_ACTIVITY", "FUTURE_GRID_BONUS"]);
    out.investmentFrom = v;
  }
  if (data.uiInvestCoin != null) out.uiInvestCoin = asOptionalString(data.uiInvestCoin, "buOrderData.uiInvestCoin");
  if (data.lossStopLimitPrice != null) out.lossStopLimitPrice = asOptionalString(data.lossStopLimitPrice, "buOrderData.lossStopLimitPrice");
  if (data.lossStopLimitHighPrice != null) out.lossStopLimitHighPrice = asOptionalString(data.lossStopLimitHighPrice, "buOrderData.lossStopLimitHighPrice");
  if (data.profitStopLimitPrice != null) out.profitStopLimitPrice = asOptionalString(data.profitStopLimitPrice, "buOrderData.profitStopLimitPrice");
  if (data.slippage != null) out.slippage = asOptionalString(data.slippage, "buOrderData.slippage");
  if (data.bonusId != null) out.bonusId = asOptionalString(data.bonusId, "buOrderData.bonusId");
  if (data.uiExtraData != null) out.uiExtraData = asOptionalString(data.uiExtraData, "buOrderData.uiExtraData");
  if (data.movingIndicatorType != null) out.movingIndicatorType = asOptionalString(data.movingIndicatorType, "buOrderData.movingIndicatorType");
  if (data.movingIndicatorInterval != null) out.movingIndicatorInterval = asOptionalString(data.movingIndicatorInterval, "buOrderData.movingIndicatorInterval");
  if (data.movingIndicatorParam != null) out.movingIndicatorParam = asOptionalString(data.movingIndicatorParam, "buOrderData.movingIndicatorParam");
  if (data.movingTrailingUpParam != null) out.movingTrailingUpParam = asOptionalString(data.movingTrailingUpParam, "buOrderData.movingTrailingUpParam");
  if (data.cateType != null) {
    const v = asNonEmptyString(data.cateType, "buOrderData.cateType");
    assertEnum(v, "buOrderData.cateType", ["FULLY_HEDGING", "LOAN_GRID", "LEVERAGE_GRID", "FUTURE_GRID_COIN_MARGINED"]);
    out.cateType = v;
  }
  if (data.movingTop != null) out.movingTop = asOptionalString(data.movingTop, "buOrderData.movingTop");
  if (data.movingBottom != null) out.movingBottom = asOptionalString(data.movingBottom, "buOrderData.movingBottom");
  if (data.enableFollowClosed != null) out.enableFollowClosed = asBoolean(data.enableFollowClosed, "buOrderData.enableFollowClosed");
  return out;
}
var createFuturesGridOrderDataJsonSchema = {
  type: "object",
  additionalProperties: false,
  description: "CreateFuturesGridOrderData (openapi_bot.yaml). Required: top, bottom, row, grid_type, trend, leverage, quoteInvestment.",
  required: ["top", "bottom", "row", "grid_type", "trend", "leverage", "quoteInvestment"],
  properties: {
    top: { type: "string", description: "Grid upper price" },
    bottom: { type: "string", description: "Grid lower price" },
    row: { type: "number", description: "Number of grid levels" },
    grid_type: {
      type: "string",
      enum: ["arithmetic", "geometric"],
      description: "Grid spacing: arithmetic (equal difference) or geometric (equal ratio)"
    },
    trend: {
      type: "string",
      enum: ["long", "short", "no_trend"],
      description: "Grid direction"
    },
    leverage: { type: "number", description: "Leverage multiplier" },
    extraMargin: { type: "string", description: "Extra margin amount (optional)" },
    quoteInvestment: { type: "string", description: "Investment amount" },
    condition: { type: "string", description: "Trigger price (conditional orders)" },
    conditionDirection: { type: "string", enum: ["-1", "1"], description: "Trigger direction" },
    lossStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio", "price_limit"],
      description: "Stop loss type"
    },
    lossStop: { type: "string", description: "Stop loss value" },
    lossStopDelay: { type: "number", description: "Stop loss delay (seconds)" },
    profitStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio", "price_limit"],
      description: "Take profit type"
    },
    profitStop: { type: "string", description: "Take profit value" },
    profitStopDelay: { type: "number", description: "Take profit delay (seconds)" },
    lossStopHigh: { type: "string", description: "Upper stop loss price for neutral grid" },
    shareRatio: { type: "string", description: "Profit sharing ratio" },
    investCoin: { type: "string", description: "Investment currency" },
    investmentFrom: {
      type: "string",
      enum: ["USER", "LOCK_ACTIVITY", "FUTURE_GRID_BONUS"],
      description: "Funding source"
    },
    uiInvestCoin: { type: "string", description: "Frontend-recorded investment currency" },
    lossStopLimitPrice: { type: "string", description: "Limit SL price (lossStopType=price_limit)" },
    lossStopLimitHighPrice: { type: "string", description: "Upper limit SL for neutral grid" },
    profitStopLimitPrice: { type: "string", description: "Limit TP price (profitStopType=price_limit)" },
    slippage: { type: "string", description: "Open slippage e.g. 0.01 = 1%" },
    bonusId: { type: "string", description: "Bonus UUID" },
    uiExtraData: { type: "string", description: "Frontend extra (coin-margined)" },
    movingIndicatorType: { type: "string", description: "e.g. sma" },
    movingIndicatorInterval: { type: "string", description: "e.g. 1m, 15m" },
    movingIndicatorParam: { type: "string", description: "JSON params e.g. length" },
    movingTrailingUpParam: { type: "string", description: "SMA trailing up ratio" },
    cateType: {
      type: "string",
      enum: ["FULLY_HEDGING", "LOAN_GRID", "LEVERAGE_GRID", "FUTURE_GRID_COIN_MARGINED"],
      description: "Category type"
    },
    movingTop: { type: "string", description: "Moving grid upper limit" },
    movingBottom: { type: "string", description: "Moving grid lower limit" },
    enableFollowClosed: { type: "boolean", description: "Follow close" }
  }
};
var createFuturesGridCreateToolInputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["base", "quote", "buOrderData"],
  properties: {
    base: { type: "string", description: "Base currency (e.g. BTC); *.PERP normalized in handler" },
    quote: { type: "string", description: "Quote currency (e.g. USDT)" },
    copyFrom: { type: "string", description: "Optional. Copy source order ID" },
    copyType: { type: "string", description: "Optional. Copy type" },
    copyBotOrderId: { type: "string", description: "Optional. Copy bot order ID" },
    buOrderData: createFuturesGridOrderDataJsonSchema,
    __dryRun: { type: "boolean", description: "Internal: when true, return resolved body without POST" }
  }
};

// src/tools/bot.ts
function asNonEmptyString2(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected non-empty string.`);
  }
  return value.trim();
}
function asFiniteNumber2(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid "${field}": expected finite number.`);
  }
  return value;
}
function asPositiveNumber2(value, field) {
  const n = asFiniteNumber2(value, field);
  if (n <= 0) throw new Error(`Invalid "${field}": expected number > 0.`);
  return n;
}
function asPositiveInteger2(value, field) {
  const n = asPositiveNumber2(value, field);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected positive integer.`);
  }
  return n;
}
function asBoolean2(value, field) {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid "${field}": expected boolean.`);
  }
  return value;
}
function assertEnum2(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}
function asObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid "${field}": expected JSON object.`);
  }
  return value;
}
function asPositiveDecimalString2(value, field) {
  const s = asNonEmptyString2(value, field);
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  return s;
}
function normalizePerpBase(base) {
  return base.endsWith(".PERP") ? base : `${base}.PERP`;
}
function registerBotTools() {
  return [
    {
      name: "pionex_bot_futures_grid_get_order",
      module: "bot",
      isWrite: false,
      description: "Get one futures grid bot order by buOrderId.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string", description: "Futures grid bot order id." },
          lang: { type: "string", description: "Optional language code." }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client }) {
        const buOrderId = String(args.buOrderId);
        const q = { buOrderId };
        if (args.lang != null) q.lang = String(args.lang);
        return (await client.signedGet("/api/v1/bot/orders/futuresGrid/order", q)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_create",
      module: "bot",
      isWrite: true,
      description: "Create a futures grid order (openapi_bot.yaml CreateFuturesGridRequest / CreateFuturesGridOrderData). https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml \u2014 Required: base, quote, buOrderData. Optional: copyFrom, copyType, copyBotOrderId. buOrderData required: top, bottom, row, grid_type, trend, leverage, quoteInvestment; unknown keys rejected.",
      inputSchema: createFuturesGridCreateToolInputSchema,
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid create is disabled.");
        }
        const rawBase = asNonEmptyString2(args.base, "base");
        const base = normalizePerpBase(rawBase);
        const quote = asNonEmptyString2(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateFuturesGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        const row = buOrderDataOut.row;
        const gridType = buOrderDataOut.grid_type;
        const leverage = buOrderDataOut.leverage;
        const body = {
          base,
          quote,
          buOrderData: buOrderDataOut
        };
        if (args.copyFrom != null) body.copyFrom = String(args.copyFrom);
        if (args.copyType != null) body.copyType = String(args.copyType);
        if (args.copyBotOrderId != null) body.copyBotOrderId = String(args.copyBotOrderId);
        if (args.__dryRun === true) {
          return {
            dryRun: true,
            note: "No order was sent. Body matches openapi_bot.yaml CreateFuturesGridRequest.",
            resolvedParams: {
              row,
              grid_type: gridType,
              leverage
            },
            resolvedBody: body
          };
        }
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/create", body)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_adjust_params",
      module: "bot",
      isWrite: true,
      description: "Adjust futures grid bot params (invest_in / adjust_params / invest_in_trigger).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          type: { type: "string", enum: ["invest_in", "adjust_params", "invest_in_trigger"] },
          quoteInvestment: { type: "number" },
          extraMargin: { type: "boolean" },
          bottom: { type: "string" },
          top: { type: "string" },
          row: { type: "number" },
          extraMarginAmount: { type: "number" },
          isRecommend: { type: "boolean" },
          isReinvest: { type: "boolean" },
          investCoin: { type: "string" },
          investmentFrom: { type: "string", enum: ["USER", "LOCK_ACTIVITY"] },
          condition: { type: "string" },
          conditionDirection: { type: "string", enum: ["1", "-1"] },
          slippage: { type: "string" },
          adjustParamsSence: { type: "string" }
        },
        required: ["buOrderId", "type", "extraMargin"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid adjust_params is disabled.");
        }
        const buOrderId = asNonEmptyString2(args.buOrderId, "buOrderId");
        const type = asNonEmptyString2(args.type, "type");
        assertEnum2(type, "type", ["invest_in", "adjust_params", "invest_in_trigger"]);
        const extraMargin = asBoolean2(args.extraMargin, "extraMargin");
        if (type === "invest_in" && args.quoteInvestment != null) {
          asPositiveNumber2(args.quoteInvestment, "quoteInvestment");
        }
        if (type === "adjust_params") {
          const bottom = asPositiveDecimalString2(args.bottom, "bottom");
          const top = asPositiveDecimalString2(args.top, "top");
          if (Number(top) <= Number(bottom)) {
            throw new Error('Invalid "top": expected top > bottom.');
          }
          asPositiveInteger2(args.row, "row");
        }
        if (type === "invest_in_trigger") {
          asPositiveDecimalString2(args.condition, "condition");
          const conditionDirection = asNonEmptyString2(args.conditionDirection, "conditionDirection");
          assertEnum2(conditionDirection, "conditionDirection", ["1", "-1"]);
        }
        const body = {
          buOrderId,
          type,
          extraMargin
        };
        if (args.quoteInvestment != null) body.quoteInvestment = asFiniteNumber2(args.quoteInvestment, "quoteInvestment");
        if (args.bottom != null) body.bottom = asPositiveDecimalString2(args.bottom, "bottom");
        if (args.top != null) body.top = asPositiveDecimalString2(args.top, "top");
        if (args.row != null) body.row = asPositiveInteger2(args.row, "row");
        if (args.extraMarginAmount != null) body.extraMarginAmount = asFiniteNumber2(args.extraMarginAmount, "extraMarginAmount");
        if (args.isRecommend != null) body.isRecommend = asBoolean2(args.isRecommend, "isRecommend");
        if (args.isReinvest != null) body.isReinvest = asBoolean2(args.isReinvest, "isReinvest");
        if (args.investCoin != null) body.investCoin = String(args.investCoin);
        if (args.investmentFrom != null) {
          const investmentFrom = asNonEmptyString2(args.investmentFrom, "investmentFrom");
          assertEnum2(investmentFrom, "investmentFrom", ["USER", "LOCK_ACTIVITY"]);
          body.investmentFrom = investmentFrom;
        }
        if (args.condition != null) body.condition = asPositiveDecimalString2(args.condition, "condition");
        if (args.conditionDirection != null) {
          const conditionDirection = asNonEmptyString2(args.conditionDirection, "conditionDirection");
          assertEnum2(conditionDirection, "conditionDirection", ["1", "-1"]);
          body.conditionDirection = conditionDirection;
        }
        if (args.slippage != null) body.slippage = String(args.slippage);
        if (args.adjustParamsSence != null) body.adjustParamsSence = String(args.adjustParamsSence);
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/adjustParams", body)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_reduce",
      module: "bot",
      isWrite: true,
      description: "Reduce futures grid bot position.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          reduceNum: { type: "number" },
          slippage: { type: "string" },
          condition: { type: "string" },
          conditionDirection: { type: "string", enum: ["1", "-1"] }
        },
        required: ["buOrderId", "reduceNum"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid reduce is disabled.");
        }
        const buOrderId = asNonEmptyString2(args.buOrderId, "buOrderId");
        const reduceNum = asPositiveInteger2(args.reduceNum, "reduceNum");
        const body = {
          buOrderId,
          reduceNum
        };
        if (args.slippage != null) body.slippage = String(args.slippage);
        if (args.condition != null) body.condition = String(args.condition);
        if (args.conditionDirection != null) {
          const conditionDirection = asNonEmptyString2(args.conditionDirection, "conditionDirection");
          assertEnum2(conditionDirection, "conditionDirection", ["1", "-1"]);
          body.conditionDirection = conditionDirection;
        }
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/reduce", body)).data;
      }
    },
    {
      name: "pionex_bot_order_list",
      module: "bot",
      isWrite: false,
      description: "List bot orders with optional filters and pagination. status: 'running' (default) or 'canceled'. buOrderTypes: one or more of futures_grid, spot_grid, smart_copy. Endpoint: GET /api/v1/bot/orders",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: {
            type: "string",
            enum: ["running", "canceled"],
            description: "Filter by order status. Default: 'running'."
          },
          base: { type: "string", description: "Base currency filter (e.g. BTC)." },
          quote: { type: "string", description: "Quote currency filter (e.g. USDT)." },
          pageToken: { type: "string", description: "Pagination token from a previous response." },
          buOrderTypes: {
            type: "array",
            items: { type: "string", enum: ["futures_grid", "spot_grid", "smart_copy"] },
            description: "Bot type filter: futures_grid, spot_grid, smart_copy. Omit to return all types."
          }
        },
        required: []
      },
      async handler(args, { client }) {
        const q = {};
        if (args.status != null) q.status = String(args.status);
        if (args.base != null) q.base = String(args.base);
        if (args.quote != null) q.quote = String(args.quote);
        if (args.pageToken != null) q.pageToken = String(args.pageToken);
        if (Array.isArray(args.buOrderTypes) && args.buOrderTypes.length > 0) {
          q.buOrderTypes = args.buOrderTypes.join(",");
        }
        return (await client.signedGet("/api/v1/bot/orders", q)).data;
      }
    },
    {
      name: "pionex_bot_futures_grid_cancel",
      module: "bot",
      isWrite: true,
      description: "Cancel and close a futures grid bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          closeNote: { type: "string" },
          closeSellModel: { type: "string", enum: ["TO_QUOTE", "TO_USDT"] },
          immediate: { type: "boolean" },
          closeSlippage: { type: "string" }
        },
        required: ["buOrderId"]
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid cancel is disabled.");
        }
        const buOrderId = asNonEmptyString2(args.buOrderId, "buOrderId");
        const body = { buOrderId };
        if (args.closeNote != null) body.closeNote = String(args.closeNote);
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString2(args.closeSellModel, "closeSellModel");
          assertEnum2(closeSellModel, "closeSellModel", ["TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        if (args.immediate != null) body.immediate = asBoolean2(args.immediate, "immediate");
        if (args.closeSlippage != null) body.closeSlippage = String(args.closeSlippage);
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/cancel", body)).data;
      }
    }
  ];
}

// src/tools/earn-dual.ts
function registerEarnDualTools() {
  return [
    // ─── Public endpoints ────────────────────────────────────────────────────
    {
      name: "pionex_earn_dual_symbols",
      module: "earn_dual",
      isWrite: false,
      description: "List all trading pairs supported by Dual Investment, optionally filtered by base currency. Supported quote currencies: USDT, USDC, USD, USDXO. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency filter (e.g. BTC, ETH). Omit to return all supported pairs." }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        return (await client.publicGet("/api/v1/earn/dual/symbols", base ? { base } : {})).data;
      }
    },
    {
      name: "pionex_earn_dual_open_products",
      module: "earn_dual",
      isWrite: false,
      description: "List currently open Dual Investment products for a specific trading pair and direction. DUAL_BASE: invest in base currency (e.g. BTC); DUAL_CURRENCY: invest in investment currency (e.g. USDT). Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}, where C=DUAL_BASE, P=DUAL_CURRENCY. For BTC/ETH use quote=USDXO with currency=USDT or USDC. For other bases use quote=USDT with currency=USDT. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "type"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, XRP)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH; use USDT for all other base currencies." },
          type: { type: "string", enum: ["DUAL_BASE", "DUAL_CURRENCY"], description: "DUAL_BASE: invest in base currency (product ID suffix C); DUAL_CURRENCY: invest in investment currency (product ID suffix P)" },
          currency: { type: "string", description: "Investment currency filter. For BTC/ETH: USDT or USDC. For other pairs: USDT." }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        const type = args.type;
        const currency = args.currency;
        const query = { base, quote, type };
        if (currency) query.currency = currency;
        return (await client.publicGet("/api/v1/earn/dual/openProducts", query)).data;
      }
    },
    {
      name: "pionex_earn_dual_prices",
      module: "earn_dual",
      isWrite: false,
      description: "Get latest yield rates and investability status for Dual Investment products. All three parameters (base, quote, productIds) are required. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. When canInvest is false, profit and baseSize will be empty strings. Always call this before placing an order \u2014 the profit value returned here must be passed unchanged to pionex_earn_dual_invest. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "productIds"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, LRC)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." },
          productIds: {
            type: "array",
            items: { type: "string" },
            description: 'List of product IDs obtained from pionex_earn_dual_open_products (e.g. ["ETH-USDXO-260410-3000-C-USDT", "ETH-USDXO-260410-2900-C-USDT"]).'
          }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        const productIds = args.productIds;
        const query = { base, quote };
        if (productIds && productIds.length > 0) query.productIds = productIds.join(",");
        return (await client.publicGet("/api/v1/earn/dual/prices", query)).data;
      }
    },
    {
      name: "pionex_earn_dual_index",
      module: "earn_dual",
      isWrite: false,
      description: "Get real-time index price for a Dual Investment underlying asset. Both base and quote are required. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. The index price is the reference price used at settlement to determine payout direction. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, LRC)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        return (await client.publicGet("/api/v1/earn/dual/index", { base, quote })).data;
      }
    },
    {
      name: "pionex_earn_dual_delivery_prices",
      module: "earn_dual",
      isWrite: false,
      description: "Get historical settlement delivery prices for a Dual Investment pair. base is required; quote is optional but recommended to narrow results. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. The delivery price is the index price recorded at expiry, used to determine the settlement direction. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, XRP)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency filter. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." },
          startTime: { type: "integer", description: "Start timestamp in milliseconds" },
          endTime: { type: "integer", description: "End timestamp in milliseconds" }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const quote = args.quote;
        const startTime = args.startTime;
        const endTime = args.endTime;
        const query = { base };
        if (quote) query.quote = quote;
        if (startTime != null) query.startTime = String(startTime);
        if (endTime != null) query.endTime = String(endTime);
        return (await client.publicGet("/api/v1/earn/dual/deliveryPrices", query)).data;
      }
    },
    // ─── View endpoints (authentication required) ────────────────────────────
    {
      name: "pionex_earn_dual_balances",
      module: "earn_dual",
      isWrite: false,
      description: "Get authenticated user's Dual Investment account balances. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          merge: { type: "boolean", description: "When true, merges balances with the same coin across different base currencies." }
        }
      },
      async handler(args, { client }) {
        const merge = args.merge;
        const query = {};
        if (merge != null) query.merge = String(merge);
        return (await client.signedGet("/api/v1/earn/dual/balances", query)).data;
      }
    },
    {
      name: "pionex_earn_dual_get_invests",
      module: "earn_dual",
      isWrite: false,
      description: "Batch query Dual Investment orders by client order IDs. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualIds: {
            type: "array",
            items: { type: "string" },
            description: "List of client-assigned dual investment order IDs to query."
          }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const clientDualIds = args.clientDualIds;
        const body = {};
        if (base) body.base = base;
        if (clientDualIds) body.clientDualIds = clientDualIds;
        return (await client.signedPost("/api/v1/earn/dual/invests", body)).data;
      }
    },
    {
      name: "pionex_earn_dual_records",
      module: "earn_dual",
      isWrite: false,
      description: "Get paginated Dual Investment history for the authenticated user. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "endTime"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency filter. Use USDXO for BTC/ETH; use USDT for others." },
          currency: { type: "string", description: "Investment currency filter (e.g. USDT, BTC)" },
          filter: { type: "string", description: "Status filter" },
          startTime: { type: "integer", description: "Start timestamp in milliseconds" },
          endTime: { type: "integer", description: "End timestamp in milliseconds (required)" },
          limit: { type: "integer", description: "Maximum number of records per page (e.g. 20)" }
        }
      },
      async handler(args, { client }) {
        const base = args.base;
        const endTime = args.endTime;
        const quote = args.quote;
        const currency = args.currency;
        const filter = args.filter;
        const startTime = args.startTime;
        const limit = args.limit;
        const query = { base, endTime: String(endTime) };
        if (quote) query.quote = quote;
        if (currency) query.currency = currency;
        if (filter) query.filter = filter;
        if (startTime != null) query.startTime = String(startTime);
        if (limit != null) query.limit = String(limit);
        return (await client.signedGet("/api/v1/earn/dual/records", query)).data;
      }
    },
    // ─── Earn/write endpoints (authentication required) ──────────────────────
    {
      name: "pionex_earn_dual_invest",
      module: "earn_dual",
      isWrite: true,
      description: "Create a new Dual Investment order. Requires Earn permission (API key + secret). Provide either baseAmount (invest in base currency) or currencyAmount (invest in investment currency), not both. profit must be obtained from pionex_earn_dual_prices and passed unchanged \u2014 a stale or mismatched value will be rejected. Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}, where C=DUAL_BASE, P=DUAL_CURRENCY.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          productId: { type: "string", description: "Product ID to invest in (e.g. BTC-USDXO-260402-68000-P-USDT). Obtain from pionex_earn_dual_open_products." },
          clientDualId: { type: "string", description: "Client-assigned order ID used as an idempotency key. Recommended to avoid duplicate orders." },
          baseAmount: { type: "string", description: "Investment amount in base currency (e.g. '0.01'). Mutually exclusive with currencyAmount." },
          currencyAmount: { type: "string", description: "Investment amount in investment currency (e.g. '100'). Mutually exclusive with baseAmount." },
          profit: { type: "string", description: "Yield rate from pionex_earn_dual_prices (e.g. '0.0039'). Must be current \u2014 stale values are rejected." }
        }
      },
      async handler(args, { client }) {
        const body = { base: args.base };
        if (args.productId) body.productId = args.productId;
        if (args.clientDualId) body.clientDualId = args.clientDualId;
        if (args.baseAmount) body.baseAmount = args.baseAmount;
        if (args.currencyAmount) body.currencyAmount = args.currencyAmount;
        if (args.profit) body.profit = args.profit;
        return (await client.signedPost("/api/v1/earn/dual/invest", body)).data;
      }
    },
    {
      name: "pionex_earn_dual_revoke_invest",
      module: "earn_dual",
      isWrite: true,
      description: "Revoke a pending Dual Investment order before it is matched. Requires Earn permission (API key + secret). Parameters are sent as a JSON request body. Only orders in a pending/unmatched state can be revoked.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "productId", "clientDualId"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualId: { type: "string", description: "Client-assigned dual investment order ID" },
          productId: { type: "string", description: "Product ID of the order to revoke (e.g. BTC-USDXO-260402-68000-P-USDT)" }
        }
      },
      async handler(args, { client }) {
        const body = {
          base: args.base,
          productId: args.productId,
          clientDualId: args.clientDualId
        };
        return (await client.signedDelete("/api/v1/earn/dual/invest", body)).data;
      }
    },
    {
      name: "pionex_earn_dual_collect",
      module: "earn_dual",
      isWrite: true,
      description: "Collect settled Dual Investment earnings into the user's spot account. Requires Earn permission (API key + secret). Only orders in a settled state can be collected.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "clientDualId", "productId"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualId: { type: "string", description: "Client-assigned dual investment order ID to collect" },
          productId: { type: "string", description: "Product ID (e.g. BTC-USDXO-260402-68000-P-USDT)" }
        }
      },
      async handler(args, { client }) {
        const body = {
          base: args.base,
          clientDualId: args.clientDualId,
          productId: args.productId
        };
        return (await client.signedPost("/api/v1/earn/dual/collect", body)).data;
      }
    }
  ];
}

// src/tools/index.ts
function allToolSpecs() {
  return [...registerMarketTools(), ...registerAccountTools(), ...registerOrdersTools(), ...registerBotTools(), ...registerEarnDualTools()];
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
  CREATE_FUTURES_GRID_ORDER_DATA_KEYS,
  ConfigError,
  DEFAULT_MODULES,
  MODULES,
  PIONEX_API_DEFAULT_BASE_URL,
  PionexApiError,
  PionexRestClient,
  SUPPORTED_CLIENTS,
  buildTools,
  configFilePath,
  createFuturesGridCreateToolInputSchema,
  createFuturesGridOrderDataJsonSchema,
  createToolRunner,
  getConfigPath,
  loadConfig,
  parseAndValidateCreateFuturesGridBuOrderData,
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