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

function parseSmartCopyBuOrderData(raw: Record<string, unknown>): Record<string, unknown> {
  const quoteInvestment = asPositiveDecimalString(raw.quoteInvestment, "buOrderData.quoteInvestment");
  const leverageType = asNonEmptyString(raw.leverageType, "buOrderData.leverageType");
  assertEnum(leverageType, "buOrderData.leverageType", ["follow", "fixed"]);

  if (leverageType === "fixed" && raw.leverage == null) {
    throw new Error('Invalid "buOrderData.leverage": required when leverageType is "fixed".');
  }

  const out: Record<string, unknown> = { quoteInvestment, leverageType };
  if (raw.leverage != null) out.leverage = asPositiveNumber(raw.leverage, "buOrderData.leverage");
  if (raw.maxInvestPerOrder != null) out.maxInvestPerOrder = asPositiveDecimalString(raw.maxInvestPerOrder, "buOrderData.maxInvestPerOrder");
  if (raw.copyMode != null) {
    const copyMode = asNonEmptyString(raw.copyMode, "buOrderData.copyMode");
    assertEnum(copyMode, "buOrderData.copyMode", ["fixed_amount", "fixed_ratio"]);
    out.copyMode = copyMode;
  }
  return out;
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
        "Uses the same buOrderData structure as smart_copy_create. " +
        "On FailedWithData error the response includes min_investment, max_investment. " +
        "Endpoint: POST /api/v1/bot/orders/smartCopy/checkParams",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: {
            type: "object",
            additionalProperties: false,
            required: ["quoteInvestment", "leverageType"],
            properties: {
              quoteInvestment: { type: "string", description: "Investment amount in quote currency." },
              leverageType: { type: "string", enum: ["follow", "fixed"], description: "Follow signal provider's leverage or use fixed value." },
              leverage: { type: "number", description: "Custom leverage (required when leverageType is 'fixed')." },
              maxInvestPerOrder: { type: "string", description: "Maximum investment per replicated order." },
              copyMode: { type: "string", enum: ["fixed_amount", "fixed_ratio"], description: "Copy mode." },
            },
          },
        },
      },
      async handler(args, { client }) {
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const buOrderData = parseSmartCopyBuOrderData(asObject(args.buOrderData, "buOrderData"));
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/checkParams", { base, quote, buOrderData })).data;
      },
    },
    {
      name: "pionex_bot_smart_copy_create",
      module: "bot",
      isWrite: true,
      description:
        "Create a smart copy bot order. " +
        "Required: base, quote, buOrderData (quoteInvestment, leverageType). " +
        "Optional top-level: copyFrom (signal source ID), copyBotOrderId. " +
        "buOrderData optional: leverage (required if leverageType=fixed), maxInvestPerOrder, copyMode.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["base", "quote", "buOrderData"],
        properties: {
          base: { type: "string", description: "Base currency (e.g. BTC)" },
          quote: { type: "string", description: "Quote currency (e.g. USDT)" },
          buOrderData: {
            type: "object",
            additionalProperties: false,
            required: ["quoteInvestment", "leverageType"],
            properties: {
              quoteInvestment: { type: "string", description: "Investment amount in quote currency." },
              leverageType: { type: "string", enum: ["follow", "fixed"], description: "Follow signal provider's leverage or use fixed value." },
              leverage: { type: "number", description: "Custom leverage (required when leverageType is 'fixed')." },
              maxInvestPerOrder: { type: "string", description: "Maximum investment per replicated order." },
              copyMode: { type: "string", enum: ["fixed_amount", "fixed_ratio"], description: "Copy mode." },
            },
          },
          copyFrom: { type: "string", description: "Signal source / trader ID to copy from." },
          copyBotOrderId: { type: "string", description: "Reference bot order ID for copying settings." },
          __dryRun: { type: "boolean", description: "If true, validate and return resolved body without placing an order." },
        },
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot smart_copy create is disabled.");
        }
        const base = asNonEmptyString(args.base, "base");
        const quote = asNonEmptyString(args.quote, "quote");
        const buOrderData = parseSmartCopyBuOrderData(asObject(args.buOrderData, "buOrderData"));

        const body: Record<string, unknown> = { base, quote, buOrderData };
        if (args.copyFrom != null) body.copyFrom = String(args.copyFrom);
        if (args.copyBotOrderId != null) body.copyBotOrderId = String(args.copyBotOrderId);

        if (args.__dryRun === true) {
          return {
            dryRun: true,
            note: "No order was sent. Body matches smartCopy/create request.",
            resolvedBody: body,
          };
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
        required: ["buOrderId"],
        properties: {
          buOrderId: { type: "string", description: "Smart copy bot order ID." },
          closeSellModel: { type: "string", enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"], description: "How to handle the base asset on close." },
        },
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot smart_copy cancel is disabled.");
        }
        const buOrderId = asNonEmptyString(args.buOrderId, "buOrderId");
        const body: Record<string, unknown> = { buOrderId };
        if (args.closeSellModel != null) {
          const closeSellModel = asNonEmptyString(args.closeSellModel, "closeSellModel");
          assertEnum(closeSellModel, "closeSellModel", ["NOT_SELL", "TO_QUOTE", "TO_USDT"]);
          body.closeSellModel = closeSellModel;
        }
        return (await client.signedPost("/api/v1/bot/orders/smartCopy/cancel", body)).data;
      },
    },
    // ── Signal ────────────────────────────────────────────────────────────────
    {
      name: "pionex_bot_signal_add_listener",
      module: "bot",
      isWrite: true,
      description:
        "Subscribe to a signal provider / add a signal listener. " +
        "Endpoint: POST /api/v1/bot/signal/listener",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["signalSourceId"],
        properties: {
          signalSourceId: { type: "string", description: "Signal provider ID to subscribe to." },
          listenMode: { type: "string", description: "Subscription mode." },
        },
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; bot signal add_listener is disabled.");
        }
        const signalSourceId = asNonEmptyString(args.signalSourceId, "signalSourceId");
        const body: Record<string, unknown> = { signalSourceId };
        if (args.listenMode != null) body.listenMode = String(args.listenMode);
        return (await client.signedPost("/api/v1/bot/signal/listener", body)).data;
      },
    },
  ];
}
