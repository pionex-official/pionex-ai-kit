# Requirements Document: CLI & Skills Support

## Change Overview

**Iteration Goal:** Add complete CLI command support and Skills integration capability to Pionex AI Kit

**Change Type:** New Feature

**Priority:** P0 (Core Feature)

---

## Background

### Business Context

Pionex users want to perform trading operations such as market queries, account inquiries, order placement, and order cancellation directly within AI clients like Cursor/Claude.

### Current Pain Points

1. Only API documentation available, not agent-friendly
2. Pure MCP tools lack trading workflow constraints (check balance first, minimum order size validation, dry-run)
3. Complex installation process — users are unclear on how to complete credential configuration, MCP registration, and skills installation

### Target Users

- Trading users using AI clients (Cursor/Claude/Windsurf/VSCode, etc.)
- Quantitative/automation developers (CLI script callers)
- Platform integrators (seeking to expose tool capabilities via MCP)

---

## Detailed Requirements

### Functional Requirement 1: Complete CLI Command Support

**Current State:**
- Only `pionex-ai-kit onboard` and `setup` commands are supported
- Cannot execute trading operations directly via CLI

**Desired State:**
- Provide `pionex-trade-cli` command alias
- Support the following subcommands:
  - `market`: depth, trades, symbols, tickers, klines
  - `account`: balance
  - `orders`: new, get, open, all, fills, cancel, cancel-all
- Support global parameters: `--profile`, `--modules`, `--base-url`, `--read-only`, `--dry-run`

**Acceptance Criteria:**
- [ ] `pionex-trade-cli market depth BTC_USDT --limit 5` returns order book data
- [ ] `pionex-trade-cli account balance` returns account balance
- [ ] `pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run` displays the order parameters to be executed
- [ ] All commands support `--help` to display usage instructions

### Functional Requirement 2: MCP Tool Completeness

**Current State:**
- Basic MCP tools are implemented

**Desired State:**
- Ensure all tools cover Market, Account, and Orders modules
- Provide system capability discovery tool `system_get_capabilities`

**Tool Inventory:**

**Market (No Authentication Required):**
- `pionex_market_get_depth` - Order book depth
- `pionex_market_get_trades` - Recent trades
- `pionex_market_get_symbol_info` - Trading pair information
- `pionex_market_get_tickers` - Market snapshot
- `pionex_market_get_klines` - Candlestick data

**Account (Authentication Required):**
- `pionex_account_get_balance` - Account balance

**Orders (Authentication Required):**
- `pionex_orders_new_order` - Place order
- `pionex_orders_get_order` - Query order
- `pionex_orders_get_order_by_client_order_id` - Query by client order ID
- `pionex_orders_get_open_orders` - Query open orders
- `pionex_orders_get_all_orders` - Query all orders
- `pionex_orders_get_fills` - Query fill records
- `pionex_orders_cancel_order` - Cancel order
- `pionex_orders_cancel_all_orders` - Cancel all open orders

**Acceptance Criteria:**
- [ ] All tools can be listed via MCP client
- [ ] `system_get_capabilities` correctly returns authentication status and module availability
- [ ] Write operation tools are not executable in `--read-only` mode

### Functional Requirement 3: Skills Repository

**Current State:**
- No Skills documentation exists

**Desired State:**
- Create a standalone `pionex-skills` repository
- Provide 3 foundational Skills:
  - `pionex-market` - Market data queries
  - `pionex-portfolio` - Account queries
  - `pionex-trade` - Trading operations (with risk control workflow)

**Skill Specification:**
- Each Skill contains a `SKILL.md` file
- Frontmatter includes: name, description, requires.bins, install information
- `pionex-trade` Skill must include risk control workflow:
  - Check balance before placing orders
  - Minimum order size validation
  - Dry-run + user confirmation before write operations
  - Preview impact scope before cancel-all

**Acceptance Criteria:**
- [ ] `npx skills add pionex-official/pionex-skills` can install successfully
- [ ] AI client can recognize all 3 Skills
- [ ] When asking AI to "buy BTC with 5 USDT" in conversation, AI follows the risk control workflow

### Functional Requirement 4: MCP Client Auto-Configuration

**Current State:**
- `setup` command already supports multiple clients

**Desired State:**
- Ensure correct config file generation for the following clients:
  - `cursor` - `~/.cursor/mcp.json`
  - `claude-desktop` - Different paths for macOS/Windows/Linux
  - `claude-code` - Invokes `claude mcp add` command
  - `windsurf` - `~/.codeium/windsurf/mcp_config.json`
  - `vscode` - Project-level `.mcp.json`
  - `openclaw` - `~/.openclaw/workspace/config/mcporter.json`

**Acceptance Criteria:**
- [ ] Config file is correctly generated after running `pionex-ai-kit setup` for each client
- [ ] MCP server can start after restarting the client
- [ ] Tool list can be retrieved normally

---

## Non-Functional Requirements

### NFR-1: Security

- Do not output plaintext API Secret in logs
- README emphasizes that API keys should not be shared in chat; recommend IP whitelisting
- Support `--read-only` mode to restrict write operations

### NFR-2: Compatibility

- Node.js >= 18
- Must run on macOS/Linux/Windows (path handling must be cross-platform)

### NFR-3: Maintainability

- CLI and MCP reuse `@pionex-ai/core` code
- Documentation command examples must stay consistent with actual CLI parameters

### NFR-4: Usability

- Clear error messages with actionable fix suggestions
- Support `--help` to view command usage
- `--dry-run` to preview operations without execution

---

## Non-Goals (Out of Scope)

- No complex strategy engine in this iteration (e.g., full grid/DCA lifecycle management)
- No cloud-hosted service in this iteration (local process only)
- No UI application in this iteration (CLI + MCP + Skills documentation only)
- No cross-exchange aggregation in this iteration

---

## User Stories

### Story 1: Quick Start
**As a** trading user
**I want to** complete installation and invoke Pionex tools in Cursor within 5 minutes
**So that** I can quickly start using AI-assisted trading

### Story 2: Safe Trading
**As a** trading user
**I want** the AI to check balance and minimum order constraints before placing orders
**So that** I can avoid invalid orders and capital risk

### Story 3: Scripted Invocation
**As a** developer
**I want to** programmatically call market/account/orders via `pionex-trade-cli`
**So that** I can integrate it into automated trading systems

### Story 4: Risk Control
**As a** platform integrator
**I want to** invoke the same capabilities via MCP and control risk with `--read-only`
**So that** I can use it safely in production environments

---

## Acceptance Criteria Summary

### Installation & Configuration
- [ ] `pionex-ai-kit` and `pionex-trade-cli` commands are available after `npm install -g @pionex/pionex-ai-kit`
- [ ] `pionex-ai-kit onboard` can create `~/.pionex/config.toml`
- [ ] `pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor` can write client configuration

### CLI Commands
- [ ] `pionex-trade-cli market tickers --symbol BTC_USDT` returns market data
- [ ] `pionex-trade-cli account balance` returns account balance (requires API key configuration)
- [ ] `pionex-trade-cli orders new ... --dry-run` displays the order parameters to be executed

### MCP Tools
- [ ] MCP client can list all tools
- [ ] Market tools can be called normally (no authentication required)
- [ ] Account/Orders tools can be called when authenticated
- [ ] `system_get_capabilities` returns correct status

### Skills
- [ ] `npx skills add pionex-official/pionex-skills` can install successfully
- [ ] AI client can recognize `pionex-market`/`pionex-portfolio`/`pionex-trade`
- [ ] `pionex-trade` Skill's risk control workflow can be reproduced in conversation

---

## Milestones

- **M1 (1 week)**: core + CLI basic commands (market/account/orders)
- **M2 (1 week)**: MCP tool completeness + setup command optimization
- **M3 (0.5 week)**: Skills trio + README
- **M4 (0.5 week)**: Testing, release, acceptance

---

## Risks & Mitigations

### Risk 1: API Changes
- **Impact**: CLI/MCP tools become broken
- **Mitigation**: Centralized adaptation through the core layer; CLI/MCP do not directly couple to the API

### Risk 2: Documentation-Implementation Drift
- **Impact**: Users fail when following documentation
- **Mitigation**: Include README examples in CI smoke tests

### Risk 3: User Misoperation
- **Impact**: Accidental order placement or cancellation
- **Mitigation**: Default emphasis on `--dry-run`, support `--read-only`, Skills include secondary confirmation workflow

---

## References

- Pionex API Documentation: https://pionex-doc.gitbook.io/api-zh-hans/
- MCP Specification: https://spec.modelcontextprotocol.io/
- Skills Specification: Claude Code Skills standard format
