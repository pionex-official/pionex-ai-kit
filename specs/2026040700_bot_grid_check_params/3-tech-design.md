# Technical Design: Bot Grid Check Params

## Overview

Add two read-only MCP tools and two CLI subcommands that call the new Pionex check params endpoints. These endpoints share the same request structure as `create`, so we reuse existing schemas and validators.

## Affected Files

| File | Change |
|------|--------|
| `packages/core/src/tools/bot.ts` | Add `pionex_bot_futures_grid_check_params` and `pionex_bot_spot_grid_check_params` tools |
| `packages/cli/src/commands/bot.ts` | Add `check_params` subcommands under `futures_grid` and `spot_grid` |
| `packages/cli/src/completion.ts` | Add `check_params` to `COMPLETION_TREE.futures_grid` and `COMPLETION_TREE.spot_grid` |
| `manual/mcp/mcp-guides-bot.md` | Add check_params tool entries (EN) |
| `manual/cli/cli-guides-bot.md` | Add check_params command docs (EN) |
| `manual.zh-hans/mcp/mcp-guides-bot.md` | Add check_params tool entries (ZH-Hans) |
| `manual.zh-hans/cli/cli-guides-bot.md` | Add check_params command docs (ZH-Hans) |
| `manual.zh-hant/mcp/mcp-guides-bot.md` | Add check_params tool entries (ZH-Hant) |
| `manual.zh-hant/cli/cli-guides-bot.md` | Add check_params command docs (ZH-Hant) |
| `docs/requirements-overview.md` | Add iteration entry |
| `docs/tech-design-overview.md` | Update tool list |

## Tool Design: `pionex_bot_futures_grid_check_params`

```typescript
{
  name: "pionex_bot_futures_grid_check_params",
  module: "bot",
  isWrite: false,  // validation only, no order created
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
}
```

## Tool Design: `pionex_bot_spot_grid_check_params`

```typescript
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
}
```

## CLI Design

Both check_params commands use the same `--base`, `--quote`, `--bu-order-data-json` flags as `create`. No `--dry-run` needed (it's a validation-only call).

```typescript
// In buildFuturesGridCommand():
fg.command("check_params")
  .description("Validate Futures Grid bot parameters before creating an order")
  .requiredOption("--base <base>", "Base asset (e.g. BTC)")
  .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
  .requiredOption("--bu-order-data-json <json>", "JSON object with grid parameters")
  .action(async (opts, cmd) => {
    const buOrderDataRaw = parseJsonFlag(opts.buOrderDataJson, "bu-order-data-json");
    const buOrderData = parseAndValidateCreateFuturesGridBuOrderData(buOrderDataRaw);
    const run = makeRunner(cmd);
    const out = await run("pionex_bot_futures_grid_check_params", { base: opts.base, quote: opts.quote, buOrderData });
    print(out.data);
  });
```

## Completion Tree Update

```typescript
// COMPLETION_TREE.futures_grid: add "check_params"
futures_grid: ["get", "create", "adjust_params", "reduce", "cancel", "check_params"],

// COMPLETION_TREE.spot_grid: add "check_params"
spot_grid: ["get", "get_ai_strategy", "create", "adjust_params", "invest_in", "cancel", "profit", "check_params"],
```

## Schema Reuse

- `createFuturesGridOrderDataJsonSchema` (from `schemas/futures-grid-create.ts`) — reused as-is
- `createSpotGridOrderDataJsonSchema` (from `schemas/spot-grid-create.ts`) — reused as-is
- `parseAndValidateCreateFuturesGridBuOrderData` — reused as-is
- `parseAndValidateCreateSpotGridBuOrderData` — reused as-is

No new schema files needed.
