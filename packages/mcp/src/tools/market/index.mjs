import { z } from "zod";
import { publicGet } from "../common/client.mjs";
import { textContent, errorContent } from "../common/utils.mjs";

export function registerMarketTools(server) {
  server.tool(
    "pionex.market.get_depth",
    "Get order book depth (bids and asks) for a symbol. Use for spread, liquidity, or best bid/ask.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        limit: z.number().int().min(1).max(100).optional().describe("Price levels, default 5"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, limit } = params;
        const q = { symbol };
        if (limit != null) q.limit = limit;
        const data = await publicGet("/api/v1/market/depth", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.market.get_trades",
    "Get recent trades for a symbol. Use for latest price and volume.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        limit: z.number().int().min(1).max(100).optional().describe("Default 5"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, limit } = params;
        const q = { symbol };
        if (limit != null) q.limit = limit;
        const data = await publicGet("/api/v1/market/trades", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.market.get_symbol_info",
    "Get symbol metadata (precision, min size, price limits). Call before placing orders to avoid TRADE_AMOUNT_FILTER_DENIED errors.",
    {
      schema: z.object({
        symbols: z
          .string()
          .optional()
          .describe(
            'Optional. One or more symbols, comma-separated, e.g. "BTC_USDT" or "BTC_USDT,ADA_USDT".'
          ),
        type: z
          .enum(["SPOT", "PERP"])
          .optional()
          .describe("Optional. If no symbols are specified, filter by type (default is SPOT)."),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbols, type } = params ?? {};
        const q = {};
        if (symbols) q.symbols = symbols;
        if (!symbols && type) q.type = type;
        const data = await publicGet("/api/v1/common/symbols", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.market.get_tickers",
    "Get 24-hour ticker(s): open, close, high, low, volume, amount, count. Optional symbol or type (SPOT/PERP).",
    {
      schema: z.object({
        symbol: z.string().optional().describe("e.g. BTC_USDT; if omitted, returns all tickers filtered by type"),
        type: z
          .enum(["SPOT", "PERP"])
          .optional()
          .describe("If symbol is not specified, filter by type (default SPOT)."),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const q = {};
        if (params?.symbol) q.symbol = params.symbol;
        if (params?.type) q.type = params.type;
        const data = await publicGet("/api/v1/market/tickers", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.market.get_klines",
    "Get OHLCV klines (candlestick) for a symbol. Use for charts or historical price/volume.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        interval: z
          .enum(["1M", "5M", "15M", "30M", "60M", "4H", "8H", "12H", "1D"])
          .describe("Kline interval."),
        endTime: z.number().int().optional().describe("End time in milliseconds."),
        limit: z.number().int().min(1).max(500).optional().describe("Default 100."),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, interval, endTime, limit } = params;
        const q = { symbol, interval };
        if (endTime != null) q.endTime = endTime;
        if (limit != null) q.limit = limit;
        const data = await publicGet("/api/v1/market/klines", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );
}
