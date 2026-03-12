import { z } from "zod";
import { publicGet } from "../common/client.mjs";
import { textContent, errorContent } from "../common/utils.mjs";

/**
 * Register public market data tools (no auth).
 * @param { import('@modelcontextprotocol/sdk/server/mcp.js').McpServer } server
 */
export function registerMarketTools(server) {
  server.tool(
    "pionex.market.get_depth",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Price levels, default 5"),
      }),
    },
    async (paramsRaw) => {
      try {
        // 兼容 mcporter 等客户端误传 schema:{...} 的情况
        const params =
          paramsRaw && typeof paramsRaw.schema === "object"
            ? paramsRaw.schema
            : paramsRaw;

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
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Default 5"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object"
            ? paramsRaw.schema
            : paramsRaw;

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
    {
      schema: z.object({
        symbols: z
          .string()
          .optional()
          .describe(
            "Optional. One or more symbols, comma-separated, e.g. \"BTC_USDT\" or \"BTC_USDT,ADA_USDT\"."
          ),
        type: z
          .enum(["SPOT", "PERP"])
          .optional()
          .describe(
            "Optional. If no symbols are specified, filter by type (default is SPOT)."
          ),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object"
            ? paramsRaw.schema
            : paramsRaw;

        const { symbols, type } = params ?? {};
        const q = {};
        if (symbols) q.symbols = symbols;
        if (!symbols && type) q.type = type;

        const data = await publicGet("/api/v1/common/symbols", q);
        // This endpoint returns rich metadata per symbol, including:
        // - baseCurrency / quoteCurrency
        // - basePrecision / quotePrecision / amountPrecision
        // - minAmount (minimum order amount for SPOT)
        // - minTradeSize / maxTradeSize (limit order quantity bounds)
        // - minTradeDumping / maxTradeDumping (market sell quantity bounds)
        // - buyCeiling / sellFloor (price bands vs latest price)
        // - enable (whether trading is enabled)
        // Agents can use these fields to compute valid size/amount ranges and to avoid
        // TRADE_AMOUNT_FILTER_DENIED / TRADE_SIZE_FILTER_DENIED errors when placing orders.
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );
}

