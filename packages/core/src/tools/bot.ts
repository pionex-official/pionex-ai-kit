import type { ToolSpec } from "./types.js";
import {
  createFuturesGridCreateToolInputSchema,
  parseAndValidateCreateFuturesGridBuOrderData,
} from "../schemas/futures-grid-create.js";
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
          adjustParamsSence: { type: "string" },
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
        if (args.adjustParamsSence != null) body.adjustParamsSence = String(args.adjustParamsSence);
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
      name: "pionex_bot_order_list",
      module: "bot",
      isWrite: false,
      description:
        "List bot orders with optional filters and pagination. " +
        "status: 'running' (default) or 'canceled'. " +
        "buOrderTypes: one or more of futures_grid, spot_grid, smart_copy. " +
        "Endpoint: GET /api/v1/bot/orders",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: {
            type: "string",
            enum: ["running", "canceled"],
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
  ];
}
