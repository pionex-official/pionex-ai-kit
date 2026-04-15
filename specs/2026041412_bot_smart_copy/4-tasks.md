# Task List: Smart Copy Trading

**Iteration:** `2026041412_bot_smart_copy`
**Date:** 2026-04-14

---

## Task 1: Add MCP Tools to Core

**File:** `packages/core/src/tools/bot.ts`
**Type:** Code — add new `ToolSpec` objects

**Steps:**
1. Add `parseSmartCopyBuOrderData()` helper function after `asPositiveDecimalString` and before `normalizePerpBase`
2. Add 5 tools to `registerBotTools()` return array (after existing spot_grid tools):
   - `pionex_bot_smart_copy_get_order`
   - `pionex_bot_smart_copy_check_params`
   - `pionex_bot_smart_copy_create`
   - `pionex_bot_smart_copy_cancel`
   - `pionex_bot_signal_listener`

**Verify:** `npm run build` succeeds; no TypeScript errors

---

## Task 2: Add CLI Commands

**File:** `packages/cli/src/commands/bot.ts`
**Type:** Code — add new command builder functions

**Steps:**
1. Add import for `parseJsonFlag`, `isDryRun`, `makeRunner`, `print` (already imported)
2. Add `buildSmartCopyCommand()` function (4 sub-commands: `get`, `create`, `check_params`, `cancel`)
3. Add `buildSignalCommand()` function (1 sub-command: `listener`)
4. Wire both into `buildBotCommand()` via `bot.addCommand(...)`

**Verify:** 
```bash
node packages/cli/dist/index.js bot smart_copy --help
node packages/cli/dist/index.js bot signal --help
```

---

## Task 3: Update Tab Completion

**File:** `packages/cli/src/completion.ts`
**Type:** Code — update `COMPLETION_TREE` and completion handlers

**Steps:**
1. Add `smart_copy` and `signal` to `bot` array in `COMPLETION_TREE`
2. Add `smart_copy: ["get", "create", "cancel", "check_params"]` entry
3. Add `signal: ["listener"]` entry
4. Add `completion.on("smart_copy", ...)` and `completion.on("signal", ...)` in `initCompletion()`
5. Update `generateFishCompletion()`:
   - Update bot sub-command exclusion condition to include `smart_copy signal`
   - Add fish completion lines for `smart_copy` and `signal` sub-commands

**Verify:** Build succeeds; fish script generates correct lines:
```bash
node packages/cli/dist/index.js setup-completion-fish | grep smart_copy
node packages/cli/dist/index.js setup-completion-fish | grep signal
```

---

## Task 4: Update English Manual — MCP Guide

**File:** `manual/mcp/mcp-guides-bot.md`
**Type:** Docs

**Steps:**
Add new `### Smart Copy (API Key Required)` section after Spot Grid section:

```markdown
### Smart Copy (API Key Required)

| Tool | Description |
| ---- | ----------- |
| `pionex_bot_smart_copy_get_order` | Get a smart copy bot order by buOrderId |
| `pionex_bot_smart_copy_create` | Create a smart copy bot order |
| `pionex_bot_smart_copy_cancel` | Cancel and close a smart copy bot order |
| `pionex_bot_smart_copy_check_params` | Validate smart copy parameters before creating an order |
| `pionex_bot_signal_listener` | Subscribe to a signal provider |
```

---

## Task 5: Update English Manual — CLI Guide

**File:** `manual/cli/cli-guides-bot.md`
**Type:** Docs

**Steps:**
Add `### Smart Copy (Auth Required)` section after Spot Grid section, documenting:
- `bot smart_copy get`
- `bot smart_copy create` (with buOrderData parameter table)
- `bot smart_copy check_params`
- `bot smart_copy cancel`
- `bot signal listener`

---

## Task 6: Update English Manual — Skills Guide

**File:** `manual/skills/skills-guides-bot.md`
**Type:** Docs

**Steps:**
Add `### pionex-bot: Smart Copy Bot` section after Spot Grid Bot section, containing:
- Command reference table
- `buOrderData` create parameters
- Behavioral constraints (7 items)
- Example flow: subscribing to a signal provider and creating a smart copy bot

---

## Task 7: Update Simplified Chinese Manual

**Files:** 
- `manual.zh-hans/mcp/mcp-guides-bot.md`
- `manual.zh-hans/cli/cli-guides-bot.md`
- `manual.zh-hans/skills/skills-guides-bot.md`
**Type:** Docs

**Steps:** Translate and add same content as Tasks 4–6 in Simplified Chinese

---

## Task 8: Update Traditional Chinese Manual

**Files:**
- `manual.zh-hant/mcp/mcp-guides-bot.md`
- `manual.zh-hant/cli/cli-guides-bot.md`
- `manual.zh-hant/skills/skills-guides-bot.md`
**Type:** Docs

**Steps:** Translate and add same content as Tasks 4–6 in Traditional Chinese

---

## Task 9: Update docs/ Summary Documents

**Files:**
- `docs/requirements-overview.md`
- `docs/tech-design-overview.md`
- `docs/tech-memory-overview.md`
**Type:** Docs

**Steps:**

**requirements-overview.md:** Add iteration entry under "Iteration History":
```
#### 10. Smart Copy Trading (iteration `2026041412_bot_smart_copy`)
**Status:** Completed
**Description:** Full CLI and MCP support for smart copy trading...
```

**tech-design-overview.md:** Update bot module tool list to include the 5 new tools.

**tech-memory-overview.md:** Append `## Iteration 2026041412: Smart Copy Trading` section with key decisions.

---

## Task 10: Build and Verify

**Type:** Verification

**Steps:**
1. `npm run build` — must succeed with zero TypeScript errors
2. Verify MCP tools registered:
   ```bash
   node packages/cli/dist/index.js capabilities | grep smart_copy
   node packages/cli/dist/index.js capabilities | grep signal
   ```
3. Verify CLI help works:
   ```bash
   node packages/cli/dist/index.js bot smart_copy --help
   node packages/cli/dist/index.js bot smart_copy create --help
   node packages/cli/dist/index.js bot signal listener --help
   ```
4. Verify fish completion lines generated correctly:
   ```bash
   node packages/cli/dist/index.js setup-completion-fish | grep -E "smart_copy|signal"
   ```
5. Confirm all 9 manual files contain new smart copy content

---

## Definition of Done

- [ ] All 5 MCP tools added and build passes
- [ ] All CLI commands added and help text renders correctly
- [ ] Completion tree updated (bash/zsh + fish)
- [ ] All 9 manual files updated (3 languages × 3 files)
- [ ] `docs/` summary documents updated (3 files)
- [ ] `npm run build` succeeds with zero errors
