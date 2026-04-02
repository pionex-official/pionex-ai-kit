# Review: Bot Spot Grid

## Delivery Summary

All acceptance criteria from `1-requirements.md` met.

### Tasks Completed

| Task | Status |
|------|--------|
| Task 1: `spot-grid-create.ts` schema | Done |
| Task 2: 7 spot grid tools in `bot.ts` | Done |
| Task 3: Build | Done |
| CLI routing (`packages/cli/src/index.ts`) | Done (added in follow-up; spec originally omitted CLI layer) |
| Core exports (`packages/core/src/index.ts`) | Done (exported spot-grid-create validators) |

### Files Changed

| File | Change |
|------|--------|
| `packages/core/src/schemas/spot-grid-create.ts` | New — schema, validator, exported constants |
| `packages/core/src/tools/bot.ts` | Added 7 `pionex_bot_spot_grid_*` tool specs |
| `packages/core/src/index.ts` | Exported `parseAndValidateCreateSpotGridBuOrderData` and related |
| `packages/cli/src/index.ts` | Added `spot_grid` CLI route (7 commands); fixed futures_grid guard |

### Documentation Updated

| File | Change |
|------|--------|
| `manual/cli/cli-guides-bot.md` | Added Spot Grid section (7 commands) |
| `manual/mcp/mcp-guides-bot.md` | Added Spot Grid tools table |
| `manual/skills/skills-guides-bot.md` | Added Spot Grid skill section with behavioral constraints |
| `README.md` | Added Bot / Spot Grid row to features table |
| `packages/cli/README.md` | Added `spot_grid` to Commands list |
| `packages/mcp/README.md` | Added Spot Grid tools to Tools list |

## Key Design Decisions

1. **Schema mirrors futures-grid pattern** — same structure (`CREATE_SPOT_GRID_ORDER_DATA_KEYS`, `parseAndValidate*`, JSON Schema), strict `additionalProperties: false`.

2. **Naming differences from futures grid** — `gridType` (camelCase) vs `grid_type`, `quoteTotalInvestment` vs `quoteInvestment`, no `leverage`/`trend`, default `closeSellModel` is `NOT_SELL`.

3. **CLI uses individual flags for adjust_params** — unlike futures grid which uses `--body-json`, spot grid adjust_params takes `--top`, `--bottom`, `--row`, `--quote-invest` as individual flags for a better UX.

4. **`get_ai_strategy` is unique to spot grid** — no equivalent in futures grid; skill guide recommends calling it before creating a new bot.

## What Was Not Done

- No E2E tests (bot operations require live API credentials; out of scope for this iteration).
- `pionex-bot` skill package (`pionex-skills` repo) not updated — that is a separate repository.
