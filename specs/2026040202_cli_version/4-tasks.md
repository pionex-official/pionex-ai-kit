# Task List: CLI Version Flag

**Iteration:** `2026040202_cli_version`

## Tasks

### Task 1: Add dynamic version reading to `packages/cli/src/index.ts`

**File:** `packages/cli/src/index.ts`

Add the following import at the top of the file alongside the existing `node:` imports:

```typescript
import { createRequire } from "node:module";
const _require = createRequire(import.meta.url);
const { version } = _require("../package.json") as { version: string };
```

**Verify:** TypeScript compiles without error (`npm run build` in `packages/cli`).

---

### Task 2: Handle `-v`/`--version` in `pionex-ai-kit` dispatch path

**File:** `packages/cli/src/index.ts`, inside `main()`, in the `invokedAs.includes("pionex-ai-kit")` branch.

Add before the existing `if (cmd === "onboard")` check:

```typescript
if (cmd === "-v" || cmd === "--version") {
  process.stdout.write(version + "\n");
  return;
}
```

**Verify:** `node packages/cli/dist/index.js -v` (invoked as `pionex-ai-kit`) prints the version.

---

### Task 3: Handle `-v`/`--version` in `pionex-trade-cli` dispatch path

**File:** `packages/cli/src/index.ts`, inside `runPionexCommand()`, at the very top before `parseFlags`.

Add:

```typescript
const firstArg = argv[0];
if (firstArg === "-v" || firstArg === "--version") {
  process.stdout.write(version + "\n");
  return;
}
```

**Verify:** `node packages/cli/dist/index.js -v` (invoked as `pionex-trade-cli`) prints the version.

---

### Task 4: Fix hardcoded version in `onboard` header

**File:** `packages/cli/src/index.ts`, inside `cmdOnboard()`.

Replace:

```typescript
process.stdout.write("\n  pionex-ai-kit v0.2.x\n");
```

With:

```typescript
process.stdout.write(`\n  pionex-ai-kit v${version}\n`);
```

**Verify:** Running `onboard` shows the real version (e.g. `v0.2.36`), not `v0.2.x`.

---

### Task 5: Build and smoke-test

```bash
cd /Users/liyifan/project/mcp/pionex-ai-kit
npm run build
```

Then verify all acceptance criteria:

```bash
# Should print version and exit 0
node packages/cli/dist/index.js -v
node packages/cli/dist/index.js --version
```

Manually confirm the `onboard` banner reads the correct version by inspecting the output of `node packages/cli/dist/index.js onboard` (or checking source).
