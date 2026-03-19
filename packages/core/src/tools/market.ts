import type { ToolSpec } from "./types.js";

export function registerMarketTools(): ToolSpec[] {
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
          limit: { type: "integer", description: "Price levels (1-100), default 5" },
        },
        required: ["symbol"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const limit = args.limit == null ? undefined : Number(args.limit);
        const q: Record<string, unknown> = { symbol };
        if (limit != null && Number.isFinite(limit)) q.limit = limit;
        return (await client.publicGet("/api/v1/market/depth", q)).data;
      },
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
          limit: { type: "integer", description: "Default 5 (1-100)" },
        },
        required: ["symbol"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const limit = args.limit == null ? undefined : Number(args.limit);
        const q: Record<string, unknown> = { symbol };
        if (limit != null && Number.isFinite(limit)) q.limit = limit;
        return (await client.publicGet("/api/v1/market/trades", q)).data;
      },
    },
    {
      name: "pionex_market_get_symbol_info",
      module: "market",
      isWrite: false,
      description:
        "Get symbol metadata (precision, min size, price limits). Call before placing orders to avoid amount/size filter errors.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbols: {
            type: "string",
            description: 'Optional. One or more symbols, comma-separated, e.g. "BTC_USDT" or "BTC_USDT,ADA_USDT".',
          },
          type: {
            type: "string",
            enum: ["SPOT", "PERP"],
            description: "Optional. If no symbols are specified, filter by type (default SPOT).",
          },
        },
      },
      async handler(args, { client }) {
        const q: Record<string, unknown> = {};
        if (args.symbols) q.symbols = String(args.symbols);
        if (!args.symbols && args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/common/symbols", q)).data;
      },
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
          type: { type: "string", enum: ["SPOT", "PERP"], description: "If symbol is not specified, filter by type." },
        },
      },
      async handler(args, { client }) {
        const q: Record<string, unknown> = {};
        if (args.symbol) q.symbol = String(args.symbol);
        if (args.type) q.type = String(args.type);
        return (await client.publicGet("/api/v1/market/tickers", q)).data;
      },
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
          limit: { type: "integer", description: "Default 100 (1-500)." },
        },
        required: ["symbol", "interval"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const interval = String(args.interval);
        const q: Record<string, unknown> = { symbol, interval };
        if (args.endTime != null) q.endTime = Number(args.endTime);
        if (args.limit != null) q.limit = Number(args.limit);
        return (await client.publicGet("/api/v1/market/klines", q)).data;
      },
    },
  ];
}

