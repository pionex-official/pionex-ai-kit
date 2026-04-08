# Tasks: Bot Grid Check Params

## Task 1: Add MCP tools to `packages/core/src/tools/bot.ts`

Add `pionex_bot_futures_grid_check_params` and `pionex_bot_spot_grid_check_params` tools to `registerBotTools()`.

**Import additions needed:** `createFuturesGridOrderDataJsonSchema` from futures-grid-create, `createSpotGridOrderDataJsonSchema` from spot-grid-create.

**Placement:** Insert futures_grid check_params after `pionex_bot_futures_grid_cancel`, and spot_grid check_params after `pionex_bot_spot_grid_get_ai_strategy` (before `create`), or at the end of each group — keep logically grouped with their respective grid type.

**Verification:** Tools appear in `registerBotTools()` return array; TypeScript compiles without error.

## Task 2: Add CLI commands to `packages/cli/src/commands/bot.ts`

Add `check_params` subcommand to `buildFuturesGridCommand()` and `buildSpotGridCommand()`.

**Verification:** `node packages/cli/dist/index.js bot futures_grid --help` shows `check_params`; `node packages/cli/dist/index.js bot spot_grid --help` shows `check_params`.

## Task 3: Update `packages/cli/src/completion.ts`

Add `"check_params"` to:
- `COMPLETION_TREE.futures_grid` array
- `COMPLETION_TREE.spot_grid` array

**Verification:** Arrays include `check_params`.

## Task 4: Build

```bash
npm run build
```

**Verification:** Build succeeds with no errors or type errors.

## Task 5: Update manual docs (EN) — `manual/mcp/mcp-guides-bot.md` and `manual/cli/cli-guides-bot.md`

In `manual/mcp/mcp-guides-bot.md`:
- Add `pionex_bot_futures_grid_check_params` row to Futures Grid table
- Add `pionex_bot_spot_grid_check_params` row to Spot Grid table

In `manual/cli/cli-guides-bot.md`:
- Add `bot futures_grid check_params` section under Futures Grid
- Add `bot spot_grid check_params` section under Spot Grid

**Verification:** Docs are consistent with implementation.

## Task 6: Update manual docs (ZH-Hans) — `manual.zh-hans/mcp/mcp-guides-bot.md` and `manual.zh-hans/cli/cli-guides-bot.md`

Same changes as Task 5 but in Simplified Chinese.

**Verification:** Docs are consistent with EN version.

## Task 7: Update manual docs (ZH-Hant) — `manual.zh-hant/mcp/mcp-guides-bot.md` and `manual.zh-hant/cli/cli-guides-bot.md`

Same changes as Task 5 but in Traditional Chinese.

**Verification:** Docs are consistent with EN version.

## Task 8: Update `docs/requirements-overview.md` and `docs/tech-design-overview.md`

- Add iteration entry to `requirements-overview.md`
- Update bot tool list in `tech-design-overview.md`

**Verification:** Docs reflect new tools.
