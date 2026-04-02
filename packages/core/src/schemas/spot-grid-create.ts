/**
 * Mirrors openapi_bot.yaml — CreateSpotGridRequest + CreateSpotGridOrderData.
 * https://github.com/pionex-official/pionex-open-api/pull/7
 */
import type { JsonSchema } from "../tools/types.js";

/** Every property under CreateSpotGridOrderData (OpenAPI); no other keys allowed. */
export const CREATE_SPOT_GRID_ORDER_DATA_KEYS = [
  "top",
  "bottom",
  "row",
  "gridType",
  "quoteTotalInvestment",
  "lossStopType",
  "lossStop",
  "lossStopDelay",
  "profitStopType",
  "profitStop",
  "profitStopDelay",
  "condition",
  "conditionDirection",
  "slippage",
  "closeSellModel",
] as const;

const ORDER_DATA_KEY_SET = new Set<string>(CREATE_SPOT_GRID_ORDER_DATA_KEYS);

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

function asNonNegativeInteger(value: unknown, field: string): number {
  const n = asFiniteNumber(value, field);
  if (n < 0 || !Number.isInteger(n)) {
    throw new Error(`Invalid "${field}": expected non-negative integer.`);
  }
  return n;
}

function assertEnum(value: string, field: string, allowed: readonly string[]): void {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid "${field}": expected one of ${allowed.join(", ")}.`);
  }
}

function asPositiveDecimalStringLoose(value: unknown, field: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const s = value.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid "${field}": expected positive decimal string.`);
  }
  return s;
}

function asOptionalString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid "${field}": expected string.`);
  }
  return value;
}

/** Strip + reject unknown keys; validate types per OpenAPI. Returns body-ready buOrderData. */
export function parseAndValidateCreateSpotGridBuOrderData(raw: Record<string, unknown>): Record<string, unknown> {
  const data = { ...raw };

  for (const k of Object.keys(data)) {
    if (!ORDER_DATA_KEY_SET.has(k)) {
      throw new Error(`Unknown buOrderData property "${k}". Allowed keys: ${CREATE_SPOT_GRID_ORDER_DATA_KEYS.join(", ")}.`);
    }
  }

  const top = asPositiveDecimalStringLoose(data.top, "buOrderData.top");
  const bottom = asPositiveDecimalStringLoose(data.bottom, "buOrderData.bottom");
  if (Number(top) <= Number(bottom)) {
    throw new Error('Invalid "buOrderData.top": expected top > bottom.');
  }
  const row = asPositiveInteger(data.row, "buOrderData.row");
  if (row < 2 || row > 200) {
    throw new Error('Invalid "buOrderData.row": expected integer between 2 and 200.');
  }
  const gridType = asNonEmptyString(data.gridType, "buOrderData.gridType");
  assertEnum(gridType, "buOrderData.gridType", ["arithmetic", "geometric"]);
  const quoteTotalInvestment = asPositiveDecimalStringLoose(data.quoteTotalInvestment, "buOrderData.quoteTotalInvestment");

  const out: Record<string, unknown> = {
    top,
    bottom,
    row,
    gridType,
    quoteTotalInvestment,
  };

  if (data.lossStopType != null) {
    const v = asNonEmptyString(data.lossStopType, "buOrderData.lossStopType");
    assertEnum(v, "buOrderData.lossStopType", ["price", "profit_amount", "profit_ratio"]);
    out.lossStopType = v;
  }
  if (data.lossStop != null) out.lossStop = asOptionalString(data.lossStop, "buOrderData.lossStop");
  if (data.lossStopDelay != null) out.lossStopDelay = asNonNegativeInteger(data.lossStopDelay, "buOrderData.lossStopDelay");
  if (data.profitStopType != null) {
    const v = asNonEmptyString(data.profitStopType, "buOrderData.profitStopType");
    assertEnum(v, "buOrderData.profitStopType", ["price", "profit_amount", "profit_ratio"]);
    out.profitStopType = v;
  }
  if (data.profitStop != null) out.profitStop = asOptionalString(data.profitStop, "buOrderData.profitStop");
  if (data.profitStopDelay != null) out.profitStopDelay = asNonNegativeInteger(data.profitStopDelay, "buOrderData.profitStopDelay");
  if (data.condition != null) out.condition = asOptionalString(data.condition, "buOrderData.condition");
  if (data.conditionDirection != null) {
    const v = asNonEmptyString(data.conditionDirection, "buOrderData.conditionDirection");
    assertEnum(v, "buOrderData.conditionDirection", ["-1", "1"]);
    out.conditionDirection = v;
  }
  if (data.slippage != null) out.slippage = asOptionalString(data.slippage, "buOrderData.slippage");
  if (data.closeSellModel != null) {
    const v = asNonEmptyString(data.closeSellModel, "buOrderData.closeSellModel");
    assertEnum(v, "buOrderData.closeSellModel", ["NOT_SELL", "TO_QUOTE", "TO_USDT"]);
    out.closeSellModel = v;
  }

  return out;
}

/** JSON Schema for MCP tool `buOrderData` — matches openapi_bot.yaml CreateSpotGridOrderData.properties */
export const createSpotGridOrderDataJsonSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  description: "CreateSpotGridOrderData (openapi_bot.yaml PR #7). Required: top, bottom, row, gridType, quoteTotalInvestment.",
  required: ["top", "bottom", "row", "gridType", "quoteTotalInvestment"],
  properties: {
    top: { type: "string", description: "Grid upper price" },
    bottom: { type: "string", description: "Grid lower price" },
    row: { type: "number", description: "Number of grid levels (2–200)" },
    gridType: {
      type: "string",
      enum: ["arithmetic", "geometric"],
      description: "Grid spacing: arithmetic (equal difference) or geometric (equal ratio)",
    },
    quoteTotalInvestment: { type: "string", description: "Total quote currency investment amount" },
    lossStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio"],
      description: "Stop loss type",
    },
    lossStop: { type: "string", description: "Stop loss threshold value" },
    lossStopDelay: { type: "number", description: "Seconds before executing stop loss (0=immediate)" },
    profitStopType: {
      type: "string",
      enum: ["price", "profit_amount", "profit_ratio"],
      description: "Take profit type",
    },
    profitStop: { type: "string", description: "Take profit threshold value" },
    profitStopDelay: { type: "number", description: "Seconds before executing take profit (0=immediate)" },
    condition: { type: "string", description: "Trigger price for conditional start" },
    conditionDirection: {
      type: "string",
      enum: ["-1", "1"],
      description: 'Trigger direction: "-1" drop below, "1" rise above',
    },
    slippage: { type: "string", description: "Slippage tolerance e.g. 0.01 = 1%" },
    closeSellModel: {
      type: "string",
      enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"],
      description: "Close sell model (default: NOT_SELL)",
    },
  },
};

/** Full MCP input schema for pionex_bot_spot_grid_create. */
export const createSpotGridCreateToolInputSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["base", "quote", "buOrderData"],
  properties: {
    base: { type: "string", description: "Base currency (e.g. BTC)" },
    quote: { type: "string", description: "Quote currency (e.g. USDT)" },
    note: { type: "string", description: "Optional order note" },
    buOrderData: createSpotGridOrderDataJsonSchema,
    __dryRun: { type: "boolean", description: "Internal: when true, return resolved body without POST" },
  },
};
