# Tasks: Bot Futures Grid Order List

## Task 1 — Add MCP tool to bot.ts

**File:** `packages/core/src/tools/bot.ts`
**Change:** Add `pionex_bot_futures_grid_order_list` tool spec inside `registerBotTools()` return array
**Verify:** Tool appears in the array; handler calls `client.signedGet("/api/v1/bot/orders", q)`

## Task 2 — Add CLI command to index.ts

**File:** `packages/cli/src/index.ts`
**Change:**
- Add `if (command === "list") { ... }` block inside `if (group === "bot")`
- Update the `throw new Error(...)` at the end of the bot block to mention `list`
- Add `list` example to `printPionexHelp()`

**Verify:** `pionex-trade-cli bot futures_grid list --help` or invalid command shows correct error with `list` listed

## Task 3 — Update English manual (MCP + CLI)

**Files:**
- `manual/mcp/mcp-guides-bot.md` — add row to tool table
- `manual/cli/cli-guides-bot.md` — add `list` command section

## Task 4 — Update zh-hans manual (MCP + CLI)

**Files:**
- `manual.zh-hans/mcp/mcp-guides-bot.md`
- `manual.zh-hans/cli/cli-guides-bot.md`

## Task 5 — Update zh-hant manual (MCP + CLI)

**Files:**
- `manual.zh-hant/mcp/mcp-guides-bot.md`
- `manual.zh-hant/cli/cli-guides-bot.md`

## Task 6 — Update docs/ overview files

**Files:**
- `docs/requirements-overview.md` — add iteration entry for bot order list
- `docs/tech-memory-overview.md` — add iteration entry

## Task 7 — Build and verify

```bash
cd /Users/liyifan/project/mcp/pionex-ai-kit && npm run build
```

Confirm build succeeds with no TypeScript errors.
