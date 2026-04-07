# Technical Memory and Knowledge

This document records important decisions, lessons learned, and technical knowledge from the Pionex AI Kit development process.

## Last Updated

**Date:** 2026-04-02

## Iteration 2026040200: Bot Order List

**Added:** `pionex_bot_order_list` tool in `packages/core/src/tools/bot.ts`
**Endpoint:** `GET /api/v1/bot/orders`
**Key decisions:**
- This is a bot-level endpoint, NOT futures_grid-specific. `buOrderTypes` supports `futures_grid`, `spot_grid`, `smart_copy`. Omitting it returns all types.
- `buOrderTypes` serialized as comma-joined string since `buildQueryString` uses `URLSearchParams.set` (no repeated keys support). Revisit if API rejects comma format.
- No default for `buOrderTypes` — tool returns all types when omitted.
- CLI: `pionex-trade-cli bot order_list` (top-level, NOT under `futures_grid` sub-route).
- No `--dry-run` needed since this is a read-only (GET) operation.

## Project Initialization (Before 2026-03)

### Initial Architecture Decisions

**Decision: Monorepo Structure**
- **Context:** Needed to publish two independent npm packages (CLI and MCP) while sharing core code
- **Approach:** Use pnpm workspace to manage three packages (cli, mcp, core)
- **Rationale:** Avoid circular dependencies, simplify local development, core as a private package to avoid extra maintenance cost
- **Outcome:** Clean architecture, simple build process

**Decision: Minimal Dependencies**
- **Context:** MCP server starts via `npx`, installation speed affects user experience
- **Approach:** Production dependencies limited to `@modelcontextprotocol/sdk` and `smol-toml`
- **Rationale:** Reduce installation time, lower supply chain risk
- **Outcome:** Total dependencies under 5MB, fast installation

**Decision: Credential Storage in TOML File**
- **Context:** Needed persistent API key storage, avoiding manual entry each time
- **Approach:** Use `~/.pionex/config.toml` with multi-profile support
- **Rationale:** Text format is easy to manually edit, TOML is human-readable, avoids JSON escaping issues
- **Outcome:** Good user experience, supports multi-account scenarios

### Tool System Design

**Decision: Modular Tool Registration**
- **Context:** Needed to support tools with different permission levels (public vs authenticated)
- **Approach:** Group by functional domain into modules (market, account, orders, bot), each tool tagged with `module` and `isWrite`
- **Rationale:** Enables on-demand loading, supports read-only mode, modules can be independently toggled
- **Implementation:** `buildTools(config)` filters tools based on configuration
- **Outcome:** Flexible permission control, easy to extend

**Decision: ToolSpec as Unified Interface**
- **Context:** Both CLI and MCP need to call the same API tools
- **Approach:** Define `ToolSpec` interface containing handler, inputSchema, description
- **Rationale:** Avoid duplicate implementations, ensure consistent behavior
- **Implementation:** MCP converts via `toMcpTool()`, CLI calls via `createToolRunner()`
- **Outcome:** High code reuse, low maintenance cost

## Iteration 1: CLI & Skills Support (2026-03-18)

**Iteration Directory:** `specs/iterations/20260318_cli_skills/`

### Key Changes

1. **Added CLI Subcommand Support**
   - **Problem:** Original CLI only supported onboard and setup, could not directly execute trading commands
   - **Approach:** Added `pionex-trade-cli` alias, supporting `market`, `orders`, `bot` subcommands
   - **Implementation:** Reused `createToolRunner()` from core, parsed CLI arguments mapped to tool calls
   - **Lesson:** Hand-written CLI argument parsing is lighter than introducing `commander` library (zero-dependency goal)

2. **Futures Grid Bot Tools**
   - **Problem:** `buOrderDataJson` parameter is complex and error-prone
   - **Approach:** Introduced JSON Schema validation (`packages/core/src/schemas/futures-grid-create.ts`)
   - **Implementation:** `parseAndValidateCreateFuturesGridBuOrderData()` validates before API call
   - **Lesson:** Error messages need to clearly indicate missing fields and type errors to improve debugging experience

3. **Dry-run Mode**
   - **Problem:** Write operations (placing orders, creating Bots) need testing without actual execution
   - **Approach:** Added `--dry-run` flag, skips API calls when `config.readOnly` is set
   - **Implementation:** CLI argument parsing → passed to `loadConfig()` → affects `buildTools()` filtering
   - **Lesson:** Not fully implemented (tools still call APIs), need to add dry-run logic inside tool handlers

### Technical Debt

**Unimplemented Dry-run Logic**
- **Current State:** `--dry-run` flag filters out `isWrite: true` tools, but there is no real "simulated execution"
- **Impact:** Users cannot preview whether write operation parameters are correct
- **To Improve:** Check `config.readOnly` inside tool handlers, return simulated results instead of calling APIs

**CLI Argument Parsing**
- **Current State:** Hand-written parsing logic, supports both `--key=value` and `--key value` formats
- **Impact:** Verbose code, difficult to support complex arguments (e.g., arrays, nested objects)
- **To Improve:** If complex arguments are needed, consider introducing a lightweight CLI framework (e.g., `mri` ~500B)

## Iteration 2: Fills by Order ID & Book Tickers (Recent Update)

**Commit:** `cfd18cc` (before 2026-03-26)

### Key Changes

1. **Added `pionex_orders_get_fills_by_order_id` Tool**
   - **Requirement:** Query fill records for a specific order (rather than all fills)
   - **Implementation:** New tool in `packages/core/src/tools/orders.ts`
   - **API:** `GET /api/v1/trade/fills` with `orderId` parameter

2. **Added `pionex_market_get_book_tickers` Tool**
   - **Requirement:** Batch retrieve best bid/ask prices for all trading pairs
   - **Implementation:** New tool in `packages/core/src/tools/market.ts`
   - **API:** `GET /api/v1/market/bookTickers`

### Lessons

**Tool Naming Convention**
- Format: `pionex_<module>_<action>_<resource>`
- Example: `pionex_orders_get_fills_by_order_id`
- Rationale: Avoid naming conflicts with other MCP servers, maintain consistency

## Iteration 3: Earn Dual Investment (2026-04-01)

**Iteration Directory:** `specs/2026040100_earn_dual/`

### Key Decisions

1. **New module `earn_dual`** added to `MODULES` and `DEFAULT_MODULES` in `constants.ts`
   - Rationale: Dual Investment is a distinct product category from trading/bot, deserves its own module toggle

2. **`signedDeleteQuery` method added to `PionexRestClient`**
   - Problem: `DELETE /api/v1/earn/dual/invest` passes params as query string, not body
   - Existing `signedDelete` always puts params in request body
   - Approach: New method reuses `buildSignedRequest(method="DELETE", query, body=null)`, making the intent explicit
   - Why not modify existing `signedDelete`: would break bot cancel callers

3. **CLI `earn dual <command>` pattern mirrors `bot futures_grid <command>`**
   - `positionals[0]="earn"`, `positionals[1]="dual"`, `positionals[2]=command`
   - Rationale: Consistent with existing bot pattern; leaves room for future `earn <other-product>` routes

4. **`--client-dual-ids` parsed as comma-separated string → string array**
   - Rationale: CLI flags are strings; splitting on comma is consistent with other multi-value flags

5. **Write tools (`invest`, `revoke_invest`, `collect`) all support `--dry-run`**
   - Consistent with orders/bot pattern established in iteration 1

## Iteration 4: CLI Version Flag (2026-04-02)

**Iteration Directory:** `specs/2026040202_cli_version/`

### Key Decisions

1. **Version read via `createRequire(import.meta.url)("../package.json")`**
   - ESM-compatible, no build config changes needed
   - Works correctly in local dev (`dist/ → ../package.json`) and when installed globally via npm
   - Alternative (tsup `define`) rejected: more moving parts for a trivial read

2. **Version check added in both dispatch branches independently**
   - `main()` `pionex-ai-kit` branch: checks `cmd === "-v" || cmd === "--version"` before existing command dispatch
   - `runPionexCommand()` `pionex-trade-cli` branch: checks `argv[0]` at the very top, before `parseFlags`
   - Rationale: the two paths are independent (different argv slices), cleanest to handle each separately

3. **Fixed hardcoded `v0.2.x` in `onboard` banner**
   - Was a known tech-debt; iteration is the right time to fix it alongside dynamic version reading

## Iteration 5: CLI Commander Refactor (2026-04-04)

**Iteration Directory:** `specs/2026040400_cli_commander_refactor/`

### Motivation

The 928-line monolithic `packages/cli/src/index.ts` with hand-rolled `parseFlags()` was:
- Fragile (no validation of flag types, easy to miss flags)
- Impossible to extend without growing the already-large file
- Providing no `--help` output for AI agent self-discovery (issue #32)

The prior "zero-dependency" preference (recorded in Iteration 1) is superseded here —
`commander` v12 is ~50KB, well-maintained, and the CLI startup cost is not perf-critical.

### Key Decisions

1. **commander v12 as the parser** (not `mri`, `yargs`, `minimist`, or hand-rolled)
   - Commander has native ESM support, stable nested sub-commands, and automatic `--help`
   - The size tradeoff (~50KB) is acceptable for a CLI that users install, not `npx` on every call

2. **File split by domain**, not by type
   - `src/commands/market.ts`, `src/commands/bot.ts`, etc.
   - Entry point `src/index.ts` stays thin (~20 lines)
   - Keeps each file under 200 lines

3. **`cmd.optsWithGlobals()` for global options propagation**
   - Commander does not automatically inherit parent options in sub-command actions
   - `optsWithGlobals()` merges own + parent options, making `--profile`, `--dry-run`, etc. accessible in leaf commands

4. **camelCase aliases made implicit by commander**
   - `--bu-order-id` automatically becomes `opts.buOrderId` in commander
   - Old explicit camelCase aliases (`--buOrderId`) are no longer needed but can be hidden via `.hideHelp()` for backwards compat

5. **`capabilities` command added (issue #32)**
   - Static JSON, no network call
   - Designed for AI agent self-discovery in shell-based workflows

## General Technical Knowledge

### Pionex API Signature Mechanism

**Signature Algorithm:**
```
message = timestamp + method + path + body
signature = HMAC-SHA256(message, secret_key)
```

**Key Points:**
- `timestamp` is a 13-digit millisecond timestamp
- `body` is a JSON string (no spaces)
- `path` includes query string (if any)
- Headers: `PIONEX-KEY`, `PIONEX-SIGNATURE`, `PIONEX-TIMESTAMP`

**Common Errors:**
- Timestamp error (client time out of sync) → prompt to check system time
- Body format error (extra spaces, field order) → use `JSON.stringify` to standardize

### MCP Protocol Integration

**Stdio Communication**
- MCP server communicates with clients via stdin/stdout
- Client starts the server process and sends JSON-RPC requests
- Server responds with JSON-RPC results

**Tool Call Flow**
1. Client: `ListTools` → retrieve available tools
2. AI selects tools based on descriptions
3. Client: `CallTool(name, arguments)` → execute tool
4. Server: returns `CallToolResult` (success or error)

**Annotations**
- `readOnlyHint`: Whether the tool is read-only (affects AI decision-making)
- `destructiveHint`: Whether the tool has destructive operations
- `idempotentHint`: Whether repeated calls are idempotent

**Implementation Location:** `toMcpTool()` in `packages/core/src/tools/types.ts`

### TypeScript Module System

**ESM vs CJS**
- This project: Pure ESM (`"type": "module"` in package.json)
- Impact: Must use `.js` suffix for imports, even when source is `.ts`
- Rationale: Node.js ESM loader requires explicit extensions

**tsup Build**
- Single-file bundle: `entry: ["src/index.ts"]`, `format: ["esm"]`
- Type definitions: Auto-generates `.d.ts` files
- Shebang preservation: CLI needs `#!/usr/bin/env node`

### pnpm Workspace

**Dependency Management**
- Root `package.json` contains shared devDependencies
- Sub-packages reference local packages via `"@pionex-ai/core": "*"`
- `pnpm install` automatically links local dependencies

**Build Order**
- Manually controlled: `npm run build --workspace=@pionex-ai/core && ...`
- Rationale: pnpm does not automatically handle build dependency order

## Lessons Learned

### 1. Publishing Workflow

**Problem:** Initially forgot to synchronize version numbers across both packages
**Solution:** Established checklist:
1. Update `packages/cli/package.json` version
2. Update `packages/mcp/package.json` version
3. Run `npm run build`
4. Publish from each sub-directory: `npm publish`
5. Test: `npx @pionex/pionex-trade-mcp --help`

### 2. Credential Leakage Risk

**Problem:** Users might paste config.toml contents in chat when seeking help
**Solution:** Output security tips (bilingual) in onboard command
**Additional Measures:** Consider emphasizing "do not share API keys in chat" in MCP tool descriptions

### 3. Error Message Quality

**Problem:** Early versions threw raw API errors, users saw raw HTTP responses
**Solution:** Wrapped `PionexApiError` in `PionexRestClient`, extracting `result.message`
**Room for Improvement:** Provide actionable fix suggestions based on error codes (e.g., "Invalid signature" → "Check system time")

### 4. MCP Client Compatibility

**Problem:** Different clients have different config file formats (JSON vs JSONC)
**Solution:** `setup.ts` handles each client individually:
- Cursor: Pure JSON
- Claude Desktop: JSONC (supports comments)
- VS Code: Project-level `.mcp.json`

**Lesson:** Don't assume all clients behave the same, actually test each client

## Open Issues

### 1. Test Coverage

**Current State:** No automated tests
**Impact:** Easy to introduce bugs during refactoring, relies on manual testing
**Plan:** Add unit tests (tool handlers, signature logic) and integration tests (MCP call flow)

### 2. Logging System

**Current State:** Only outputs to stderr on errors
**Impact:** Difficult to debug, cannot trace API call history
**Plan:** Add optional debug logging (environment variable `DEBUG=pionex:*`)

### 3. Rate Limiting Handling

**Current State:** No rate limit detection, users may trigger API rate limiting
**Impact:** API returns 429 errors, users don't know how to respond
**Plan:** Detect 429 responses, return friendly message + retry suggestions

## Reference Resources

### Internal Documentation
- `CONTRIBUTING.md` — Development and publishing workflow
- `specs/docs/TOOLS.md` — Tool usage guide (user-facing)
- `specs/iterations/*/PRD.md` — Iteration requirement documents

### External Resources
- [Pionex API Documentation](https://pionex-doc.gitbook.io/api-zh-hans/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [tsup Documentation](https://tsup.egoist.dev/)

## Knowledge Capture Guidelines

**When Adding New Tools, Record:**
1. API endpoint and parameter descriptions
2. Common error codes and handling approaches
3. Tool description writing principles (how to help AI better understand the purpose)

**When Encountering Bugs, Record:**
1. Problem symptoms and reproduction steps
2. Root cause analysis
3. Fix approach and alternatives
4. How to prevent similar issues (coding standards or checklists)
