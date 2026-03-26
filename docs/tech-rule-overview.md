# Technical Rules and Conventions

This document defines the coding standards, testing standards, and development workflow for the Pionex AI Kit project.

## Last Updated

**Date:** 2026-03-26

## Coding Standards

### 1. TypeScript Standards

#### Type Safety

**Mandatory Requirements:**
- All public APIs must have explicit type annotations
- Using `any` is prohibited; use `unknown` if dynamic types are truly needed
- Prefer interfaces over type aliases (unless union types are needed)

**Example:**
```typescript
// ✅ Good
interface ToolSpec {
  name: string
  handler: (args: ToolArgs, ctx: ToolContext) => Promise<unknown>
}

// ❌ Bad
function register(tool: any) { ... }
```

#### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Class | PascalCase | `PionexRestClient` |
| Interface/Type | PascalCase | `ToolSpec`, `PionexConfig` |
| Function/Variable | camelCase | `buildTools`, `apiKey` |
| Constant | UPPER_SNAKE_CASE | `DEFAULT_BASE_URL`, `MODULES` |
| File | kebab-case | `rest-client.ts`, `futures-grid-create.ts` |
| MCP Tool Name | snake_case | `pionex_market_get_depth` |

#### Module Imports

**Rules:**
- ESM imports must include `.js` suffix (even when source is `.ts`)
- Import order: Node built-ins → External dependencies → Local modules

**Example:**
```typescript
import { readFileSync } from "node:fs"              // Node built-in
import { Server } from "@modelcontextprotocol/sdk"  // External dependency
import { buildTools } from "./tools/index.js"       // Local module
```

### 2. Error Handling

#### Error Types

**Custom Error Classes:**
```typescript
class PionexApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  )
}

class ConfigError extends Error {
  constructor(message: string)
}
```

**Usage Scenarios:**
- API call failure → `PionexApiError`
- Config file missing/malformed → `ConfigError`
- Parameter validation failure → `Error` (with detailed message)

#### Error Propagation

**Principle:** Catch at the appropriate layer, never swallow errors

**MCP Server:** Catches all errors, converts to `CallToolResult` `isError` format
```typescript
try {
  const data = await tool.handler(args, context)
  return { content: [{ type: "text", text: JSON.stringify(data) }] }
} catch (error) {
  return {
    isError: true,
    content: [{ type: "text", text: error.message }]
  }
}
```

**CLI:** Catches top-level errors, outputs to stderr, exit code 1
```typescript
try {
  await cmdTrade(argv)
} catch (error) {
  process.stderr.write(`Error: ${error.message}\n`)
  process.exit(1)
}
```

**Core:** Does not catch errors, lets the caller decide how to handle

### 3. Async Code

**Mandatory async/await**
- Bare Promise chains (`.then().catch()`) are prohibited
- Exception handling uses `try/catch` uniformly

**Example:**
```typescript
// ✅ Good
async function fetchData() {
  try {
    const response = await client.publicGet("/api/v1/market/depth")
    return response.data
  } catch (error) {
    throw new PionexApiError(...)
  }
}

// ❌ Bad
function fetchData() {
  return client.publicGet("/api/v1/market/depth")
    .then(r => r.data)
    .catch(e => console.error(e))
}
```

### 4. Security Standards

#### Credential Handling

**Prohibited:**
- ❌ Printing API keys or secrets in logs
- ❌ Including full authentication headers in error messages
- ❌ Writing credentials to MCP client config files

**Allowed:**
- ✅ Storing credentials in `~/.pionex/config.toml` (user home directory)
- ✅ Reading credentials from environment variables
- ✅ Indicating "invalid signature" in error messages (without exposing the signature value)

#### API Requests

**Signature logic must:**
- Use standard HMAC-SHA256 algorithm
- Use 13-digit millisecond timestamp precision
- Use `JSON.stringify()` for body (no extra spaces)

**Implementation Location:** `packages/core/src/client/rest-client.ts`

### 5. Documentation Comments

**Requirements:**
- All public APIs (exported functions/classes/interfaces) must have JSDoc comments
- Tool `description` fields must clearly explain purpose and parameters

**Example:**
```typescript
/**
 * Create a function that can call any registered tool by name.
 *
 * @param client - REST client instance
 * @param config - Runtime configuration
 * @returns A function that executes tools by name
 */
export function createToolRunner(
  client: PionexRestClient,
  config: PionexConfig
): ToolRunner { ... }
```

## Testing Standards

### Current State

**⚠️ Project currently has no automated tests**

### Planned Testing Strategy

#### Unit Tests

**Tool:** Vitest (recommended, consistent with tsup ecosystem)

**Coverage Scope:**
- Signature algorithm (`PionexRestClient.privatePost`)
- Tool registration logic (`buildTools` filtering rules)
- TOML config read/write (`readFullConfig`, `writeFullConfig`)
- JSON Schema validation (`parseAndValidateCreateFuturesGridBuOrderData`)

**Mock Strategy:**
- Mock `fetch` or the entire `PionexRestClient`
- No dependency on real APIs (avoid rate limiting, credential issues)

#### Integration Tests

**Coverage Scope:**
- MCP server startup and tool call flow
- CLI command parsing and tool execution
- Config file read/write (temporary directory)

**Environment:**
- Use test credentials (or mock API responses)
- Isolate real config file (`~/.pionex/config.toml`)

#### Manual Testing

**Pre-release Checklist:**
1. Installation test: `npm install -g @pionex/pionex-ai-kit`
2. Onboard flow: `pionex-ai-kit onboard`
3. Setup flow: `pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor`
4. MCP tool call (test at least one tool in Cursor)
5. CLI command: `pionex-trade-cli market depth BTC_USDT`

## Development Workflow

### 1. Branch Management

**Main Branch:** `main`
- Production-ready code, each merge corresponds to a release

**Feature Branches:** `feature/<description>`
- Created from `main`, merged back to `main` when complete

**Hotfixes:** `hotfix/<issue>`
- Created from `main`, merged directly after fix

### 2. Commit Conventions

**Format:** `<type>: <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `refactor`: Code refactoring (no behavior change)
- `chore`: Build/tooling configuration changes

**Examples:**
```
feat: add pionex_orders_get_fills_by_order_id tool
fix: correct signature algorithm for POST requests
docs: update README with new MCP client support
```

### 3. Release Workflow

**Steps:**
1. Update version numbers (`packages/cli/package.json` and `packages/mcp/package.json`)
2. Update `CHANGELOG.md` (if applicable)
3. Run `npm run build` to ensure build succeeds
4. Publish CLI: `cd packages/cli && npm publish --access public`
5. Publish MCP: `cd packages/mcp && npm publish --access public`
6. Create Git tag: `git tag v0.2.35 && git push origin v0.2.35`
7. Test: `npx @pionex/pionex-trade-mcp --help`

**Version Number Convention:**
- `0.x.y`: API may be unstable
- `1.x.y`: Stable version, follows Semver
- Both packages keep version numbers in sync (simplifies user understanding)

### 4. Code Review

**Focus Areas:**
- Does it introduce new dependencies? Are they necessary?
- Is error handling complete?
- Does it follow naming and code style conventions?
- Is relevant documentation updated (README, TOOLS.md)?

**Self-Review Checklist:**
- [ ] `npm run build` succeeds
- [ ] Manually tested new feature (CLI or MCP)
- [ ] Checked git diff for debug code
- [ ] Updated documentation (if API changes)

## Tool Standards

### Adding New Tools

**Steps:**
1. Add `ToolSpec` in `packages/core/src/tools/<module>.ts`
2. Define `inputSchema` (JSON Schema)
3. Implement `handler` function
4. Export to `register*Tools()` array
5. Run `npm run build`
6. Update `specs/docs/TOOLS.md`

**Tool Naming:**
- Format: `pionex_<module>_<action>_<resource>`
- Verbs: `get`, `create`, `cancel`, `update`
- Maintain consistency (reference existing tools)

**Description Writing:**
- First sentence states the purpose ("Get order book depth...")
- Second sentence states the use case ("Use for spread, liquidity, or best bid/ask.")
- Concise and clear, avoid technical jargon (AI needs to understand)

**Input Schema:**
- Required fields go in the `required` array
- Each field provides a `description`
- Use standard JSON Schema types (`string`, `integer`, `boolean`)

### Modifying Existing Tools

**Backward Compatibility Principle:**
- Do not delete existing parameters (mark as deprecated)
- New parameters must be optional (with default values)
- For breaking changes, add a new tool (e.g., `pionex_market_get_depth_v2`)

### Tool Testing

**Manual Testing:**
1. CLI test: `pionex-trade-cli <module> <command> [options]`
2. MCP test: Call in AI client
3. Error case testing:
   - Missing required parameters
   - Wrong parameter types
   - API returns errors (e.g., invalid symbol)

## Dependency Management

### Adding Dependencies

**Evaluation Criteria:**
1. Is it truly needed? Can it be hand-written?
2. What is the package size? (Check bundlephobia.com)
3. What is the maintenance status? (Last update, GitHub stars)
4. Are there security vulnerabilities? (`npm audit`)

**Decision Tree:**
- Simple functionality (<100 lines) → hand-write
- Utility libraries (lodash, dayjs) → consider alternatives (date-fns-tiny)
- Core dependencies (MCP SDK, TypeScript) → accept

### Updating Dependencies

**Frequency:** Check monthly (or immediately if security vulnerabilities exist)

**Commands:**
```bash
npm outdated                    # View outdated dependencies
npm update                      # Update minor/patch versions
npm install <pkg>@latest       # Update major versions
```

**Testing:** Run `npm run build` and manual testing after updates

## Performance Standards

### REST Client

**Principle:** No connection pooling, each request is independent
- **Rationale:** MCP server is short-lived, no need to optimize connection reuse
- **If Optimization Needed:** Consider HTTP/2 or introducing a connection pool library

### Build Artifacts

**Goal:** Minimize package size
- Use tsup tree-shaking (automatically removes unused code)
- Avoid introducing large dependencies (e.g., axios → use fetch)

**Current Size:**
- `@pionex/pionex-ai-kit`: ~50KB (dist/)
- `@pionex/pionex-trade-mcp`: ~60KB (dist/)

## Compatibility

### Node.js Versions

**Minimum Requirement:** Node.js 18
- **Rationale:** Uses native `fetch` API
- **Testing:** Test on Node 18/20/22 before each release

### MCP Clients

**Supported List:**
- Cursor
- Claude Desktop
- Claude Code
- Windsurf
- VS Code
- OpenClaw

**Testing Strategy:** Test setup and tool calls in actual environment when adding each new client

## Documentation Standards

### README.md

**Must Include:**
- Project overview (one sentence describing the purpose)
- Quick start (installation, configuration, usage)
- Feature list (tool modules)
- Examples (screenshots or code)

**When to Update:** When adding new features or changing the installation process

### CONTRIBUTING.md

**Must Include:**
- Development environment setup
- Build commands
- Release workflow

### specs/docs/TOOLS.md

**Must Include:**
- List and description of all tools
- Example prompts (how to have AI call the tools)

**When to Update:** Every time tools are added or modified

## Standards Evolution

### Proposing New Standards

**Process:**
1. Record the issue and proposal in iteration documents
2. Discuss and reach team consensus
3. Update this document
4. Enforce in new code

### Standards Exceptions

**Principle:** Standards serve code quality, not dogma
- If there is sufficient reason, standards can be violated (explain in code comments)
- Standards that are consistently violated need revision (the standard may be unreasonable)
