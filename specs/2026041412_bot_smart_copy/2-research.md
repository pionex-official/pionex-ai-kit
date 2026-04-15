# Research: Smart Copy Trading API

**Iteration:** `2026041412_bot_smart_copy`
**Date:** 2026-04-14

## API Reference

Source: `https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml`

### Endpoint: POST /api/v1/bot/orders/smartCopy/create

**Auth:** Required (signed)

**Request body (`CreateSmartCopyRequest`):**

```json
{
  "base": "BTC",
  "quote": "USDT",
  "buOrderData": {
    "quoteInvestment": "100",
    "leverageType": "follow",
    "leverage": 5,
    "maxInvestPerOrder": "50",
    "copyMode": "fixed_amount"
  },
  "copyFrom": "<signalSourceId>",
  "copyBotOrderId": "<optional reference bot ID>"
}
```

**Top-level required:** `base`, `quote`, `buOrderData`
**`buOrderData` required:** `quoteInvestment`, `leverageType`
**`buOrderData` optional:** `leverage` (required if `leverageType="fixed"`), `maxInvestPerOrder`, `copyMode`
**Top-level optional:** `copyFrom`, `copyBotOrderId`

### Endpoint: GET /api/v1/bot/orders/smartCopy/order

**Auth:** Required (signed)

**Query params:**
- `buOrderId` (string, required) — smart copy bot order ID

### Endpoint: POST /api/v1/bot/orders/smartCopy/cancel

**Auth:** Required (signed)

**Request body:**
```json
{
  "buOrderId": "<id>",
  "closeSellModel": "NOT_SELL"
}
```

- `buOrderId` (string, required)
- `closeSellModel` (string, optional): `"NOT_SELL"` | `"TO_QUOTE"` | `"TO_USDT"`

### Endpoint: POST /api/v1/bot/orders/smartCopy/checkParams

**Auth:** Required (signed)

**Request body:** Same shape as `create` — `base`, `quote`, `buOrderData` (validates without creating)

**Error pattern:** On `FailedWithData` error, response may include `min_investment`, `max_investment` (same pattern as futures/spot grid check_params)

### Endpoint: POST /api/v1/bot/signal/listener

**Auth:** Required (signed)

**Request body:**
```json
{
  "signalSourceId": "<trader/signal-provider-id>",
  "listenMode": "..."
}
```

- `signalSourceId` (string, required) — signal provider / trader ID
- `listenMode` (string, optional) — subscription mode

## Comparison with Existing Patterns

### Similarities with spot_grid

- `buOrderData` nested object with required fields
- Same `base`, `quote`, `buOrderId` naming convention
- Same `closeSellModel` options for cancel (`NOT_SELL`, `TO_QUOTE`, `TO_USDT`)
- `checkParams` follows identical validate-before-create pattern
- `--dry-run` support for write operations

### Differences from spot_grid / futures_grid

- No `top`/`bottom`/`row` fields — smart copy doesn't need a grid range
- New fields: `leverageType`, `maxInvestPerOrder`, `copyMode`, `copyFrom`
- Signal listener is a separate resource (`/bot/signal/listener`), not under `/bot/orders/`
- No `adjust_params`, `invest_in`, `profit` operations (simpler lifecycle)

## Implementation Strategy

### No new schema file needed

The `buOrderData` for smart copy is simpler than futures/spot grid — no need for a separate JSON schema file in `packages/core/src/schemas/`. Inline validation in the handler (same pattern as `pionex_bot_futures_grid_cancel`) is sufficient.

### Tool placement

All 5 tools go into the existing `packages/core/src/tools/bot.ts` file — consistent with how futures_grid and spot_grid tools coexist. No new file needed.

### CLI command structure

```
bot
  smart_copy
    get
    create
    cancel
    check_params
  signal
    add_listener
```

`signal` is placed as a peer of `smart_copy` under `bot` rather than nested under `smart_copy`, because:
1. The API path is `/bot/signal/listener` — separate resource from `/bot/orders/smartCopy/`
2. Signals may apply to other bot types in future
3. Mirrors how `order_list` is a peer of `futures_grid`/`spot_grid`

### Completion tree update

```typescript
bot: ["order_list", "futures_grid", "spot_grid", "smart_copy", "signal"],
smart_copy: ["get", "create", "cancel", "check_params"],
signal: ["add_listener"],
```

The fish completion script also needs `smart_copy` and `signal` as new condition groups.
