import type { ToolSpec } from "./types.js";

export function registerEarnDualTools(): ToolSpec[] {
  return [
    // ─── Public endpoints ────────────────────────────────────────────────────
    {
      name: "pionex_earn_dual_symbols",
      module: "earn_dual",
      isWrite: false,
      description:
        "List all trading pairs supported by Dual Investment, optionally filtered by base currency. " +
        "Supported quote currencies: USDT, USDC, USD, USDXO. No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency filter (e.g. BTC, ETH). Omit to return all supported pairs." },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string | undefined;
        return (await client.publicGet("/api/v1/earn/dual/symbols", base ? { base } : {})).data;
      },
    },

    {
      name: "pionex_earn_dual_open_products",
      module: "earn_dual",
      isWrite: false,
      description:
        "List currently open Dual Investment products for a specific trading pair and direction. " +
        "DUAL_BASE: invest in base currency (e.g. BTC); DUAL_CURRENCY: invest in investment currency (e.g. USDT). " +
        "Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}, where C=DUAL_BASE, P=DUAL_CURRENCY. " +
        "For BTC/ETH use quote=USDXO with currency=USDT or USDC. For other bases use quote=USDT with currency=USDT. " +
        "No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "type"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, XRP)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH; use USDT for all other base currencies." },
          type: { type: "string", enum: ["DUAL_BASE", "DUAL_CURRENCY"], description: "DUAL_BASE: invest in base currency (product ID suffix C); DUAL_CURRENCY: invest in investment currency (product ID suffix P)" },
          currency: { type: "string", description: "Investment currency filter. For BTC/ETH: USDT or USDC. For other pairs: USDT." },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string;
        const quote = args.quote as string;
        const type = args.type as string;
        const currency = args.currency as string | undefined;
        const query: Record<string, string> = { base, quote, type };
        if (currency) query.currency = currency;
        return (await client.publicGet("/api/v1/earn/dual/openProducts", query)).data;
      },
    },

    {
      name: "pionex_earn_dual_prices",
      module: "earn_dual",
      isWrite: false,
      description:
        "Get latest yield rates and investability status for Dual Investment products. " +
        "All three parameters (base, quote, productIds) are required. " +
        "Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. " +
        "When canInvest is false, profit and baseSize will be empty strings. " +
        "Always call this before placing an order — the profit value returned here must be passed unchanged to pionex_earn_dual_invest. " +
        "No authentication required.",
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
            description: "List of product IDs obtained from pionex_earn_dual_open_products (e.g. [\"ETH-USDXO-260410-3000-C-USDT\", \"ETH-USDXO-260410-2900-C-USDT\"]).",
          },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string;
        const quote = args.quote as string;
        const productIds = args.productIds as string[];
        const query: Record<string, string> = { base, quote };
        if (productIds && productIds.length > 0) query.productIds = productIds.join(",");
        return (await client.publicGet("/api/v1/earn/dual/prices", query)).data;
      },
    },

    {
      name: "pionex_earn_dual_index",
      module: "earn_dual",
      isWrite: false,
      description:
        "Get real-time index price for a Dual Investment underlying asset. " +
        "Both base and quote are required. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. " +
        "The index price is the reference price used at settlement to determine payout direction. " +
        "No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, ETH, LRC)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string;
        const quote = args.quote as string;
        return (await client.publicGet("/api/v1/earn/dual/index", { base, quote })).data;
      },
    },

    {
      name: "pionex_earn_dual_delivery_prices",
      module: "earn_dual",
      isWrite: false,
      description:
        "Get historical settlement delivery prices for a Dual Investment pair. " +
        "base is required; quote is optional but recommended to narrow results. " +
        "Use USDXO for BTC/ETH pairs; use USDT for all other base currencies. " +
        "The delivery price is the index price recorded at expiry, used to determine the settlement direction. " +
        "No authentication required.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC, XRP)" },
          quote: { type: "string", enum: ["USDT", "USDC", "USDXO"], description: "Quote currency filter. Use USDXO for BTC/ETH pairs; use USDT for all other base currencies." },
          startTime: { type: "integer", description: "Start timestamp in milliseconds" },
          endTime: { type: "integer", description: "End timestamp in milliseconds" },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string;
        const quote = args.quote as string | undefined;
        const startTime = args.startTime as number | undefined;
        const endTime = args.endTime as number | undefined;
        const query: Record<string, string> = { base };
        if (quote) query.quote = quote;
        if (startTime != null) query.startTime = String(startTime);
        if (endTime != null) query.endTime = String(endTime);
        return (await client.publicGet("/api/v1/earn/dual/deliveryPrices", query)).data;
      },
    },

    // ─── View endpoints (authentication required) ────────────────────────────
    {
      name: "pionex_earn_dual_balances",
      module: "earn_dual",
      isWrite: false,
      description:
        "Get authenticated user's Dual Investment account balances. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          merge: { type: "boolean", description: "When true, merges balances with the same coin across different base currencies." },
        },
      },
      async handler(args, { client }) {
        const merge = args.merge as boolean | undefined;
        const query: Record<string, string> = {};
        if (merge != null) query.merge = String(merge);
        return (await client.signedGet("/api/v1/earn/dual/balances", query)).data;
      },
    },

    {
      name: "pionex_earn_dual_get_invests",
      module: "earn_dual",
      isWrite: false,
      description:
        "Batch query Dual Investment orders by client order IDs. Requires View permission (API key + secret).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualIds: {
            type: "array",
            items: { type: "string" },
            description: "List of client-assigned dual investment order IDs to query.",
          },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string | undefined;
        const clientDualIds = args.clientDualIds as string[] | undefined;
        const body: Record<string, unknown> = {};
        if (base) body.base = base;
        if (clientDualIds) body.clientDualIds = clientDualIds;
        return (await client.signedPost("/api/v1/earn/dual/invests", body)).data;
      },
    },

    {
      name: "pionex_earn_dual_records",
      module: "earn_dual",
      isWrite: false,
      description:
        "Get paginated Dual Investment history for the authenticated user. Requires View permission (API key + secret).",
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
          limit: { type: "integer", description: "Maximum number of records per page (e.g. 20)" },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string;
        const endTime = args.endTime as number;
        const quote = args.quote as string | undefined;
        const currency = args.currency as string | undefined;
        const filter = args.filter as string | undefined;
        const startTime = args.startTime as number | undefined;
        const limit = args.limit as number | undefined;
        const query: Record<string, string> = { base, endTime: String(endTime) };
        if (quote) query.quote = quote;
        if (currency) query.currency = currency;
        if (filter) query.filter = filter;
        if (startTime != null) query.startTime = String(startTime);
        if (limit != null) query.limit = String(limit);
        return (await client.signedGet("/api/v1/earn/dual/records", query)).data;
      },
    },

    // ─── Earn/write endpoints (authentication required) ──────────────────────
    {
      name: "pionex_earn_dual_invest",
      module: "earn_dual",
      isWrite: true,
      description:
        "Create a new Dual Investment order. Requires Earn permission (API key + secret). " +
        "Provide either baseAmount (invest in base currency) or currencyAmount (invest in investment currency), not both. " +
        "profit must be obtained from pionex_earn_dual_prices and passed unchanged — a stale or mismatched value will be rejected. " +
        "Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}, where C=DUAL_BASE, P=DUAL_CURRENCY.",
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
          profit: { type: "string", description: "Yield rate from pionex_earn_dual_prices (e.g. '0.0039'). Must be current — stale values are rejected." },
        },
      },
      async handler(args, { client }) {
        const body: Record<string, unknown> = { base: args.base };
        if (args.productId) body.productId = args.productId;
        if (args.clientDualId) body.clientDualId = args.clientDualId;
        if (args.baseAmount) body.baseAmount = args.baseAmount;
        if (args.currencyAmount) body.currencyAmount = args.currencyAmount;
        if (args.profit) body.profit = args.profit;
        return (await client.signedPost("/api/v1/earn/dual/invest", body)).data;
      },
    },

    {
      name: "pionex_earn_dual_revoke_invest",
      module: "earn_dual",
      isWrite: true,
      description:
        "Revoke a pending Dual Investment order before it is matched. Requires Earn permission (API key + secret). " +
        "Parameters are sent as a JSON request body. Only orders in a pending/unmatched state can be revoked.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "productId", "clientDualId"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualId: { type: "string", description: "Client-assigned dual investment order ID" },
          productId: { type: "string", description: "Product ID of the order to revoke (e.g. BTC-USDXO-260402-68000-P-USDT)" },
        },
      },
      async handler(args, { client }) {
        const body: Record<string, unknown> = {
          base: args.base,
          productId: args.productId,
          clientDualId: args.clientDualId,
        };
        return (await client.signedDelete("/api/v1/earn/dual/invest", body)).data;
      },
    },

    {
      name: "pionex_earn_dual_collect",
      module: "earn_dual",
      isWrite: true,
      description:
        "Collect settled Dual Investment earnings into the user's spot account. Requires Earn permission (API key + secret). " +
        "Only orders in a settled state can be collected.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "clientDualId", "productId"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          clientDualId: { type: "string", description: "Client-assigned dual investment order ID to collect" },
          productId: { type: "string", description: "Product ID (e.g. BTC-USDXO-260402-68000-P-USDT)" },
        },
      },
      async handler(args, { client }) {
        const body: Record<string, unknown> = {
          base: args.base,
          clientDualId: args.clientDualId,
          productId: args.productId,
        };
        return (await client.signedPost("/api/v1/earn/dual/collect", body)).data;
      },
    },
  ];
}
