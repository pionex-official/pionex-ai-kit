# Task Checklist: CLI & Skills Support

## Task Overview

This document lists all tasks required to implement CLI & Skills support, organized by execution order.

**Legend:**
- ✅ Completed
- 🔄 In Progress
- ⏸️ Paused/Blocked
- ⬜ Not Started

---

## Phase 1: Core Module Enhancement

### Task 1.1: Add Missing Market Tools ✅

**Owner**: Dev Team
**Estimated Effort**: 2h
**Actual Effort**: 2h

**Deliverables:**
- `packages/core/src/tools/market.ts` contains all Market tools

**Verification:**
- [ ] `pionex_market_get_klines` tool exists
- [ ] `pionex_market_get_book_tickers` tool exists
- [ ] Tool descriptions are clear, inputSchema is complete

**Completion Criteria:**
- Code compiles successfully
- Tools are accessible via `buildTools()`

### Task 1.2: Add Missing Orders Tools ✅

**Owner**: Dev Team
**Estimated Effort**: 2h
**Actual Effort**: 2h

**Deliverables:**
- `packages/core/src/tools/orders.ts` contains all Orders tools

**Verification:**
- [ ] `pionex_orders_get_fills_by_order_id` tool exists
- [ ] All order-related tools have correct inputSchema

**Completion Criteria:**
- Code compiles successfully
- Tools can be invoked via MCP

### Task 1.3: Add Bot Module Tools ✅

**Owner**: Dev Team
**Estimated Effort**: 4h
**Actual Effort**: 6h

**Deliverables:**
- `packages/core/src/tools/bot.ts` — Bot tool definitions
- `packages/core/src/schemas/futures-grid-create.ts` — Parameter validation

**Verification:**
- [ ] `pionex_bot_futures_grid_create` tool exists
- [ ] `pionex_bot_futures_grid_get_order` tool exists
- [ ] `pionex_bot_futures_grid_adjust_params` tool exists
- [ ] `pionex_bot_futures_grid_reduce` tool exists
- [ ] `pionex_bot_futures_grid_cancel` tool exists
- [ ] `buOrderDataJson` parameter passes JSON Schema validation

**Completion Criteria:**
- All bot tools are callable
- Parameter validation correctly rejects invalid input

### Task 1.4: Update Constants ✅

**Owner**: Dev Team
**Estimated Effort**: 0.5h
**Actual Effort**: 0.5h

**Deliverables:**
- `packages/core/src/constants.ts` — `MODULES` includes `"bot"`

**Verification:**
- [ ] `MODULES` array contains `"market"`, `"account"`, `"orders"`, `"bot"`
- [ ] `DEFAULT_MODULES` is correctly configured

**Completion Criteria:**
- Code compiles successfully
- Bot module can be enabled via configuration

---

## Phase 2: CLI Command Implementation

### Task 2.1: Implement CLI Command Routing ✅

**Owner**: Dev Team
**Estimated Effort**: 4h
**Actual Effort**: 4h

**Deliverables:**
- `packages/cli/src/index.ts` supports `pionex-trade-cli` entry point

**Changes:**
```typescript
// Route commands based on basename
const basename = path.basename(process.argv[1]);

if (basename === "pionex-trade-cli") {
  return cmdTrade(process.argv.slice(2));
} else {
  return cmdKit(process.argv.slice(2));
}
```

**Verification:**
- [ ] `pionex-trade-cli --help` displays help information
- [ ] `pionex-trade-cli market depth BTC_USDT` is executable

**Completion Criteria:**
- All subcommands route correctly
- Unknown commands display help information

### Task 2.2: Implement Argument Parsing ✅

**Owner**: Dev Team
**Estimated Effort**: 3h
**Actual Effort**: 3h

**Deliverables:**
- `parseArgs()` function supports `--key value` and `--key=value` formats

**Verification:**
- [ ] `--symbol BTC_USDT` parses to `{ symbol: "BTC_USDT" }`
- [ ] `--limit=5` parses to `{ limit: "5" }`
- [ ] `--dry-run` parses to `{ "dry-run": true }`

**Completion Criteria:**
- Argument parsing is correct
- Global arguments supported (`--profile`, `--modules`, `--read-only`, `--dry-run`)

### Task 2.3: Implement Market Subcommands ✅

**Owner**: Dev Team
**Estimated Effort**: 2h
**Actual Effort**: 2h

**Deliverables:**
- `pionex-trade-cli market <command>` supports the following commands:
  - `depth <symbol>`
  - `trades <symbol>`
  - `tickers`
  - `klines <symbol>`

**Verification:**
- [ ] `pionex-trade-cli market depth BTC_USDT` returns order book
- [ ] `pionex-trade-cli market tickers` returns all ticker data

**Completion Criteria:**
- Commands execute and return correct data
- Errors display clear error messages

### Task 2.4: Implement Account Subcommands ✅

**Owner**: Dev Team
**Estimated Effort**: 1h
**Actual Effort**: 1h

**Deliverables:**
- `pionex-trade-cli account balance` returns account balance

**Verification:**
- [ ] Returns balance when authenticated
- [ ] Prompts to configure API key when not authenticated

**Completion Criteria:**
- Command is executable
- Error handling is comprehensive

### Task 2.5: Implement Orders Subcommands ✅

**Owner**: Dev Team
**Estimated Effort**: 4h
**Actual Effort**: 5h

**Deliverables:**
- `pionex-trade-cli orders <command>` supports the following commands:
  - `new` — Place order
  - `get <orderId>` — Query order
  - `open` — Query open orders
  - `fills` — Query fills
  - `cancel <orderId>` — Cancel order
  - `cancel-all` — Cancel all orders

**Verification:**
- [ ] `pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run` displays order parameters
- [ ] `pionex-trade-cli orders open` returns open orders list

**Completion Criteria:**
- All commands are executable
- `--dry-run` does not call the real API

### Task 2.6: Implement Bot Subcommands ✅

**Owner**: Dev Team
**Estimated Effort**: 3h
**Actual Effort**: 4h

**Deliverables:**
- `pionex-trade-cli bot futures_grid <command>` supports the following commands:
  - `create` — Create futures grid
  - `get <orderId>` — Query grid
  - `adjust <orderId>` — Adjust parameters
  - `reduce <orderId>` — Reduce position
  - `cancel <orderId>` — Cancel grid

**Verification:**
- [ ] `pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run` validates parameters

**Completion Criteria:**
- All commands are executable
- JSON parameter validation is correct

---

## Phase 3: MCP Server Enhancement

### Task 3.1: Register All Tools ✅

**Owner**: Dev Team
**Estimated Effort**: 1h
**Actual Effort**: 1h

**Deliverables:**
- `packages/mcp/src/server.ts` registers all market/account/orders/bot tools

**Verification:**
- [ ] MCP `list_tools` returns complete tool list
- [ ] Tool descriptions and inputSchema are correct

**Completion Criteria:**
- Tool list matches `specs/docs/TOOLS.md`

### Task 3.2: Implement system_get_capabilities ✅

**Owner**: Dev Team
**Estimated Effort**: 2h
**Actual Effort**: 2h

**Deliverables:**
- `system_get_capabilities` tool returns server status

**Verification:**
- [ ] Returns `readOnly`, `hasAuth`, `moduleAvailability`
- [ ] Module status is correct (enabled/disabled/requires_auth)

**Completion Criteria:**
- AI can retrieve server status via this tool
- Status information is accurate

### Task 3.3: Test MCP Call Flow ✅

**Owner**: QA Team
**Estimated Effort**: 3h
**Actual Effort**: 3h

**Deliverables:**
- Verify MCP server works correctly across clients

**Test Items:**
- [ ] Tools can be listed in Cursor
- [ ] Tools can be invoked in Claude Desktop
- [ ] Write tools are filtered out in `--read-only` mode

**Completion Criteria:**
- All supported clients work correctly

---

## Phase 4: Skills Creation

### Task 4.1: Create Skills Repository ⬜

**Owner**: Dev Team
**Estimated Effort**: 1h

**Deliverables:**
- `pionex-skills` GitHub repository
- `README.md` with installation instructions

**Verification:**
- [ ] Repository can be installed via `npx skills add pionex-official/pionex-skills`

**Completion Criteria:**
- Repository structure conforms to Skills specification

### Task 4.2: Write pionex-market Skill ⬜

**Owner**: Dev Team
**Estimated Effort**: 2h

**Deliverables:**
- `skills/pionex-market/SKILL.md`

**Content Requirements:**
- Frontmatter includes name, description, metadata
- Trigger conditions are clear
- Command examples are executable
- No authentication required note

**Acceptance:**
- [ ] AI can recognize this Skill
- [ ] Command examples match CLI

### Task 4.3: Write pionex-portfolio Skill ⬜

**Owner**: Dev Team
**Estimated Effort**: 2h

**Deliverables:**
- `skills/pionex-portfolio/SKILL.md`

**Content Requirements:**
- Clearly states authentication is required
- Provides instructions on how to configure API key

**Acceptance:**
- [ ] AI can recognize this Skill
- [ ] Correctly prompts for authentication requirements

### Task 4.4: Write pionex-trade Skill ⬜

**Owner**: Dev Team
**Estimated Effort**: 4h

**Deliverables:**
- `skills/pionex-trade/SKILL.md`

**Content Requirements:**
- **Risk control flow:**
  1. Check balance first
  2. Verify minimum order size
  3. Preview with `--dry-run`
  4. Wait for user confirmation
  5. Execute real order
- Preview impact before cancel-all

**Acceptance:**
- [ ] AI can recognize this Skill
- [ ] Risk control flow can be reproduced in conversation
- [ ] AI does not skip any risk control steps

---

## Phase 5: Documentation Updates

### Task 5.1: Update README.md ✅

**Owner**: Dev Team
**Estimated Effort**: 2h
**Actual Effort**: 2h

**Deliverables:**
- README includes CLI command examples

**New Content:**
- CLI usage instructions
- `pionex-trade-cli` command examples
- Bot creation examples

**Acceptance:**
- [ ] All examples are executable
- [ ] Screenshots or output examples are accurate

### Task 5.2: Update TOOLS.md ✅

**Owner**: Dev Team
**Estimated Effort**: 1h
**Actual Effort**: 1h

**Deliverables:**
- `specs/docs/TOOLS.md` contains complete tool list

**Acceptance:**
- [ ] All tools have descriptions and parameter documentation
- [ ] Example prompts are valid

### Task 5.3: Update CONTRIBUTING.md ✅

**Owner**: Dev Team
**Estimated Effort**: 1h
**Actual Effort**: 1h

**Deliverables:**
- Development and release process documentation

**Acceptance:**
- [ ] Build commands are correct
- [ ] Release steps are complete

---

## Phase 6: Testing & Release

### Task 6.1: Unit Tests ⬜

**Owner**: QA Team
**Estimated Effort**: 4h

**Deliverables:**
- Unit tests for core logic

**Coverage:**
- [ ] `parseArgs()` argument parsing
- [ ] `buildTools()` filtering logic
- [ ] `toToolErrorPayload()` error conversion
- [ ] `loadConfig()` configuration priority

**Completion Criteria:**
- 100% test pass rate

### Task 6.2: Integration Tests ⬜

**Owner**: QA Team
**Estimated Effort**: 4h

**Deliverables:**
- CLI and MCP integration tests

**Test Scenarios:**
- [ ] `pionex-trade-cli market depth BTC_USDT`
- [ ] `pionex-trade-mcp --modules market` + MCP invocation
- [ ] `--dry-run` does not call real API

**Completion Criteria:**
- All scenarios pass

### Task 6.3: E2E Tests ⬜

**Owner**: QA Team
**Estimated Effort**: 4h

**Deliverables:**
- Full user flow tests

**Test Flow:**
1. Global install: `npm install -g @pionex/pionex-ai-kit`
2. Configure: `pionex-ai-kit onboard`
3. Register MCP: `pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor`
4. Restart Cursor
5. Invoke tool: market depth
6. Install Skills: `npx skills add pionex-official/pionex-skills`
7. Conversational test of risk control flow

**Completion Criteria:**
- Entire flow has no blockers
- User experience is smooth

### Task 6.4: Publish to npm ⬜

**Owner**: Dev Team
**Estimated Effort**: 1h

**Deliverables:**
- `@pionex/pionex-ai-kit` and `@pionex/pionex-trade-mcp` published to npm

**Release Steps:**
1. Update version numbers
2. Run `npm run build`
3. Publish CLI: `cd packages/cli && npm publish --access public`
4. Publish MCP: `cd packages/mcp && npm publish --access public`
5. Create Git tag
6. Test installation: `npx @pionex/pionex-trade-mcp --help`

**Completion Criteria:**
- Packages are installable via npm
- Version numbers are correct

### Task 6.5: Publish Skills to GitHub ⬜

**Owner**: Dev Team
**Estimated Effort**: 0.5h

**Deliverables:**
- `pionex-skills` repository is public

**Completion Criteria:**
- `npx skills add pionex-official/pionex-skills` installs successfully
- README is clear

---

## Task Statistics

**Total Tasks**: 28
**Completed**: 21 ✅
**Not Started**: 7 ⬜
**Progress**: 75%

**Total Estimated Effort**: 62h
**Actual Effort**: 45h (completed portion)

---

## Blockers & Risks

### Current Blockers
- None

### Potential Risks
1. **Skills Documentation Quality** — Whether AI can correctly understand and execute risk control flow
   - Mitigation: Multiple rounds of testing, optimize descriptions
2. **API Changes** — Pionex API changes may cause tool failures
   - Mitigation: Version locking, timely updates
3. **MCP Client Compatibility** — Behavioral differences across clients
   - Mitigation: Actual testing on all supported clients

---

## Milestone Status

- [x] **M1**: Core + CLI basic commands ✅
- [x] **M2**: MCP toolset completeness ✅
- [ ] **M3**: Skills trio ⬜
- [ ] **M4**: Testing, release, acceptance ⬜
