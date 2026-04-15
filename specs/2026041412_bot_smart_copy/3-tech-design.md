# Technical Design: Smart Copy Trading

**Iteration:** `2026041412_bot_smart_copy`
**Date:** 2026-04-14

## Overview

Add 5 MCP tools and corresponding CLI commands for Pionex Smart Copy Trading. All code changes are additive — no existing files are modified except to add new content.

## Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/tools/bot.ts` | Add 5 new `ToolSpec` objects in `registerBotTools()` |
| `packages/cli/src/commands/bot.ts` | Add `buildSmartCopyCommand()` and `buildSignalCommand()` functions; wire into `buildBotCommand()` |
| `packages/cli/src/completion.ts` | Update `COMPLETION_TREE` with `smart_copy` and `signal` groups |
| `manual/mcp/mcp-guides-bot.md` | Add Smart Copy section to tool reference table |
| `manual/cli/cli-guides-bot.md` | Add `bot smart_copy` command docs |
| `manual/skills/skills-guides-bot.md` | Add smart copy behavioral constraints + example flow |
| `manual.zh-hans/mcp/mcp-guides-bot.md` | Same in Simplified Chinese |
| `manual.zh-hans/cli/cli-guides-bot.md` | Same in Simplified Chinese |
| `manual.zh-hans/skills/skills-guides-bot.md` | Same in Simplified Chinese |
| `manual.zh-hant/mcp/mcp-guides-bot.md` | Same in Traditional Chinese |
| `manual.zh-hant/cli/cli-guides-bot.md` | Same in Traditional Chinese |
| `manual.zh-hant/skills/skills-guides-bot.md` | Same in Traditional Chinese |
| `docs/requirements-overview.md` | Append Smart Copy iteration entry |
| `docs/tech-design-overview.md` | Update bot module tool list |
| `docs/tech-memory-overview.md` | Append iteration decisions |

## 1. Core Tools (`packages/core/src/tools/bot.ts`)

### Tool 1: `pionex_bot_smart_copy_get_order`

```typescript
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
}
```

### Tool 2: `pionex_bot_smart_copy_check_params`

```typescript
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
      base: { type: "string" },
      quote: { type: "string" },
      buOrderData: {
        type: "object",
        additionalProperties: false,
        required: ["quoteInvestment", "leverageType"],
        properties: {
          quoteInvestment: { type: "string" },
          leverageType: { type: "string", enum: ["follow", "fixed"] },
          leverage: { type: "number" },
          maxInvestPerOrder: { type: "string" },
          copyMode: { type: "string", enum: ["fixed_amount", "fixed_ratio"] },
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
}
```

### Tool 3: `pionex_bot_smart_copy_create`

```typescript
{
  name: "pionex_bot_smart_copy_create",
  module: "bot",
  isWrite: true,
  description:
    "Create a smart copy bot order. " +
    "Required: base, quote, buOrderData (quoteInvestment, leverageType). " +
    "Optional: copyFrom (signal source ID), copyBotOrderId. " +
    "buOrderData optional: leverage (required if leverageType=fixed), maxInvestPerOrder, copyMode.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["base", "quote", "buOrderData"],
    properties: {
      base: { type: "string" },
      quote: { type: "string" },
      buOrderData: {
        type: "object",
        additionalProperties: false,
        required: ["quoteInvestment", "leverageType"],
        properties: {
          quoteInvestment: { type: "string" },
          leverageType: { type: "string", enum: ["follow", "fixed"] },
          leverage: { type: "number" },
          maxInvestPerOrder: { type: "string" },
          copyMode: { type: "string", enum: ["fixed_amount", "fixed_ratio"] },
        },
      },
      copyFrom: { type: "string" },
      copyBotOrderId: { type: "string" },
      __dryRun: { type: "boolean" },
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
      return { dryRun: true, note: "No order was sent.", resolvedBody: body };
    }
    return (await client.signedPost("/api/v1/bot/orders/smartCopy/create", body)).data;
  },
}
```

### Tool 4: `pionex_bot_smart_copy_cancel`

```typescript
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
      buOrderId: { type: "string" },
      closeSellModel: { type: "string", enum: ["NOT_SELL", "TO_QUOTE", "TO_USDT"] },
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
}
```

### Tool 5: `pionex_bot_signal_add_listener`

```typescript
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
      signalSourceId: { type: "string", description: "Signal provider ID." },
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
}
```

### Helper: `parseSmartCopyBuOrderData`

Add a local helper function above the tool definitions:

```typescript
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
```

## 2. CLI Commands (`packages/cli/src/commands/bot.ts`)

### New function: `buildSmartCopyCommand()`

```typescript
function buildSmartCopyCommand(): Command {
  const sc = new Command("smart_copy").description("Smart Copy bot sub-commands (requires auth)");

  sc.command("get")
    .description("Get a Smart Copy bot order by ID")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .action(async (opts, cmd) => { ... });

  sc.command("create")
    .description("Create a Smart Copy bot\n  Example: ...")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--quote <quote>", "Quote asset")
    .requiredOption("--bu-order-data-json <json>", "JSON with quoteInvestment and leverageType")
    .option("--copy-from <id>", "Signal source / trader ID to copy from")
    .option("--copy-bot-order-id <id>", "Reference bot order ID")
    .action(async (opts, cmd) => { ... });

  sc.command("check_params")
    .description("Validate Smart Copy parameters before creating")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--quote <quote>", "Quote asset")
    .requiredOption("--bu-order-data-json <json>", "JSON with quoteInvestment and leverageType")
    .action(async (opts, cmd) => { ... });

  sc.command("cancel")
    .description("Cancel a Smart Copy bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .option("--close-sell-model <model>", "Sell model: NOT_SELL | TO_QUOTE | TO_USDT")
    .action(async (opts, cmd) => { ... });

  return sc;
}
```

### New function: `buildSignalCommand()`

```typescript
function buildSignalCommand(): Command {
  const sig = new Command("signal").description("Signal provider sub-commands (requires auth)");

  sig.command("add_listener")
    .description("Subscribe to a signal provider")
    .requiredOption("--signal-source-id <id>", "Signal provider ID")
    .option("--listen-mode <mode>", "Subscription mode")
    .action(async (opts, cmd) => { ... });

  return sig;
}
```

### Wire into `buildBotCommand()`

```typescript
// Append after existing addCommand calls:
bot.addCommand(buildSmartCopyCommand());
bot.addCommand(buildSignalCommand());
```

## 3. Completion Tree (`packages/cli/src/completion.ts`)

```typescript
export const COMPLETION_TREE = {
  groups:       ["market", "account", "orders", "bot", "earn", "capabilities"],
  // ...existing entries...
  bot:          ["order_list", "futures_grid", "spot_grid", "smart_copy", "signal"],
  // ...existing entries...
  smart_copy:   ["get", "create", "cancel", "check_params"],
  signal:       ["add_listener"],
} as const;
```

Also update `initCompletion()`:
```typescript
completion.on("smart_copy", ({ reply }) => reply(T.smart_copy));
completion.on("signal",     ({ reply }) => reply(T.signal));
```

And update `generateFishCompletion()`:
- Add `smart_copy` to bot sub-command exclusion condition
- Add fish completions for `smart_copy` and `signal` sub-commands

## 4. Manual Documentation Structure

### English (`manual/`)

**mcp-guides-bot.md** — add section:
```markdown
### Smart Copy (API Key Required)
| Tool | Description |
| `pionex_bot_smart_copy_get_order` | ... |
| `pionex_bot_smart_copy_create` | ... |
| `pionex_bot_smart_copy_cancel` | ... |
| `pionex_bot_smart_copy_check_params` | ... |
| `pionex_bot_signal_add_listener` | ... |
```

**cli-guides-bot.md** — add `### Smart Copy (Auth Required)` section with all commands

**skills-guides-bot.md** — add `### pionex-bot: Smart Copy Bot` section with:
- Command reference table
- `buOrderData` parameters
- Behavioral constraints (7 items matching futures/spot pattern)
- Example flow: "Copy a signal provider's trades"

### Chinese variants

Same structure translated to Simplified Chinese (zh-hans) and Traditional Chinese (zh-hant).

## Validation Logic

`parseSmartCopyBuOrderData` enforces:
1. `quoteInvestment` must be a positive decimal string
2. `leverageType` must be `"follow"` or `"fixed"`
3. When `leverageType === "fixed"`, `leverage` is required (positive number)
4. `maxInvestPerOrder` must be positive decimal string if provided
5. `copyMode` must be `"fixed_amount"` or `"fixed_ratio"` if provided

## Read-only Mode

Tools `smart_copy_create`, `smart_copy_cancel`, `signal_add_listener` all check `config.readOnly` and throw early.

`smart_copy_get_order` and `smart_copy_check_params` are read-only (`isWrite: false`) — no readOnly guard needed.
