# Requirements: Smart Copy Trading Support

**Iteration:** `2026041412_bot_smart_copy`
**Date:** 2026-04-14
**Branch:** `35-feature-request-mcpcli-skills-for-smart-copy-trading-smart_copy`

## Background

Pionex has released new Smart Copy Trading API endpoints in `openapi_bot.yaml`. This iteration adds full CLI and MCP support for these endpoints, enabling AI agents and CLI users to create, monitor, and cancel copy trading bots, validate parameters before committing, and subscribe to signal providers.

## New API Endpoints

From `pionex-open-api` (reference: `openapi_bot.yaml`):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/bot/orders/smartCopy/create` | Create a smart copy bot order |
| `GET`  | `/api/v1/bot/orders/smartCopy/order` | Get a smart copy bot order |
| `POST` | `/api/v1/bot/orders/smartCopy/cancel` | Cancel a smart copy bot order |
| `POST` | `/api/v1/bot/orders/smartCopy/checkParams` | Validate smart copy parameters |
| `POST` | `/api/v1/bot/signal/listener` | Subscribe to a signal provider |

## Functional Requirements

### FR-1: MCP Tools (core + mcp)

Add 5 new MCP tools to the `bot` module in `packages/core/src/tools/bot.ts`:

| Tool Name | Endpoint | isWrite |
|-----------|----------|---------|
| `pionex_bot_smart_copy_create` | POST /api/v1/bot/orders/smartCopy/create | true |
| `pionex_bot_smart_copy_get_order` | GET /api/v1/bot/orders/smartCopy/order | false |
| `pionex_bot_smart_copy_cancel` | POST /api/v1/bot/orders/smartCopy/cancel | true |
| `pionex_bot_smart_copy_check_params` | POST /api/v1/bot/orders/smartCopy/checkParams | false |
| `pionex_bot_signal_add_listener` | POST /api/v1/bot/signal/listener | true |

### FR-2: CLI Commands (cli)

Add `bot smart_copy` sub-command group to `packages/cli/src/commands/bot.ts`:

```
pionex-trade-cli bot smart_copy create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--dry-run]
pionex-trade-cli bot smart_copy get --bu-order-id <id>
pionex-trade-cli bot smart_copy cancel --bu-order-id <id> [--close-sell-model ...] [--dry-run]
pionex-trade-cli bot smart_copy check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'
pionex-trade-cli bot signal add_listener --body-json '<JSON>'
```

### FR-3: Tab Completion

Update `COMPLETION_TREE` in `packages/cli/src/completion.ts`:
- Add `smart_copy` to `bot` group
- Add `smart_copy` sub-commands: `get`, `create`, `cancel`, `check_params`
- Add `signal` group to `bot` sub-commands
- Add `signal` sub-commands: `add_listener`

### FR-4: Documentation — Manual (English + zh-hans + zh-hant)

Update the following files with smart copy sections:

**English (`manual/`):**
- `mcp/mcp-guides-bot.md` — add Smart Copy tool table
- `cli/cli-guides-bot.md` — add `bot smart_copy` command docs
- `skills/skills-guides-bot.md` — add smart copy behavioral constraints + flow example

**Simplified Chinese (`manual.zh-hans/`):**
- `mcp/mcp-guides-bot.md`
- `cli/cli-guides-bot.md`
- `skills/skills-guides-bot.md`

**Traditional Chinese (`manual.zh-hant/`):**
- `mcp/mcp-guides-bot.md`
- `cli/cli-guides-bot.md`
- `skills/skills-guides-bot.md`

### FR-5: docs/ Summary Updates

- `docs/requirements-overview.md` — add Smart Copy entry
- `docs/tech-design-overview.md` — update tool file index and bot module section
- `docs/tech-memory-overview.md` — append iteration decisions

## Smart Copy `buOrderData` Parameters

Based on `openapi_bot.yaml` smart copy spec:

### Create (`buOrderData` required fields)

| Field | Type | Description |
|-------|------|-------------|
| `quoteInvestment` | string | Investment amount in quote currency |
| `leverageType` | string | `"follow"` (follow signal provider's leverage) or `"fixed"` |

### Create (`buOrderData` optional fields)

| Field | Type | Description |
|-------|------|-------------|
| `leverage` | number | Custom leverage (required when `leverageType = "fixed"`) |
| `maxInvestPerOrder` | string | Maximum investment per replicated order |
| `copyMode` | string | `"fixed_amount"` or `"fixed_ratio"` |

### Create (top-level optional fields)

| Field | Type | Description |
|-------|------|-------------|
| `copyFrom` | string | Signal source / trader ID to copy from |
| `copyBotOrderId` | string | Reference bot order ID for copying settings |

### Cancel fields

| Field | Type | Description |
|-------|------|-------------|
| `buOrderId` | string | **Required** — smart copy bot order ID |
| `closeSellModel` | string | Optional: `"NOT_SELL"`, `"TO_QUOTE"`, `"TO_USDT"` |

### signal/listener fields

| Field | Type | Description |
|-------|------|-------------|
| `signalSourceId` | string | **Required** — signal provider ID |
| `listenMode` | string | Subscription mode |

## Acceptance Criteria

1. All 5 MCP tools are callable and return valid responses from Pionex API
2. All CLI commands produce correct JSON output
3. `check_params` validates before create (consistent with futures/spot grid pattern)
4. Write commands support `--dry-run`
5. Tab completion includes `smart_copy` and `signal` sub-commands
6. All 9 manual files (3 languages × 3 files) updated with smart copy content
7. `docs/` summary documents updated
8. Build succeeds: `npm run build`
