# Requirements Overview

This document summarizes the requirement history and current status of the Pionex AI Kit project.

## Current Status

**Last Updated:** 2026-04-02

### Core Features

#### 1. MCP Server (`@pionex/pionex-trade-mcp`)
**Status:** Completed
**Description:** Provides an MCP protocol server that exposes Pionex trading APIs as MCP tools for AI clients

**Tool Modules:**
- ✅ Market module (public market data, no authentication required)
  - depth, trades, symbol_info, tickers, book_tickers, klines
- ✅ Account module (account balance, authentication required)
  - get_balance
- ✅ Orders module (spot orders, authentication required)
  - new_order, get_order, cancel_order, get_fills, get_fills_by_order_id, etc.
- ✅ Bot module (futures grid bot, authentication required)
  - futures_grid_create, futures_grid_get_order, adjust_params, reduce, cancel
  - order_list (cross-type: futures_grid / spot_grid / smart_copy)

#### 2. CLI Tool (`@pionex/pionex-ai-kit`)
**Status:** Completed
**Description:** Provides command-line tools for configuration and trading operations

**Features:**
- ✅ `onboard` command: Interactive configuration wizard that generates `~/.pionex/config.toml`
- ✅ `setup` command: Writes configuration files for different MCP clients
  - Supported: cursor, claude-desktop, claude-code, windsurf, vscode, openclaw
- ✅ Direct trading commands (via `pionex-trade-cli` alias)
  - market, account, orders, bot subcommands

#### 3. Core Library (`@pionex-ai/core`)
**Status:** Completed
**Description:** Private shared library bundled into CLI and MCP packages

**Provides:**
- ✅ `PionexRestClient`: REST API wrapper with signature authentication
- ✅ Tool system: Modular tool registration and execution
- ✅ Configuration management: TOML config read/write
- ✅ JSON Schema validation (futures grid parameters)

### Security Requirements

- ✅ API keys stored in `~/.pionex/config.toml`, not written to MCP client configs
- ✅ Credential priority: Environment variables > TOML config file
- ✅ MCP server launched via `npx`, keys not exposed in client configuration

## Iteration History

### 2026-03-18: CLI & Skills Support
**Iteration Directory:** `specs/iterations/20260318_cli_skills/`
**Requirements:** Add CLI subcommand support and Skills integration

**See:** `specs/iterations/20260318_cli_skills/PRD.md`

#### 5. Earn Dual Investment Module (`@pionex-ai/core` + CLI + MCP)
**Status:** Planning (iteration `2026040100_earn_dual`)
**Description:** Adds Dual Investment (双币理财) support — 11 new tools covering product discovery, investment lifecycle, and earnings collection.

**Tool Modules:**
- `earn_dual` module (new):
  - Public: symbols, open_products, prices, index, delivery_prices
  - Enable reading (auth): balances, get_invests, records
  - Earn/Write (auth): invest, revoke_invest, collect

**CLI:** `pionex-trade-cli earn dual <command>`

#### 7. Bot Futures Grid Order List (`pionex_bot_futures_grid_order_list`)
**Status:** Completed (iteration `2026040200_bot_order_list`)
**Description:** Adds `order_list` tool to the bot module. Lists futures grid bot orders with filtering and pagination via `GET /api/v1/bot/orders`.

**New Tool:**
- `pionex_bot_order_list` — list bot orders (cross-type: futures_grid / spot_grid / smart_copy) with optional base/quote/pageToken/buOrderTypes filters

**CLI:** `pionex-trade-cli bot order_list`

#### 6. CLI Version Flag (`pionex-ai-kit -v` / `pionex-trade-cli -v`)
**Status:** Planning (iteration `2026040202_cli_version`)
**Description:** Add `-v`/`--version` flag to both CLI entry points so users can quickly verify the installed version. Also fixes the hardcoded `v0.2.x` banner in the `onboard` command.

#### 8. CLI Commander Refactor
**Status:** Planning (iteration `2026040400_cli_commander_refactor`)
**Description:** Replace the hand-rolled argument parsing in `packages/cli/src/index.ts` with the
[commander](https://www.npmjs.com/package/commander) library. Zero breaking changes — all command
names and flags remain identical. Also addresses
[#32](https://github.com/pionex-official/pionex-ai-kit/issues/32) by adding rich `--help` output
and a `capabilities` discovery command.

**Changes:**
- `packages/cli/src/index.ts` becomes a thin dispatcher (~20 lines)
- New files: `src/kit.ts`, `src/trade.ts`, `src/commands/{market,account,orders,bot,earn,capabilities}.ts`
- `commander` added as runtime dependency
- New command: `pionex-trade-cli capabilities` (JSON listing of all groups/commands)

#### 9. Bot Grid Check Params
**Status:** Completed (iteration `2026040700_bot_grid_check_params`)
**Reference:** https://github.com/pionex-official/pionex-open-api/pull/13
**Description:** Exposes the new Pionex parameter validation endpoints for futures grid and spot grid bots. Allows AI agents and CLI users to pre-validate order parameters without committing to an order. On `FailedWithData` errors, the response includes `min_investment`, `max_investment`, and `slippage` for user guidance.

**New Tools:**
- `pionex_bot_futures_grid_check_params` — `POST /api/v1/bot/orders/futuresGrid/checkParams`
- `pionex_bot_spot_grid_check_params` — `POST /api/v1/bot/orders/spotGrid/checkParams`

**New CLI Commands:**
- `pionex-trade-cli bot futures_grid check_params`
- `pionex-trade-cli bot spot_grid check_params`

## Future Plans

Possible expansion directions:
- Add more trading tool modules (VIP endpoints, other trading pair types)
- Enhance error handling and logging
- Add test coverage

## Acceptance Criteria

Each new feature must satisfy:
1. Tools can be correctly invoked via MCP clients
2. CLI commands provide `--dry-run` option (for write operations)
3. Error messages are clear and include actionable fix suggestions
4. Documentation updated (README.md, specs/docs/TOOLS.md)
