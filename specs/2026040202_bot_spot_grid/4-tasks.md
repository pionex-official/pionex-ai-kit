# Tasks: Bot Spot Grid

## Task 1: Create spot-grid-create schema

**File:** `packages/core/src/schemas/spot-grid-create.ts`

- Export `CREATE_SPOT_GRID_ORDER_DATA_KEYS`
- Export `parseAndValidateCreateSpotGridBuOrderData()`
- Export `createSpotGridOrderDataJsonSchema`
- Export `createSpotGridCreateToolInputSchema`

**Verify:** No TypeScript errors, all required fields validated.

## Task 2: Add 7 spot grid tools to bot.ts

**File:** `packages/core/src/tools/bot.ts`

Add to `registerBotTools()`:
- `pionex_bot_spot_grid_get_order`
- `pionex_bot_spot_grid_get_ai_strategy`
- `pionex_bot_spot_grid_create`
- `pionex_bot_spot_grid_adjust_params`
- `pionex_bot_spot_grid_invest_in`
- `pionex_bot_spot_grid_cancel`
- `pionex_bot_spot_grid_profit`

**Verify:** All write tools throw on `config.readOnly`.

## Task 3: Build

```bash
npm run build
```

**Verify:** Zero TypeScript errors.
