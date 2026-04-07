# Tasks: CLI Commander Refactor

## Overview

Refactor `packages/cli/src/index.ts` from a monolithic hand-rolled parser to a commander-based
modular CLI. All tasks operate within `packages/cli/`.

---

## Task 1: Add commander dependency

**File:** `packages/cli/package.json`

Add to `dependencies` (runtime, not devDependencies):
```json
"commander": "^12.0.0"
```

Run `npm install` from repo root to update lockfile.

**Verify:** `node -e "import('commander').then(m => console.log(m.Command.name))"` in cli directory.

---

## Task 2: Create shared helpers (`src/helpers.ts`)

Create `packages/cli/src/helpers.ts` with utilities shared across command modules:
- `resolveConfig(cmd: Command): Config` — calls `loadConfig` using `cmd.optsWithGlobals()`
- `print(data: unknown): void` — writes `JSON.stringify(data, null, 2) + "\n"` to stdout
- `parseJsonFlag(raw: unknown, flagName: string): Record<string, unknown>` — moved from index.ts
- Re-export `version` from package.json via `createRequire`

**Verify:** TypeScript compiles without errors.

---

## Task 3: Create market command (`src/commands/market.ts`)

Implement `buildMarketCommand(): Command` covering all 6 market sub-commands:
- `depth <symbol>` — positional symbol (required), `--limit`
- `trades <symbol>` — positional symbol, `--limit`
- `symbols` — `--symbols`, `--type`
- `tickers` — `--symbol`, `--type`
- `book_tickers` — `--symbol`, `--type`
- `klines` — `--symbol` or positional, `--interval` or positional, `--end-time`, `--limit`

Each action calls `resolveConfig`, creates `PionexRestClient`, calls `runTool`, prints result.

**Verify:** `node dist/index.js market --help` shows all 6 sub-commands after build.

---

## Task 4: Create account command (`src/commands/account.ts`)

Implement `buildAccountCommand(): Command` with one sub-command: `balance`.

**Verify:** `node dist/index.js account balance --help` works.

---

## Task 5: Create orders command (`src/commands/orders.ts`)

Implement `buildOrdersCommand(): Command` covering all 8 orders sub-commands:
- `new` — `--symbol` (req), `--side` (req), `--type` (req), `--client-order-id`, `--size`, `--price`, `--amount`, `--IOC`
- `get` — `--symbol` (req), `--order-id` (req)
- `open` — `--symbol` (req)
- `all` — `--symbol` (req), `--limit`
- `fills` — `--symbol` (req), `--start-time`, `--end-time`
- `fills_by_order_id` — `--symbol` (req), `--order-id` (req)
- `cancel` — `--symbol` (req), `--order-id` (req)
- `cancel_all` — `--symbol` (req)

Write-commands (`new`, `cancel`, `cancel_all`) must respect `--dry-run` from global options.

**Verify:** `node dist/index.js orders new --help` lists all flags.

---

## Task 6: Create bot command (`src/commands/bot.ts`)

Implement `buildBotCommand(): Command` with:

**Flat command:**
- `order_list` — `--status`, `--base`, `--quote`, `--page-token`, `--bu-order-types`

**Nested sub-group `futures_grid`:**
- `get` — `--bu-order-id` (req), `--lang`
- `create` — `--base` (req), `--quote` (req), `--bu-order-data-json` (req), `--copy-from`, `--copy-type`, `--copy-bot-order-id`; calls `parseAndValidateCreateFuturesGridBuOrderData`
- `adjust_params` — `--body-json` (req)
- `reduce` — `--body-json` (req)
- `cancel` — `--bu-order-id` (req), `--close-note`, `--close-sell-model`, `--immediate`, `--close-slippage`

**Nested sub-group `spot_grid`:**
- `get` — `--bu-order-id` (req)
- `get_ai_strategy` — `--base` (req), `--quote` (req)
- `create` — `--base` (req), `--quote` (req), `--bu-order-data-json` (req), `--note`; calls `parseAndValidateCreateSpotGridBuOrderData`
- `adjust_params` — `--bu-order-id` (req), `--top`, `--bottom`, `--row`, `--quote-invest`
- `invest_in` — `--bu-order-id` (req), `--quote-invest` (req)
- `cancel` — `--bu-order-id` (req), `--close-sell-model`, `--slippage`
- `profit` — `--bu-order-id` (req), `--amount` (req)

Write commands respect `--dry-run`.

**Verify:** `node dist/index.js bot futures_grid create --help` and `node dist/index.js bot spot_grid --help` show correct options.

---

## Task 7: Create earn command (`src/commands/earn.ts`)

Implement `buildEarnCommand(): Command` with nested sub-group `dual` containing 11 commands:
- Public: `symbols`, `open_products`, `prices`, `index`, `delivery_prices`
- Auth (read): `balances`, `get_invests`, `records`
- Auth (write): `invest`, `revoke_invest`, `collect`

Map all flags from current index.ts earn section exactly.

**Verify:** `node dist/index.js earn dual --help` lists all 11 commands.

---

## Task 8: Create capabilities command

Add `buildCapabilitiesCommand()` in `src/commands/capabilities.ts`:
- Prints a static JSON object mapping group → command list
- No auth, no network call

**Verify:** `node dist/index.js capabilities` outputs valid JSON with all groups.

---

## Task 9: Create `src/trade.ts`

Assemble the `pionex-trade-cli` program:
- `new Command("pionex-trade-cli").version(version)`
- Global options: `--profile`, `--modules`, `--base-url`, `--read-only`, `--dry-run`
- Add all 6 command modules (market, account, orders, bot, earn, capabilities)

**Verify:** `node dist/index.js --help` shows all groups.

---

## Task 10: Create `src/kit.ts`

Migrate `pionex-ai-kit` program using commander:
- `onboard` command — same interactive flow as current `cmdOnboard()`
- `setup` command — `--mcp` (default: pionex-trade-mcp), `--client` (required); same `runSetup` call
- Version from package.json

**Verify:** Rename test binary or invoke directly; `--help` shows both commands.

---

## Task 11: Rewrite `src/index.ts` as thin dispatcher

```typescript
#!/usr/bin/env node
import { basename } from "node:path";

async function main() {
  const invokedAs = basename(process.argv[1] || "");
  if (invokedAs.includes("pionex-ai-kit")) {
    const { buildKitProgram } = await import("./kit.js");
    await buildKitProgram().parseAsync(process.argv);
  } else {
    const { buildTradeProgram } = await import("./trade.js");
    await buildTradeProgram().parseAsync(process.argv);
  }
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
```

**Verify:** Both binary names still work after `npm run build`.

---

## Task 12: Build and smoke-test

1. Run `npm run build` from repo root — must succeed with zero errors
2. Spot-check commands:
   ```
   node packages/cli/dist/index.js --version
   node packages/cli/dist/index.js market depth BTC_USDT --help
   node packages/cli/dist/index.js bot futures_grid create --help
   node packages/cli/dist/index.js earn dual symbols --help
   node packages/cli/dist/index.js capabilities
   ```
3. Check that unknown command still exits 1 with a helpful error

**Verify:** All 5 spot-checks pass without TypeScript or runtime errors.
