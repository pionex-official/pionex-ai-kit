# Technical Design Overview

This document describes the detailed technical design of Pionex AI Kit, including key modules, interfaces, and code organization.

## Last Updated

**Date:** 2026-04-07

## Core Module Design

### 1. REST Client (`packages/core/src/client/rest-client.ts`)

#### PionexRestClient Class

**Responsibility:** Wraps Pionex REST API calls and handles signature authentication

**Key Methods:**

```typescript
class PionexRestClient {
  constructor(config: { apiKey: string; secretKey: string; baseUrl: string })

  // Public endpoints (no authentication required)
  async publicGet(path: string, query?: QueryParams): Promise<RequestResult>

  // Private endpoints (authentication + signature required)
  async signedGet(path: string, query?: QueryParams): Promise<RequestResult>
  async signedPost(path: string, body: Record<string, unknown>): Promise<RequestResult>
  async signedDelete(path: string, body: Record<string, unknown>): Promise<RequestResult>
  // DELETE with query params (not body) — used by earn/dual revoke endpoint
  async signedDeleteQuery(path: string, query?: QueryParams): Promise<RequestResult>
}
```

**Signature Logic:**
1. Generate 13-digit timestamp (milliseconds)
2. Concatenate: `${timestamp}${method}${path}${bodyString}`
3. HMAC-SHA256 sign using `secret_key`
4. Add headers: `PIONEX-KEY`, `PIONEX-SIGNATURE`, `PIONEX-TIMESTAMP`

**Error Handling:**
- Non-2xx HTTP → throws `PionexApiError`
- Parse failure → throws generic Error
- Tool layer catches and converts to MCP `CallToolResult` `isError` format

### 2. Tool System (`packages/core/src/tools/`)

#### ToolSpec Interface

**Definition:** `packages/core/src/tools/types.ts`

```typescript
interface ToolSpec {
  name: string              // Tool name, e.g. "pionex_market_get_depth"
  module: ModuleId          // Owning module: market | account | orders | bot
  isWrite: boolean          // Whether this is a write operation
  description: string       // Tool description (for Agent to understand purpose)
  inputSchema: object       // JSON Schema (input parameters)
  handler: ToolHandler      // Async handler function
}

type ToolHandler = (
  args: ToolArgs,
  context: ToolContext
) => Promise<unknown>

interface ToolContext {
  client: PionexRestClient
  config: PionexConfig
}
```

#### Tool Registration

**File Structure:**
```
packages/core/src/tools/
  index.ts              → Registry and builder
  types.ts              → Type definitions
  market.ts             → Market module tools
  account.ts            → Account module tools
  orders.ts             → Orders module tools
  bot.ts                → Bot module tools (includes check_params for futures/spot grid)
  earn-dual.ts          → Earn Dual Investment tools (11 tools)
```

**Registration Flow:**
1. Each module file exports a `register*Tools()` function returning `ToolSpec[]`
2. `tools/index.ts`'s `allToolSpecs()` merges all modules
3. `buildTools(config)` filters available tools based on configuration:
   - Module enabled status (`config.modules`)
   - Read-only mode (`config.readOnly`) filters out `isWrite: true` tools

#### MCP Conversion

**Converter:** `toMcpTool()` in `packages/core/src/tools/types.ts`

**Mapping:**
- `ToolSpec.name` → MCP `Tool.name`
- `ToolSpec.description` → MCP `Tool.description`
- `ToolSpec.inputSchema` → MCP `Tool.inputSchema`
- Adds MCP `annotations`: `readOnlyHint`, `destructiveHint`, `idempotentHint`

### 3. Configuration Management

#### TOML Configuration (`packages/core/src/config/toml.ts`)

**File Location:** `~/.pionex/config.toml`

**Structure:**
```toml
default_profile = "pionx-prod"

[profiles.pionx-prod]
api_key = "YOUR_API_KEY"
secret_key = "YOUR_SECRET_KEY"
base_url = "https://api.pionex.com"
```

**Type Definitions:**
```typescript
interface PionexProfile {
  api_key: string
  secret_key: string
  base_url: string
}

interface PionexTomlConfig {
  default_profile?: string
  profiles: Record<string, PionexProfile>
}
```

**API:**
- `readFullConfig()` → Read full TOML
- `writeFullConfig(config)` → Write full TOML
- `readTomlProfile(profileName?)` → Read specified profile (or default)

#### Runtime Configuration (`packages/core/src/config.ts`)

**Types:**
```typescript
interface PionexConfig {
  apiKey?: string           // From env or TOML
  secretKey?: string        // From env or TOML
  baseUrl: string           // Default https://api.pionex.com
  hasAuth: boolean          // Whether full credentials exist
  readOnly: boolean         // Read-only mode (CLI --dry-run)
  modules: ModuleId[]       // List of enabled modules
}
```

**Loading Priority (`loadConfig()`):**
1. `PIONEX_API_KEY` env → `apiKey`
2. `PIONEX_API_SECRET` env → `secretKey`
3. `PIONEX_BASE_URL` env → `baseUrl`
4. Falls back to TOML profile if env is missing
5. `hasAuth = !!(apiKey && secretKey)`

### 4. MCP Server (`packages/mcp/src/server.ts`)

#### Server Initialization

**Flow:**
```typescript
export function createMcpServer(config: PionexConfig): Server {
  const server = new Server({
    name: "pionex-trade-mcp",
    version: resolveServerVersion()
  }, { capabilities: { tools: {} } })

  const client = new PionexRestClient(...)
  const tools = buildTools(config)

  // Register MCP handlers
  server.setRequestHandler(ListToolsRequestSchema, ...)
  server.setRequestHandler(CallToolRequestSchema, ...)

  return server
}
```

**Tool List Handler:**
- Returns `tools.map(toMcpTool)` + `system_get_capabilities` tool

**Tool Call Handler:**
```typescript
async (request) => {
  const { name, arguments: args } = request.params
  const tool = tools.find(t => t.name === name)

  try {
    const data = await tool.handler(args, { client, config })
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: errorMessage }] }
  }
}
```

#### System Capabilities Tool

**Tool Name:** `system_get_capabilities`
**Purpose:** Returns server status and module availability for Agent decision-making

**Return Structure:**
```typescript
interface CapabilitySnapshot {
  readOnly: boolean
  hasAuth: boolean
  moduleAvailability: Record<ModuleId, {
    status: "enabled" | "disabled" | "requires_auth"
    reasonCode?: string
  }>
}
```

### 5. CLI (`packages/cli/src/index.ts`)

#### Command Routing

**Entry:** `#!/usr/bin/env node`

**Commands:**
- `onboard` → `cmdOnboard()` → Interactive configuration wizard
- `setup` → `cmdSetup(argv)` → Calls `runSetup()` from core
- `help` → `printHelp()`
- Trade commands (market, orders, bot) → `cmdTrade(argv)`

#### onboard Command

**Flow:**
1. Prompt user for API Key and Secret
2. Read or create `~/.pionex/config.toml`
3. Write profile (named `pionx-prod`)
4. Set as `default_profile`
5. Output next steps prompt (run `setup`)

#### setup Command

**Arguments:** `--mcp=pionex-trade-mcp --client <client>`

**Implementation:** Calls `runSetup()` from `packages/core/src/setup.ts`

**Supported Clients:**
| Client | Config File Path |
|--------|-----------------|
| cursor | `~/.cursor/mcp.json` |
| claude-desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| claude-code | Runs `claude mcp add` command |
| windsurf | `~/.codeium/windsurf/mcp_config.json` |
| vscode | `.mcp.json` (project-level) |
| openclaw | `~/.openclaw/workspace/config/mcporter.json` |

**Written Content (cursor example):**
```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "@pionex/pionex-trade-mcp"]
    }
  }
}
```

#### Trade Commands

**Format:** `pionex-trade-cli <module> <command> [options]`

**Implementation:**
1. Parse command-line arguments (`--symbol`, `--limit`, `--dry-run`, etc.)
2. Load configuration → `loadConfig()`
3. Create `PionexRestClient`
4. Call `createToolRunner()` → `runner(toolName, args)`
5. Output JSON result or formatted table

### 6. JSON Schema Validation (`packages/core/src/schemas/`)

#### Futures Grid Parameter Validation

**File:** `futures-grid-create.ts`

**Purpose:** Validates the `buOrderDataJson` parameter of the `futures_grid_create` tool

**Schema Definition:**
```typescript
const ORDER_DATA_SCHEMA = {
  type: "object",
  properties: {
    top: { type: "string", description: "Upper price limit" },
    bottom: { type: "string", description: "Lower price limit" },
    row: { type: "integer", description: "Number of grids" },
    grid_type: { enum: ["arithmetic", "geometric"] },
    trend: { enum: ["long", "short", "neutral"] },
    leverage: { type: "integer", minimum: 1, maximum: 125 },
    quoteInvestment: { type: "string", description: "Quote currency investment amount" }
  },
  required: ["top", "bottom", "row", "grid_type", "trend"]
}
```

**Validation Function:**
```typescript
parseAndValidateCreateFuturesGridBuOrderData(json: string): object
```

**Error Handling:**
- JSON parse failure → throws error
- Schema validation failure → throws detailed error message
- CLI uses `--dry-run` to test parameter correctness

## Data Flow

### MCP Tool Call Flow

```
AI Client (Cursor)
  │
  ├─ MCP: ListTools
  │   └→ MCP Server → buildTools(config) → [ToolSpec...]
  │       └→ map(toMcpTool) → [MCP Tool...]
  │           └→ return to Client
  │
  └─ MCP: CallTool("pionex_market_get_depth", {symbol: "BTC_USDT"})
      └→ MCP Server
          └→ find ToolSpec by name
              └→ tool.handler(args, {client, config})
                  └→ client.publicGet("/api/v1/market/depth", {symbol})
                      └→ fetch Pionex API
                          └→ return response.data
                              └→ wrap in MCP CallToolResult
                                  └→ return to Client
```

### CLI Trade Command Flow

```
$ pionex-trade-cli market depth BTC_USDT --limit 5
  │
  └→ CLI entry (packages/cli/src/index.ts)
      └→ cmdTrade(argv)
          └→ loadConfig() → PionexConfig
              └→ new PionexRestClient(config)
                  └→ createToolRunner(client, config)
                      └→ runner("pionex_market_get_depth", {symbol, limit})
                          └→ find tool in registry
                              └→ tool.handler(args, context)
                                  └→ [same as MCP flow above]
                                      └→ format + print to stdout
```

## Key File Index

| Function | File Path |
|----------|-----------|
| REST Client | `packages/core/src/client/rest-client.ts` |
| Tool Registry | `packages/core/src/tools/index.ts` |
| Market Tools | `packages/core/src/tools/market.ts` |
| Bot Tools | `packages/core/src/tools/bot.ts` |
| Earn Dual Tools | `packages/core/src/tools/earn-dual.ts` |
| TOML Config | `packages/core/src/config/toml.ts` |
| Runtime Config | `packages/core/src/config.ts` |
| MCP Server | `packages/mcp/src/server.ts` |
| MCP Entry | `packages/mcp/src/index.ts` |
| CLI Entry | `packages/cli/src/index.ts` |
| Setup Logic | `packages/core/src/setup.ts` |
| Schema Validation | `packages/core/src/schemas/futures-grid-create.ts`, `packages/core/src/schemas/spot-grid-create.ts` |

## Design Principles

1. **Single Responsibility**: Each module file handles only one functional domain
2. **Dependency Inversion**: Core does not depend on MCP SDK or CLI frameworks
3. **Configuration First**: All behavior configurable via `PionexConfig`
4. **Type Safety**: All interfaces use TypeScript types
5. **Error Transparency**: API errors are directly exposed to callers (no swallowing)
6. **Minimal Dependencies**: Production dependencies limited to essentials

## Extension Points

### Adding New Tools
1. Add `ToolSpec` in `packages/core/src/tools/<module>.ts`
2. Implement `handler` function calling `client.publicGet` or `client.privatePost`
3. Run `npm run build`
4. Test: CLI or restart MCP server

### Adding New Modules
1. Add new module ID to `MODULES` in `packages/core/src/constants.ts`
2. Create `packages/core/src/tools/<new-module>.ts`
3. Import and register in `packages/core/src/tools/index.ts`
4. Update documentation (this document + README.md)

### Custom Signature Logic
Modify the `privatePost()` method in `packages/core/src/client/rest-client.ts`, keeping the interface unchanged.
