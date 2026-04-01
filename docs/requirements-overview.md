# Requirements Overview

This document summarizes the requirement history and current status of the Pionex AI Kit project.

## Current Status

**Last Updated:** 2026-04-01

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
  - futures_grid_create, get_order, adjust_params, reduce, cancel

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
**Description:** Adds Dual Investment (双向理财) support — 11 new tools covering product discovery, investment lifecycle, and earnings collection.

**Tool Modules:**
- `earn_dual` module (new):
  - Public: symbols, open_products, prices, index, delivery_prices
  - View (auth): balances, get_invests, records
  - Earn/Write (auth): invest, revoke_invest, collect

**CLI:** `pionex-trade-cli earn dual <command>`

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
