/**
 * Mirrors openapi_bot.yaml — CreateFuturesGridRequest + CreateFuturesGridOrderData.
 * https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml
 */
import type { JsonSchema } from "../tools/types.js";

/** Every property under CreateFuturesGridOrderData (OpenAPI); no other keys allowed. */
export const CREATE_FUTURES_GRID_ORDER_DATA_KEYS = [
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
  "enableFollowClosed",
] as const;

const ORDER_DATA_KEY_SET = new Set<string>(CREATE_FUTURES_GRID_ORDER_DATA_KEYS);

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

function asPositiveDecimalStringLoose(value: unknown, field: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  return asPositiveDecimalString(value, field);
}

function asNonNegativeDecimalString(value: unknown, field: string): string {
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

function asOptionalString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid "${field}": expected string.`);
  }
  return value;
}

function asOptionalNonNegativeNumber(value: unknown, field: string): number {
  const n = asFiniteNumber(value, field);
  if (n < 0) throw new Error(`Invalid "${field}": expected number >= 0.`);
  return n;
}

/** Strip + reject unknown keys; validate types per OpenAPI. Returns body-ready buOrderData. */
export function parseAndValidateCreateFuturesGridBuOrderData(raw: Record<string, unknown>): Record<string, unknown> {
  const data = { ...raw };
  delete data.openPrice;
  delete data.keyId;
  delete data.key_id;

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

  const out: Record<string, unknown> = {
    top,
    bottom,
    row,
    grid_type: gridType,
    trend,
    leverage,
    quoteInvestment,
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

/** JSON Schema for MCP tool `buOrderData` — matches openapi_bot.yaml CreateFuturesGridOrderData.properties */
export const createFuturesGridOrderDataJsonSchema: JsonSchema = {
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
      description: "Grid spacing: arithmetic (equal difference) or geometric (equal ratio)",
    },
    trend: {
      type: "string",
      enum: ["long", "short", "no_trend"],
      description: "Grid direction",
    },
    leverage: { type: "number", description: "Leverage multiplier" },
    extraMargin: { type: "string", description: "Extra margin amount (optional)" },
    quoteInvestment: { type: "string", description: "Investment amount" },
    condition: { type: "string", description: "Trigger price (conditional orders)" },
    conditionDirection: { type: "string", enum: ["-1", "1"], description: "Trigger direction" },
    lossStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio", "price_limit"],
      description: "Stop loss type",
    },
    lossStop: { type: "string", description: "Stop loss value" },
    lossStopDelay: { type: "number", description: "Stop loss delay (seconds)" },
    profitStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio", "price_limit"],
      description: "Take profit type",
    },
    profitStop: { type: "string", description: "Take profit value" },
    profitStopDelay: { type: "number", description: "Take profit delay (seconds)" },
    lossStopHigh: { type: "string", description: "Upper stop loss price for neutral grid" },
    shareRatio: { type: "string", description: "Profit sharing ratio" },
    investCoin: { type: "string", description: "Investment currency" },
    investmentFrom: {
      type: "string",
      enum: ["USER", "LOCK_ACTIVITY", "FUTURE_GRID_BONUS"],
      description: "Funding source",
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
      description: "Category type",
    },
    movingTop: { type: "string", description: "Moving grid upper limit" },
    movingBottom: { type: "string", description: "Moving grid lower limit" },
    enableFollowClosed: { type: "boolean", description: "Follow close" },
  },
};

/** Full MCP input schema for pionex_bot_futures_grid_create (includes internal __dryRun for CLI). */
export const createFuturesGridCreateToolInputSchema: JsonSchema = {
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
    __dryRun: { type: "boolean", description: "Internal: when true, return resolved body without POST" },
  },
};
