# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pionex AI Kit is a trading toolkit that provides AI agents with programmatic access to Pionex exchange via MCP (Model Context Protocol). The repository is a pnpm monorepo publishing two npm packages:

- **`@pionex/pionex-ai-kit`** — CLI for onboarding (writes `~/.pionex/config.toml`) and MCP client setup
- **`@pionex/pionex-trade-mcp`** — MCP server exposing Pionex trading tools to AI clients (Cursor, Claude Desktop, Windsurf, VS Code, etc.)
- **`@pionex-ai/core`** (private) — Shared utilities bundled into both public packages

## Repository Structure

```
packages/
  cli/     → @pionex/pionex-ai-kit (CLI + trade commands)
  mcp/     → @pionex/pionex-trade-mcp (MCP server)
  core/    → @pionex-ai/core (shared utilities)
    src/
      client/         → PionexRestClient (API wrapper)
      config/         → TOML config reading/writing
      tools/          → Tool definitions by module:
        market.ts     → Public market data (no auth)
        account.ts    → Account balance
        orders.ts     → Spot orders
        bot.ts        → Futures Grid Bot
      schemas/        → JSON schemas (futures grid validation)
      setup.ts        → MCP client config writers
```

## Build & Development

```bash
# Install dependencies
npm install

# Build all packages (core → cli → mcp)
npm run build

# Clean build artifacts
npm run clean

# Run built CLI
node packages/cli/dist/index.js help
node packages/cli/dist/index.js onboard

# Run built MCP server
node packages/mcp/dist/index.js --help
```

**Important:** Build order matters — `@pionex-ai/core` must be built before `cli` and `mcp` since they depend on it. The root `npm run build` handles this automatically.

## Architecture

### Three-Layer Design

1. **Core (`@pionex-ai/core`)** — Business logic, API client, tool definitions
   - `PionexRestClient`: REST API wrapper with signature authentication
   - Tool system: module-based tool registry (market, account, orders, bot)
   - Config: reads `~/.pionex/config.toml` for credentials

2. **CLI (`@pionex/pionex-ai-kit`)** — End-user commands
   - `onboard`: Interactive wizard to write `~/.pionex/config.toml`
   - `setup`: Writes MCP client config files (Cursor, Claude Desktop, etc.)
   - Direct trading commands (e.g., `pionex-trade-cli market depth BTC_USDT`)

3. **MCP Server (`@pionex/pionex-trade-mcp`)** — Protocol adapter
   - Implements MCP protocol (tools, capabilities)
   - Reads credentials from `~/.pionex/config.toml` or env vars
   - Maps MCP tool calls → core tool handlers → Pionex API

### Module System

Tools are organized into modules that can be enabled/disabled:

| Module | Tools | Auth Required |
|--------|-------|---------------|
| `market` | depth, trades, symbol_info, tickers, book_tickers, klines | No |
| `account` | get_balance | Yes |
| `orders` | new_order, get_order, cancel_order, get_fills, etc. | Yes |
| `bot` | futures_grid_create, adjust_params, reduce, cancel | Yes |

The MCP server's `system_get_capabilities` tool returns module availability (enabled/disabled/requires_auth) for agent planning.

### Credential Flow

Priority when MCP server starts:
1. Environment variables: `PIONEX_API_KEY`, `PIONEX_API_SECRET`, `PIONEX_BASE_URL`
2. `~/.pionex/config.toml` (fallback if env vars missing)

**Never write API keys into MCP client config files.** The setup command only writes the server start command (e.g., `npx @pionex/pionex-trade-mcp`).

## Key Implementation Patterns

### Tool Definition

Tools are defined in `packages/core/src/tools/*.ts` using the `ToolSpec` interface:

```typescript
{
  name: "pionex_market_get_depth",
  module: "market",
  isWrite: false,  // read-only flag
  description: "Get order book depth...",
  inputSchema: { type: "object", ... },
  async handler(args, { client, config }) {
    return (await client.publicGet("/api/v1/market/depth", { symbol })).data;
  }
}
```

The MCP server converts `ToolSpec` → MCP `Tool` format via `toMcpTool()` in `packages/core/src/tools/types.ts`.

### REST Client

`PionexRestClient` in `packages/core/src/client/rest-client.ts`:
- Public endpoints: `publicGet(path, query)`
- Authenticated: `privatePost(path, params)` (adds signature + timestamp)
- Error handling: `PionexApiError` for API failures

### Futures Grid Bot

The `bot` module (`packages/core/src/tools/bot.ts`) has complex order data validation via JSON schema in `packages/core/src/schemas/futures-grid-create.ts`. When adding/modifying bot tools:
- Update schema in `packages/core/src/schemas/`
- Validate input with `parseAndValidateCreateFuturesGridBuOrderData()`
- Export schema constants (e.g., `CREATE_FUTURES_GRID_ORDER_DATA_KEYS`) for CLI help text

## MCP Client Setup

The `setup` command (`packages/core/src/setup.ts`) writes config files for supported clients:

| Client | Config Path |
|--------|-------------|
| `cursor` | `~/.cursor/mcp.json` |
| `claude-desktop` | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| `claude-code` | Runs `claude mcp add` (no file written) |
| `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| `vscode` | `.mcp.json` (project-level) |
| `openclaw` | `~/.openclaw/workspace/config/mcporter.json` |

When adding a new client, update `SUPPORTED_CLIENTS` and `runSetup()` in `packages/core/src/setup.ts`.

## Publishing

From repo root:

```bash
cd packages/cli && npm publish --access public
cd ../mcp && npm publish --access public
```

Publish order doesn't matter (no inter-package dependency at runtime). Version numbers in `package.json` are managed manually.

## Common Tasks

**Adding a new tool:**
1. Add to appropriate module in `packages/core/src/tools/*.ts`
2. Rebuild: `npm run build`
3. Test via CLI: `node packages/cli/dist/index.js <module> <command>`
4. Test via MCP: restart MCP server in your client

**Modifying API client:**
- Edit `packages/core/src/client/rest-client.ts`
- Signature logic in `privatePost()` must match Pionex API spec

**Updating config schema:**
- TOML parsing in `packages/core/src/config/toml.ts`
- Schema changes require updating `PionexTomlConfig` type and readers/writers

## 第一性原则

从需求和问题本质出发，不从惯例或模板出发。

1. 不要假设我清楚自己想要什么。动机或目标不清晰就停下来讨论。
2. 目标清晰但路径不是最短的，直接告诉我并建议更好的办法。
3. 遇到问题追根因，不打补丁。每个决策都要能回答"为什么"。
4. 输出说重点,砍掉一切不改变决策的信息。

## Documentation Conventions

### specs/

历次迭代的文档，每次迭代一个文件夹，包含：

- `1-requirements.md` - 需求文档
- `2-research.md` - 调研文档（简单变更可省略）
- `3-tech-design.md` - 技术设计文档
- `4-tasks.md` - 任务清单
- `5-review.md` - 迭代复盘（迭代完成后编写）

### docs/

项目汇总文档，根据每次迭代整理，始终反映最新状态：

- `requirements-overview.md` - 需求概览
- `tech-arch-overview.md` - 技术架构概览
- `tech-design-overview.md` - 技术设计概览
- `tech-memory-overview.md` - 技术记忆与知识
- `tech-rule-overview.md` - 技术规范
