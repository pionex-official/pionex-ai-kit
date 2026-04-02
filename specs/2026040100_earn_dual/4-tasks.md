# Task List — Earn Dual Investment

**Iteration:** `2026040100_earn_dual`

## Tasks

- [x] **Task 1: Add `earn_dual` module to constants**
  - File: `packages/core/src/constants.ts`
  - Add `"earn_dual"` to `MODULES` tuple
  - Add to `DEFAULT_MODULES` array
  - Verify: `ModuleId` type now includes `"earn_dual"`

- [x] **Task 2: Add `signedDeleteQuery` to REST client**
  - File: `packages/core/src/client/rest-client.ts`
  - Add `signedDeleteQuery<TData>(path, query)` method
  - Same pattern as `signedGet` but uses `DELETE` HTTP method
  - Verify: method compiles, matches signature construction spec

- [x] **Task 3: Create `earn-dual.ts` tool file**
  - File: `packages/core/src/tools/earn-dual.ts` (new)
  - Implement all 11 tools per tech design
  - Public tools (5): symbols, open_products, prices, index, delivery_prices → `publicGet`
  - View tools (3): balances → `signedGet`; get_invests → `signedPost`; records → `signedGet`
  - Earn/write tools (3): invest → `signedPost` isWrite=true; revoke_invest → `signedDeleteQuery` isWrite=true; collect → `signedPost` isWrite=true
  - Verify: all 11 tools exported from `registerEarnDualTools()`

- [x] **Task 4: Register tools in `index.ts`**
  - File: `packages/core/src/tools/index.ts`
  - Import `registerEarnDualTools` from `./earn-dual.js`
  - Add to `allToolSpecs()` return array
  - Verify: `allToolSpecs().length` increases by 11

- [x] **Task 5: Add `earn dual` CLI commands**
  - File: `packages/cli/src/index.ts`
  - Update `printPionexHelp()`: add `earn` to Groups section and examples
  - Add `earn` group handler in `runPionexCommand()` (after `bot` block)
  - Handle `earn dual` sub-route with all 11 commands
  - Write operations (`invest`, `revoke_invest`, `collect`) must check `dryRun`
  - Verify: `pionex-trade-cli earn dual` (no args) shows helpful error with usage hint

- [x] **Task 6: Build verification**
  - Run `npm run build` from repo root
  - Verify build succeeds with no TypeScript errors
  - Verify: `node packages/cli/dist/index.js earn dual symbols --help` (or similar) doesn't crash

- [x] **Task 7: Update docs**
  - Update `docs/requirements-overview.md`: add earn_dual module entry
  - Update `docs/tech-design-overview.md`: add earn-dual.ts and signedDeleteQuery
  - Update `docs/tech-memory-overview.md`: record iteration decisions
