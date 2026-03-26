# Technical Design Document: CLI & Skills Support

## Design Goals

This document provides the detailed technical design for implementing CLI command support and Skills integration, including:
- Architecture layers and module responsibilities
- Command and interface specifications
- Data models and error handling
- File change checklist

---

## Overall Architecture

```text
Agent (Cursor/Claude)
  ├─ Skills (Markdown playbooks)
  │    └─ call local CLI: pionex-trade-cli ...
  └─ MCP Client
       └─ pionex-trade-mcp (stdio)
            └─ @pionex-ai/core
                 └─ Pionex REST API

Human / Script
  └─ pionex-trade-cli
       └─ @pionex-ai/core
            └─ Pionex REST API
```

**Design Principles:**
1. CLI and MCP share `@pionex-ai/core` code (avoid dual implementation)
2. Skills only constrain workflows — they carry no business execution code
3. Credentials stay local (env vars or `~/.pionex/config.toml`)

---

## Data Models

### Configuration Model

```typescript
interface PionexConfig {
  apiKey?: string;
  secretKey?: string;
  hasAuth: boolean;
  baseUrl: string;
  modules: ModuleId[];  // "market" | "account" | "orders" | "bot"
  readOnly: boolean;
}
```

**Configuration Priority:**
1. CLI arguments (`--api-key`, `--secret-key`, `--read-only`, etc.)
2. Environment variables (`PIONEX_API_KEY`, `PIONEX_API_SECRET`, `PIONEX_BASE_URL`)
3. TOML config file (specified profile in `~/.pionex/config.toml`)

### Tool Model

```typescript
interface ToolSpec {
  name: string;                   // Tool name, e.g. "pionex_market_get_depth"
  description: string;            // Tool description
  module: ModuleId;               // Parent module
  isWrite: boolean;               // Whether this is a write operation
  inputSchema: JsonSchema;        // Input parameter schema
  handler(args: ToolArgs, ctx: ToolContext): Promise<unknown>;
}

interface ToolContext {
  client: PionexRestClient;
  config: PionexConfig;
}
```

---

## Core Module Design

### 1. `@pionex-ai/core` Responsibilities

**Scope:**
- Configuration reading and validation (`config.ts`, `config/toml.ts`)
- REST request signing and sending (`client/rest-client.ts`)
- Unified error model (`utils/errors.ts`)
- Tool registration and execution (`tools/index.ts`)
- MCP mapping conversion (`toMcpTool()` in `tools/types.ts`)

**Key Files:**
```
packages/core/src/
  config/
    toml.ts              # TOML config reading/writing
  client/
    rest-client.ts       # REST API wrapper
    types.ts             # Request/response types
  tools/
    market.ts            # Market module tools
    account.ts           # Account module tools
    orders.ts            # Orders module tools
    bot.ts               # Bot module tools (if needed)
    types.ts             # ToolSpec and toMcpTool()
    index.ts             # Tool registry
  utils/
    errors.ts            # ConfigError, PionexApiError
  constants.ts           # MODULES, DEFAULT_BASE_URL
  config.ts              # loadConfig()
  setup.ts               # MCP client config writing
  index.ts               # Export all public APIs
```

### 2. REST Client Design

**Class Definition:**

```typescript
class PionexRestClient {
  constructor(config: {
    apiKey: string;
    secretKey: string;
    baseUrl: string
  })

  // Public endpoints (no authentication required)
  async publicGet(path: string, query?: QueryParams): Promise<RequestResult>

  // Private endpoints (authentication + signature required)
  async privatePost(path: string, params?: Record<string, unknown>): Promise<RequestResult>
}

interface RequestResult {
  data: unknown;
  result: boolean;
  message?: string;
}
```

**Signature Algorithm:**
```
message = timestamp + method + path + body
signature = HMAC-SHA256(message, secretKey)
headers = {
  "PIONEX-KEY": apiKey,
  "PIONEX-SIGNATURE": signature,
  "PIONEX-TIMESTAMP": timestamp
}
```

- `timestamp`: 13-digit millisecond timestamp
- `body`: JSON string (`JSON.stringify()`)
- `path`: includes query string (if any)

### 3. Error Model

```typescript
class ConfigError extends Error {
  constructor(message: string, public suggestion?: string) {}
}

class PionexApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {}
}

function toToolErrorPayload(error: Error): {
  type: string;
  message: string;
  suggestion?: string;
  status?: number;
} {}
```

**Error Handling Flow:**
- CLI: catch error → output to stderr → `process.exit(1)`
- MCP: catch error → convert to `CallToolResult` with `isError: true` format

### 4. Tool Assembly

**Registration Functions:**
```typescript
function registerMarketTools(): ToolSpec[]
function registerAccountTools(): ToolSpec[]
function registerOrdersTools(): ToolSpec[]
function registerBotTools(): ToolSpec[]
```

**Build Function:**
```typescript
function buildTools(config: PionexConfig): ToolSpec[] {
  const enabled = new Set(config.modules);
  const tools = allToolSpecs().filter(t => enabled.has(t.module));

  if (!config.readOnly) return tools;
  return tools.filter(t => !t.isWrite);
}
```

**Tool Runner:**
```typescript
type ToolRunner = (toolName: string, args: ToolArgs) => Promise<ToolResult>

function createToolRunner(
  client: PionexRestClient,
  config: PionexConfig
): ToolRunner
```

---

## CLI Technical Design

### 1. Package & Bin

**Package Name:** `@pionex/pionex-ai-kit`

**Bin Entry:**
```json
{
  "bin": {
    "pionex-ai-kit": "dist/index.js",
    "pionex-trade-cli": "dist/index.js"
  }
}
```

**Entry Logic:** Distinguish commands based on the basename of `process.argv[1]`:
- `pionex-ai-kit` → onboard/setup/help
- `pionex-trade-cli` → market/account/orders/bot

### 2. Command Routing

#### `pionex-ai-kit` Commands

```typescript
function main() {
  const cmd = process.argv[2];

  switch(cmd) {
    case "onboard": return cmdOnboard();
    case "setup": return cmdSetup(process.argv.slice(3));
    case "help": return printHelp();
    default: return printHelp();
  }
}
```

#### `pionex-trade-cli` Commands

```typescript
function main() {
  const module = process.argv[2];  // market | account | orders | bot
  const command = process.argv[3];  // depth | balance | new | ...
  const args = parseArgs(process.argv.slice(4));

  return cmdTrade(module, command, args);
}
```

### 3. Argument Parsing

**Supported Formats:**
- `--key value`
- `--key=value`
- `--flag` (boolean, no value)

**Global Arguments:**
- `--profile <name>` - Use specified profile
- `--modules <m1,m2>` - List of enabled modules
- `--base-url <url>` - API base URL
- `--read-only` - Read-only mode (filter out write tools)
- `--dry-run` - Preview mode (do not execute API calls)

**Implementation:**
```typescript
function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      if (arg.includes("=")) {
        const [key, value] = arg.slice(2).split("=");
        result[key] = value;
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];

        if (next && !next.startsWith("--")) {
          result[key] = next;
          i++;
        } else {
          result[key] = true;
        }
      }
    }
  }

  return result;
}
```

### 4. Dry-run Implementation

**Only applies to write operations:**
- `orders new`
- `orders cancel`
- `orders cancel-all`
- `bot futures_grid create/adjust/reduce/cancel`

**Implementation:**
```typescript
async function cmdTrade(module, command, args) {
  const config = loadConfig({ ...args, dryRun: args["dry-run"] });

  if (config.readOnly && isWriteCommand(module, command)) {
    // Output the tool and arguments that would be executed
    console.log(JSON.stringify({
      tool: getToolName(module, command),
      args: extractToolArgs(args)
    }, null, 2));
    return;
  }

  // Normal execution
  const runner = createToolRunner(client, config);
  const result = await runner(toolName, toolArgs);
  console.log(JSON.stringify(result.data, null, 2));
}
```

---

## MCP Technical Design

### 1. Package & Entry

**Package Name:** `@pionex/pionex-trade-mcp`

**Bin Entry:**
```json
{
  "bin": {
    "pionex-trade-mcp": "dist/index.js"
  }
}
```

### 2. Server Processing Flow

```typescript
export function createMcpServer(config: PionexConfig): Server {
  const server = new Server({
    name: "pionex-trade-mcp",
    version: resolveServerVersion()
  }, {
    capabilities: { tools: {} }
  });

  const client = new PionexRestClient({ ...config });
  const tools = buildTools(config);

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...tools.map(toMcpTool),
      SYSTEM_CAPABILITIES_TOOL
    ]
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "system_get_capabilities") {
      return handleCapabilities(config);
    }

    const tool = tools.find(t => t.name === name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }]
      };
    }

    try {
      const data = await tool.handler(args, { client, config });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      const payload = toToolErrorPayload(error);
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify(payload, null, 2)
        }]
      };
    }
  });

  return server;
}
```

### 3. System Capabilities Tool

**Tool Definition:**
```typescript
const SYSTEM_CAPABILITIES_TOOL: Tool = {
  name: "system_get_capabilities",
  description: "Return server capabilities and module availability",
  inputSchema: {
    type: "object",
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true
  }
};
```

**Return Structure:**
```typescript
interface CapabilitySnapshot {
  readOnly: boolean;
  hasAuth: boolean;
  moduleAvailability: Record<ModuleId, {
    status: "enabled" | "disabled" | "requires_auth";
    reasonCode?: string;
  }>;
}
```

---

## Skills Technical Design

### 1. Repository Structure

```
pionex-skills/
  README.md
  skills/
    pionex-market/
      SKILL.md
    pionex-portfolio/
      SKILL.md
    pionex-trade/
      SKILL.md
```

### 2. SKILL.md Specification

**Frontmatter:**
```yaml
---
name: pionex-market
description: Query Pionex public market data (depth, trades, tickers, klines)
metadata:
  agent:
    requires:
      bins: ["pionex-trade-cli"]
    install:
      npm: "@pionex/pionex-ai-kit"
---
```

**Content Structure:**
1. When to use this skill
2. Prerequisites
3. Commands
4. Examples
5. Error handling

### 3. Responsibilities of the Three Skills

#### `pionex-market`
- **Purpose**: Query public market data
- **No authentication required**: Explicitly stated
- **Commands**:
  - `pionex-trade-cli market depth <symbol>`
  - `pionex-trade-cli market trades <symbol>`
  - `pionex-trade-cli market tickers`

#### `pionex-portfolio`
- **Purpose**: Query account information
- **Authentication required**: Explicitly stated
- **Commands**:
  - `pionex-trade-cli account balance`

#### `pionex-trade`
- **Purpose**: Place orders, cancel orders, query orders
- **Authentication required**: Explicitly stated
- **Risk control flow**:
  1. First query balance: `pionex-trade-cli account balance`
  2. Check minimum order size (from symbol info)
  3. Use `--dry-run` to preview the order
  4. Wait for user confirmation
  5. Execute the real order
  6. Before `cancel-all`, preview the number of affected orders

---

## MCP Client Configuration

### Setup Command Implementation

**Function Signature:**
```typescript
export function runSetup(options: SetupOptions): void

interface SetupOptions {
  client: ClientId;
  mcpServerName?: string;
}

type ClientId =
  | "cursor"
  | "claude-desktop"
  | "claude-code"
  | "windsurf"
  | "vscode"
  | "openclaw";
```

**Config Path Mapping:**
```typescript
const CONFIG_PATHS: Record<ClientId, string> = {
  "cursor": "~/.cursor/mcp.json",
  "claude-desktop": platform === "darwin"
    ? "~/Library/Application Support/Claude/claude_desktop_config.json"
    : "...",  // Windows/Linux
  "windsurf": "~/.codeium/windsurf/mcp_config.json",
  "vscode": ".mcp.json",  // project-level
  "openclaw": "~/.openclaw/workspace/config/mcporter.json"
};
```

**MCP Config Format:**
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

**Special Handling for Claude Code:**
```typescript
if (client === "claude-code") {
  execSync("claude mcp add --scope user --transport stdio pionex-trade-mcp -- @pionex/pionex-trade-mcp");
  return;
}
```

---

## File Change Checklist

### New Files

**Core:**
- ✅ `packages/core/src/tools/bot.ts` - Bot module tools (if needed)
- ✅ `packages/core/src/schemas/futures-grid-create.ts` - Futures grid parameter validation

**CLI:**
- (No new files — modify existing `packages/cli/src/index.ts`)

**MCP:**
- (No new files — modify existing `packages/mcp/src/server.ts`)

**Skills:**
- `pionex-skills/README.md`
- `pionex-skills/skills/pionex-market/SKILL.md`
- `pionex-skills/skills/pionex-portfolio/SKILL.md`
- `pionex-skills/skills/pionex-trade/SKILL.md`

### Modified Files

**Core:**
- `packages/core/src/tools/index.ts` - Add bot tool registration
- `packages/core/src/tools/market.ts` - Add missing tools (e.g. klines)
- `packages/core/src/tools/orders.ts` - Add missing tools (e.g. get_fills_by_order_id)
- `packages/core/src/constants.ts` - Add "bot" to MODULES

**CLI:**
- `packages/cli/src/index.ts` - Add `pionex-trade-cli` command routing

**MCP:**
- `packages/mcp/src/server.ts` - Ensure all tools are correctly registered

**Documentation:**
- `README.md` - Add CLI command examples
- `CONTRIBUTING.md` - Update development and publishing workflow
- `specs/docs/TOOLS.md` - Add complete tool listing

---

## Testing Strategy

### Unit Tests

- [ ] `parseArgs()` argument parsing correctness
- [ ] `buildTools()` module and readOnly filtering logic
- [ ] `toToolErrorPayload()` error format conversion
- [ ] `loadConfig()` configuration priority

### Integration Tests

- [ ] `pionex-trade-cli market depth BTC_USDT` returns data
- [ ] `pionex-trade-mcp --modules market` + MCP call
- [ ] `--dry-run` mode does not call the real API

### E2E Tests

- [ ] Full installation flow: install → onboard → setup → tool call
- [ ] Skills installation and recognition
- [ ] Risk control flow reproduced in conversation

---

## Suggested Implementation Steps

1. **Phase 1**: Complete core tools (add missing tools)
2. **Phase 2**: Implement CLI command routing and argument parsing
3. **Phase 3**: Implement dry-run logic
4. **Phase 4**: Create Skills repository and 3 SKILL.md files
5. **Phase 5**: Update documentation and examples
6. **Phase 6**: Testing and publishing

---

## Technical Decision Records

### Decision 1: CLI and MCP Share Core

**Context**: Need to provide the same functionality through both CLI and MCP entry points
**Solution**: Create `@pionex-ai/core` as a private package, bundled into both CLI and MCP at build time
**Rationale**: Avoid duplicate implementation, ensure consistent behavior
**Trade-off**: Increased build complexity, but improved maintainability

### Decision 2: Skills Are Documentation Only

**Context**: Need to provide trading workflow guidance for AI agents
**Solution**: Skills contain only SKILL.md documents, no executable code
**Rationale**: Simplifies maintenance, avoids version inconsistencies with CLI/MCP
**Trade-off**: AI must understand the documentation and correctly invoke the CLI

### Decision 3: Hand-written Argument Parsing

**Context**: CLI needs to parse command-line arguments
**Solution**: Hand-write a simple argument parser instead of introducing libraries like commander
**Rationale**: Maintain zero-dependency goal; the arguments are simple enough
**Trade-off**: Does not support complex arguments (arrays, nested objects), but current requirements don't need them

---

## References

- Pionex API Documentation: https://pionex-doc.gitbook.io/api-zh-hans/
- MCP SDK Documentation: https://github.com/modelcontextprotocol/sdk
- Claude Code Skills Specification: Claude Code official documentation
