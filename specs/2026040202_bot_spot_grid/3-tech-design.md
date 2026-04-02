# Tech Design: Bot Spot Grid

## Files Changed

### New: `packages/core/src/schemas/spot-grid-create.ts`

Mirrors pattern from `futures-grid-create.ts`. Exports:

- `CREATE_SPOT_GRID_ORDER_DATA_KEYS` — allowed keys for `buOrderData`
- `parseAndValidateCreateSpotGridBuOrderData(raw)` — validates & strips unknown keys
- `createSpotGridOrderDataJsonSchema` — JSON Schema for MCP `buOrderData`
- `createSpotGridCreateToolInputSchema` — full MCP input schema for create tool

`CreateSpotGridOrderData` required fields (from OpenAPI PR #7):
- `top` (string): grid upper price
- `bottom` (string): grid lower price
- `row` (integer, 2–200): grid levels
- `gridType` (string): `arithmetic` | `geometric`
- `quoteTotalInvestment` (string): quote currency investment

Optional fields:
- `lossStopType`: `price` | `profit_amount` | `profit_ratio`
- `lossStop`, `lossStopDelay`
- `profitStopType`: `price` | `profit_amount` | `profit_ratio`
- `profitStop`, `profitStopDelay`
- `condition`, `conditionDirection`: `"-1"` | `"1"`
- `slippage`
- `closeSellModel`: `NOT_SELL` | `TO_QUOTE` | `TO_USDT`

### Modified: `packages/core/src/tools/bot.ts`

Append 7 new `ToolSpec` entries to `registerBotTools()` return array:

1. **`pionex_bot_spot_grid_get_order`** — signedGet, params: `buOrderId`
2. **`pionex_bot_spot_grid_get_ai_strategy`** — signedGet, params: `base`, `quote`
3. **`pionex_bot_spot_grid_create`** — signedPost, body: `base`, `quote`, `buOrderData`, optional `note`; uses schema validator
4. **`pionex_bot_spot_grid_adjust_params`** — signedPost, body: `buOrderId` + optional `top`, `bottom`, `row`, `quoteInvest`
5. **`pionex_bot_spot_grid_invest_in`** — signedPost, body: `buOrderId`, `quoteInvest`
6. **`pionex_bot_spot_grid_cancel`** — signedPost, body: `buOrderId`, optional `closeSellModel`, `slippage`
7. **`pionex_bot_spot_grid_profit`** — signedPost, body: `buOrderId`, `amount`

## Key Differences from Futures Grid

- No `leverage` or `trend` fields (spot grid, not futures)
- `gridType` (camelCase) instead of `grid_type` (snake_case)
- `quoteTotalInvestment` instead of `quoteInvestment` for create
- `quoteInvest` (not `quoteInvestment`) for adjust/invest_in
- `closeSellModel` default is `NOT_SELL` (futures default is `TO_QUOTE`)
- REST client method: `signedGet` for read endpoints (same as futures)
