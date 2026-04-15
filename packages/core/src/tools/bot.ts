import type { ToolSpec } from "./types.js";
import {
  createFuturesGridCreateToolInputSchema,
  createFuturesGridOrderDataJsonSchema,
  parseAndValidateCreateFuturesGridBuOrderData,
} from "../schemas/futures-grid-create.js";
import {
  createSpotGridCreateToolInputSchema,
  createSpotGridOrderDataJsonSchema,
  parseAndValidateCreateSpotGridBuOrderData,
} from "../schemas/spot-grid-create.js";
import type { QueryParams } from "../client/types.js";

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected non-empty string.`);
  }
  return value.trim();
}

function asFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid "${field}": expected finite number.`);
  }
  return value;
}

function asPositiveNumber(value: unknown, field: string): number {
  const n = asFiniteNumber(value, field);
  if (n <= 0) throw new Error(`Invalid "${field}": expected number > 0.`);
  return n;
}

function asPositiveInteger(value: unknown, field: string): number {
  const n = asPositiveNumber(value, field);
  if (!Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected positive integer.`);
  }
  return n;
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid "${field}": expected boolean.`);
  }
  return value;
}

function assertEnum(value: string, field: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid "${field}": expected JSON object.`);
  }
  return value as Record<string, unknown>;
}

function asPositiveDecimalString(value: unknown, field: string): string {
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

function normalizePerpBase(base: string): string {
  return base.endsWith(".PERP") ? base : `${base}.PERP`;
}


export function registerBotTools(): ToolSpec[] {
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
          lang: { type: "string", description: "Optional language code." },
        },
        required: ["buOrderId"],
      },
      async handler(args, { client }) {
        const buOrderId = String(args.buOrderId);
        const q: QueryParams = { buOrderId };
        if (args.lang != null) q.lang = String(args.lang);
        return (await client.signedGet("/api/v1/bot/orders/futuresGrid/order", q)).data;
      },
    },
    {
      name: "pionex_bot_futures_grid_create",
      module: "bot",
      isWrite: true,
      description:
        "Create a futures grid order (openapi_bot.yaml CreateFuturesGridRequest / CreateFuturesGridOrderData). " +
        "https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml — " +
        "Required: base, quote, buOrderData. Optional: copyFrom, copyType, copyBotOrderId. " +
        "buOrderData required: top, bottom, row, grid_type, trend, leverage, quoteInvestment; unknown keys rejected.",
      inputSchema: createFuturesGridCreateToolInputSchema,
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid create is disabled.");
        }
        const rawBase = asNonEmptyString(args.base, "base");
        const base = normalizePerpBase(rawBase);
        const quote = asNonEmptyString(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateFuturesGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        const row = buOrderDataOut.row as number;
        const gridType = buOrderDataOut.grid_type as string;
        const leverage = buOrderDataOut.leverage as number;

        const body: Record<string, unknown> = {
          base,
          quote,
          buOrderData: buOrderDataOut,
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
              leverage,
            },
            resolvedBody: body,
          };
        }
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/create", body)).data;
      },
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
          adjustParamsScene: { type: "string" },
        },
        required: ["buOrderId", "type", "extraMargin"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid adjust_params is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const type = asNonEmptyString(args.type, "type");
        assertEnum(type, "type", ["invest_in", "adjust_params", "invest_in_trigger"]);
        const extraMargin = asBoolean(args.extraMargin, "extraMargin");

        if (type === "invest_in" && args.quoteInvestment != null) {
          asPositiveNumber(args.quoteInvestment, "quoteInvestment");
        }
        if (type === "adjust_params") {
          const bottom = asPositiveDecimalString(args.bottom, "bottom");
          const top = asPositiveDecimalString(args.top, "top");
          if (Number(top) <= Number(bottom)) {
            throw new Error('Invalid "top": expected top > bottom.');
          }
          asPositiveInteger(args.row, "row");
        }
        if (type === "invest_in_trigger") {
          asPositiveDecimalString(args.condition, "condition");
          const conditionDirection = asNonEmptyString(args.conditionDirection, "conditionDirection");
          assertEnum(conditionDirection, "conditionDirection", ["1", "-1"]);
        }

        const body: Record<string, unknown> = {
          buOrderId,
          type,
          extraMargin,
        };
        if (args.quoteInvestment != null) body.quoteInvestment = asFiniteNumber(args.quoteInvestment, "quoteInvestment");
        if (args.bottom != null) body.bottom = asPositiveDecimalString(args.bottom, "bottom");
        if (args.top != null) body.top = asPositiveDecimalString(args.top, "top");
        if (args.row != null) body.row = asPositiveInteger(args.row, "row");
        if (args.extraMarginAmount != null) body.extraMarginAmount = asFiniteNumber(args.extraMarginAmount, "extraMarginAmount");
        if (args.isRecommend != null) body.isRecommend = asBoolean(args.isRecommend, "isRecommend");
        if (args.isReinvest != null) body.isReinvest = asBoolean(args.isReinvest, "isReinvest");
        if (args.investCoin != null) body.investCoin = String(args.investCoin);
        if (args.investmentFrom != null) {
          const investmentFrom = asNonEmptyString(args.investmentFrom, "investmentFrom");
          assertEnum(investmentFrom, "investmentFrom", ["USER", "LOCK_ACTIVITY"]);
          body.investmentFrom = investmentFrom;
        }
        if (args.condition != null) body.condition = asPositiveDecimalString(args.condition, "condition");
        if (args.conditionDirection != null) {
          const conditionDirection = asNonEmptyString(args.conditionDirection, "conditionDirection");
          assertEnum(conditionDirection, "conditionDirection", ["1", "-1"]);
          body.conditionDirection = conditionDirection;
        }
        if (args.slippage != null) body.slippage = String(args.slippage);
        if (args.adjustParamsScene != null) body.adjustParamsScene = String(args.adjustParamsScene);
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/adjustParams", body)).data;
      },
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
          conditionDirection: { type: "string", enum: ["1", "-1"] },
        },
        required: ["buOrderId", "reduceNum"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid reduce is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const reduceNum = asPositiveInteger(args.reduceNum, "reduceNum");
        const body: Record<string, unknown> = {
          buOrderId,
          reduceNum,
        };
        if (args.slippage != null) body.slippage = String(args.slippage);
        if (args.condition != null) body.condition = String(args.condition);
        if (args.conditionDirection != null) {
          const conditionDirection = asNonEmptyString(args.conditionDirection, "conditionDirection");
          assertEnum(conditionDirection, "conditionDirection", ["1", "-1"]);
          body.conditionDirection = conditionDirection;
        }
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/reduce", body)).data;
      },
    },
    {
      name: "pionex_bot_futures_grid_check_params",
      module: "bot",
      isWrite: false,
      description:
        "Validate futures grid bot parameters before creating an order. " +
        "Uses the same buOrderData structure as futures_grid_create. " +
        "On FailedWithData error the response includes min_investment, max_investment, slippage. " +
        "Endpoint: POST /api/v1/bot/orders/futuresGrid/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC); *.PERP normalized in handler" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: createFuturesGridOrderDataJsonSchema,
        },
      },
      async handler(args, { client }) {
        const base = normalizePerpBase(asNonEmptyString(args.base, "base"));
        const quote = asNonEmptyString(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateFuturesGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/checkParams", { base, quote, buOrderData: buOrderDataOut })).data;
      },
    },
    {
      name: "pionex_bot_order_list",
      module: "bot",
      isWrite: false,
      description:
        "List bot orders with optional filters and pagination. " +
        "status: 'running' (default) or 'finished'. " +
        "buOrderTypes: one or more of futures_grid, spot_grid, smart_copy. " +
        "Endpoint: GET /api/v1/bot/orders",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: {
            type: "string",
            enum: ["running", "finished"],
            description: "Filter by order status. Default: 'running'.",
          },
          base: { type: "string", description: "Base currency filter (e.g. BTC)." },
          quote: { type: "string", description: "Quote currency filter (e.g. USDT)." },
          pageToken: { type: "string", description: "Pagination token from a previous response." },
          buOrderTypes: {
            type: "array",
            items: { type: "string", enum: ["futures_grid", "spot_grid", "smart_copy"] },
            description: "Bot type filter: futures_grid, spot_grid, smart_copy. Omit to return all types.",
          },
        },
        required: [],
      },
      async handler(args, { client }) {
        const q: QueryParams = {};
        if (args.status != null) q.status = String(args.status);
        if (args.base != null) q.base = String(args.base);
        if (args.quote != null) q.quote = String(args.quote);
        if (args.pageToken != null) q.pageToken = String(args.pageToken);
        if (Array.isArray(args.buOrderTypes) && (args.buOrderTypes as string[]).length > 0) {
          q.buOrderTypes = (args.buOrderTypes as string[]).join(",");
        }
        return (await client.signedGet("/api/v1/bot/orders", q)).data;
      },
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
          closeSlippage: { type: "string" },
        },
        required: ["buOrderId"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot futures_grid cancel is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const body: Record<string, unknown> = { buOrderId };
        if (args.closeNote != null) body.closeNote = String(args.closeNote);
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString(args.closeSellModel, "closeSellModel");
          assertEnum(closeSellModel, "closeSellModel", ["TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        if (args.immediate != null) body.immediate = asBoolean(args.immediate, "immediate");
        if (args.closeSlippage != null) body.closeSlippage = String(args.closeSlippage);
        return (await client.signedPost("/api/v1/bot/orders/futuresGrid/cancel", body)).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_get_order",
      module: "bot",
      isWrite: false,
      description: "Get one spot grid bot order by buOrderId.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string", description: "Spot grid bot order id." },
        },
        required: ["buOrderId"],
      },
      async handler(args, { client }) {
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const q: QueryParams = { buOrderId };
        return (await client.signedGet("/api/v1/bot/orders/spotGrid/order", q)).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_get_ai_strategy",
      module: "bot",
      isWrite: false,
      description: "Retrieve AI-recommended spot grid strategy parameters for a trading pair.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
        },
        required: ["base", "quote"],
      },
      async handler(args, { client }) {
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        return (await client.signedGet("/api/v1/bot/orders/spotGrid/aiStrategy", { base, quote })).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_check_params",
      module: "bot",
      isWrite: false,
      description:
        "Validate spot grid bot parameters before creating an order. " +
        "Uses the same buOrderData structure as spot_grid_create. " +
        "On FailedWithData error the response includes min_investment, max_investment, slippage. " +
        "Endpoint: POST /api/v1/bot/orders/spotGrid/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: createSpotGridOrderDataJsonSchema,
        },
      },
      async handler(args, { client }) {
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateSpotGridBuOrderData(asObject(args.buOrderData, "buOrderData"));
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/checkParams", { base, quote, buOrderData: buOrderDataOut })).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_create",
      module: "bot",
      isWrite: true,
      description:
        "Create a spot grid bot order (openapi_bot.yaml CreateSpotGridRequest / CreateSpotGridOrderData). " +
        "Required: base, quote, buOrderData. Optional: note. " +
        "buOrderData required: top, bottom, row, gridType, quoteTotalInvestment; unknown keys rejected.",
      inputSchema: createSpotGridCreateToolInputSchema,
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid create is disabled.");
        }
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const buOrderDataOut = parseAndValidateCreateSpotGridBuOrderData(asObject(args.buOrderData, "buOrderData"));

        const body: Record<string, unknown> = { base, quote, buOrderData: buOrderDataOut };
        if (args.note != null) body.note = String(args.note);

        if (args.__dryRun === true) {
          return {
            dryRun: true,
            note: "No order was sent. Body matches openapi_bot.yaml CreateSpotGridRequest.",
            resolvedBody: body,
          };
        }
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/create", body)).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_adjust_params",
      module: "bot",
      isWrite: true,
      description: "Adjust spot grid bot range or investment parameters.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          top: { type: "string", description: "New upper price" },
          bottom: { type: "string", description: "New lower price" },
          row: { type: "number", description: "New number of grid levels" },
          quoteInvest: { type: "string", description: "Additional quote investment amount" },
        },
        required: ["buOrderId"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid adjust_params is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const body: Record<string, unknown> = { buOrderId };
        if (args.top != null) body.top = asPositiveDecimalString(args.top, "top");
        if (args.bottom != null) body.bottom = asPositiveDecimalString(args.bottom, "bottom");
        if (args.row != null) body.row = asPositiveInteger(args.row, "row");
        if (args.quoteInvest != null) body.quoteInvest = asPositiveDecimalString(args.quoteInvest, "quoteInvest");
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/adjustParams", body)).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_invest_in",
      module: "bot",
      isWrite: true,
      description: "Add additional quote investment to a running spot grid bot.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          quoteInvest: { type: "string", description: "Quote amount to invest" },
        },
        required: ["buOrderId", "quoteInvest"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid invest_in is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const quoteInvest = asPositiveDecimalString(args.quoteInvest, "quoteInvest");
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/investIn", { buOrderId, quoteInvest })).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_cancel",
      module: "bot",
      isWrite: true,
      description: "Cancel and close a spot grid bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          closeSellModel: { type: "string", enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"] },
          slippage: { type: "string" },
        },
        required: ["buOrderId"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid cancel is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const body: Record<string, unknown> = { buOrderId };
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString(args.closeSellModel, "closeSellModel");
          assertEnum(closeSellModel, "closeSellModel", ["NOT_SELL", "TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        if (args.slippage != null) body.slippage = String(args.slippage);
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/cancel", body)).data;
      },
    },
    {
      name: "pionex_bot_spot_grid_profit",
      module: "bot",
      isWrite: true,
      description: "Extract accumulated grid profit from a spot grid bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string" },
          amount: { type: "string", description: "Amount of profit to extract" },
        },
        required: ["buOrderId", "amount"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot spot_grid profit is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const amount = asPositiveDecimalString(args.amount, "amount");
        return (await client.signedPost("/api/v1/bot/orders/spotGrid/profit", { buOrderId, amount })).data;
      },
    },
    // ── Smart Copy ────────────────────────────────────────────────────────────
    {
      name: "pionex_bot_smart_copy_get_order",
      module: "bot",
      isWrite: false,
      description: "Get one smart copy bot order by buOrderId.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          buOrderId: { type: "string", description: "Smart copy bot order ID." },
        },
        required: ["buOrderId"],
      },
      async handler(args, { client }) {
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        return (await client.signedGet("/api/v1/bot/orders/smartCopy/order", { buOrderId })).data;
      },
    },
    {
      name: "pionex_bot_smart_copy_check_params",
      module: "bot",
      isWrite: false,
      description:
        "Validate smart copy bot parameters before creating an order. " +
        "Pass quote_investment='0' to get the allowed range only (no investment estimate). " +
        "Returns max_investment, max_leverage, available_limit (and notional_limit when invest>0). " +
        "Endpoint: POST /api/v1/bot/orders/smartCopy/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "leverage", "quote_investment"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          leverage: { type: "integer", description: "Leverage multiplier (e.g. 2)" },
          quote_investment: { type: "string", description: "Investment amount in quote currency; use '0' to get range only" },
          signal_type: { type: "string", description: "Optional; signal provider UUID to scope the check" },
          signal_param: { type: "string", description: "Optional; signal parameters as a JSON string" },
        },
      },
      async handler(args, { client }) {
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const leverage = asPositiveInteger(args.leverage, "leverage");
        const quote_investment = asNonEmptyString(args.quote_investment, "quote_investment");
        const body: Record<string, unknown> = { base, quote, leverage, quote_investment };
        if (args.signal_type != null) body.signal_type = String(args.signal_type);
        if (args.signal_param != null) body.signal_param = String(args.signal_param);
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/checkParams", body)).data;
      },
    },
    {
      name: "pionex_bot_smart_copy_create",
      module: "bot",
      isWrite: true,
      description:
        "Create a smart copy bot order. " +
        "Required: base, quote, bu_order_data.quote_total_investment, bu_order_data.portfolio " +
        "(each portfolio item needs base, signal_type, leverage). " +
        "Returns buOrderId on success. " +
        "Endpoint: POST /api/v1/bot/orders/smartCopy/create",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "bu_order_data"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          bu_order_data: {
            type: "object",
            additionalProperties: false,
            required: ["quote_total_investment", "portfolio"],
            properties: {
              quote_total_investment: { type: "string", description: "Total investment in quote currency" },
              portfolio: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["base", "signal_type", "leverage"],
                  properties: {
                    base: { type: "string", description: "Base currency for this signal" },
                    signal_type: { type: "string", description: "Signal provider UUID" },
                    leverage: { type: "integer", description: "Leverage multiplier" },
                    percent: { type: "string", description: "Allocation fraction of total investment (e.g. '1' for 100%)" },
                    signal_param: { type: "string", description: "Signal parameters as a JSON string" },
                    profit_stop_ratio: { type: "string", description: "Take-profit ratio" },
                    loss_stop_ratio: { type: "string", description: "Stop-loss ratio" },
                  },
                },
                description: "Portfolio of signals to copy",
              },
              compound: { type: "boolean", description: "Enable compound reinvestment" },
              profit_stop_maker: { type: "boolean", description: "Enable profit stop maker" },
            },
          },
          key_id: { type: "string", description: "Optional key ID" },
          note: { type: "string", description: "Optional note" },
          copy_from: { type: "string", description: "Source bot order ID to copy settings from" },
          copy_type: { type: "string", description: "Copy type" },
          __dryRun: { type: "boolean", description: "If true, return resolved body without placing an order." },
        },
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot smart_copy create is disabled.");
        }
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const rawBuOrderData = asObject(args.bu_order_data, "bu_order_data");
        const quote_total_investment = asNonEmptyString(rawBuOrderData.quote_total_investment, "bu_order_data.quote_total_investment");

        if (!Array.isArray(rawBuOrderData.portfolio) || (rawBuOrderData.portfolio as unknown[]).length === 0) {
          throw new Error('Invalid "bu_order_data.portfolio": expected non-empty array.');
        }
        const portfolio = (rawBuOrderData.portfolio as Record<string, unknown>[]).map((item, i) => {
          const p: Record<string, unknown> = {
            base: asNonEmptyString(item.base, `portfolio[${i}].base`),
            signal_type: asNonEmptyString(item.signal_type, `portfolio[${i}].signal_type`),
            leverage: asPositiveInteger(item.leverage, `portfolio[${i}].leverage`),
          };
          if (item.percent != null) p.percent = asNonEmptyString(item.percent, `portfolio[${i}].percent`);
          if (item.signal_param != null) p.signal_param = String(item.signal_param);
          if (item.profit_stop_ratio != null) p.profit_stop_ratio = String(item.profit_stop_ratio);
          if (item.loss_stop_ratio != null) p.loss_stop_ratio = String(item.loss_stop_ratio);
          return p;
        });

        const buOrderData: Record<string, unknown> = { quote_total_investment, portfolio };
        if (rawBuOrderData.compound != null) buOrderData.compound = asBoolean(rawBuOrderData.compound, "bu_order_data.compound");
        if (rawBuOrderData.profit_stop_maker != null) buOrderData.profit_stop_maker = asBoolean(rawBuOrderData.profit_stop_maker, "bu_order_data.profit_stop_maker");

        const body: Record<string, unknown> = { base, quote, bu_order_data: buOrderData };
        if (args.key_id != null) body.key_id = String(args.key_id);
        if (args.note != null) body.note = String(args.note);
        if (args.copy_from != null) body.copy_from = String(args.copy_from);
        if (args.copy_type != null) body.copy_type = String(args.copy_type);

        if (args.__dryRun === true) {
          return { dryRun: true, note: "No order was sent.", resolvedBody: body };
        }
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/create", body)).data;
      },
    },
    {
      name: "pionex_bot_smart_copy_cancel",
      module: "bot",
      isWrite: true,
      description: "Cancel and close a smart copy bot order.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["bu_order_id"],
        properties: {
          bu_order_id: { type: "string", description: "Smart copy bot order ID." },
          close_note: { type: "string", description: "Optional close note." },
          convert_into_earn_coin: { type: "boolean", description: "Whether to convert remaining funds into earn coin." },
        },
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot smart_copy cancel is disabled.");
        }
        const bu_order_id = asNonEmptyString(args.bu_order_id, "bu_order_id");
        const body: Record<string, unknown> = { bu_order_id };
        if (args.close_note != null) body.close_note = String(args.close_note);
        if (args.convert_into_earn_coin != null) body.convert_into_earn_coin = asBoolean(args.convert_into_earn_coin, "convert_into_earn_coin");
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/cancel", body)).data;
      },
    },
    // ── Signal ────────────────────────────────────────────────────────────────
    {
      name: "pionex_bot_signal_listener",
      module: "bot",
      isWrite: true,
      description:
        "Push a trading signal to the Pionex signal platform (signal provider use). " +
        "The platform forwards the signal to all smart copy bots subscribed to the given signalType. " +
        "Use action='buy' to open a position and action='sell' to close it. " +
        "Endpoint: POST /api/v1/bot/signal/listener",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["signalType", "signalParam", "base", "quote", "time", "price", "data"],
        properties: {
          signalType: { type: "string", description: "Signal provider UUID." },
          signalParam: { type: "string", description: "Signal parameters as a JSON string (use '{}' for no extra params)." },
          base: { type: "string", description: "Base currency (e.g. BTC)." },
          quote: { type: "string", description: "Quote currency (e.g. USDT)." },
          time: { type: "string", description: "Signal timestamp in RFC 3339 format (e.g. '2024-01-01T12:00:00Z')." },
          price: { type: "string", description: "Current price at time of signal (e.g. '85000')." },
          data: {
            type: "object",
            additionalProperties: false,
            required: ["action", "position_size", "contracts"],
            properties: {
              action: { type: "string", enum: ["buy", "sell"], description: "'buy' to open a position, 'sell' to close." },
              position_size: { type: "string", description: "Target position size as a fraction (e.g. '1' = 100%)." },
              contracts: { type: "string", description: "Number of contracts." },
              direction: { type: "string", description: "Optional trade direction." },
            },
          },
        },
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot signal listener is disabled.");
        }
        const signalType = asNonEmptyString(args.signalType, "signalType");
        const signalParam = asNonEmptyString(args.signalParam, "signalParam");
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const time = asNonEmptyString(args.time, "time");
        const price = asNonEmptyString(args.price, "price");
        const rawData = asObject(args.data, "data");
        const action = asNonEmptyString(rawData.action, "data.action");
        assertEnum(action, "data.action", ["buy", "sell"]);
        const position_size = asNonEmptyString(rawData.position_size, "data.position_size");
        const contracts = asNonEmptyString(rawData.contracts, "data.contracts");
        const data: Record<string, unknown> = { action, position_size, contracts };
        if (rawData.direction != null) data.direction = String(rawData.direction);
        return (await client.signedPost("/api/v1/bot/signal/listener", { signalType, signalParam, base, quote, time, price, data })).data;
      },
    },
  ];
}
