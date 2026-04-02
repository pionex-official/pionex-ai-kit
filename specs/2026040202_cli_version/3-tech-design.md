# Technical Design: CLI Version Flag

**Iteration:** `2026040202_cli_version`

## Affected Files

Only one file changes:

- `packages/cli/src/index.ts` — add version reading + handle `-v`/`--version` in both dispatch paths

No changes to `packages/core/` or `packages/mcp/`.

## Version Reading

Use `createRequire` from `node:module` to load `package.json` at runtime. This is the standard Node.js ESM pattern and works correctly both in local development (`dist/index.js → ../package.json`) and when installed globally via npm (`<global>/dist/index.js → <global>/package.json`).

```typescript
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
const { version } = _require("../package.json") as { version: string };
```

**Why not tsup `define`?** Would require modifying `tsup.config.ts` and adding a global type declaration. More moving parts for a simple read.

**Why not `readFileSync` + `import.meta.url`?** More verbose; `createRequire` is the idiomatic Node.js ESM JSON import pattern.

## Dispatch Changes

### `pionex-ai-kit` branch (`main()` function)

Add `-v` / `--version` before the existing `onboard`/`setup`/`help` checks:

```typescript
if (cmd === "-v" || cmd === "--version") {
  process.stdout.write(version + "\n");
  return;
}
```

### `pionex-trade-cli` branch (`runPionexCommand()`)

Add version check at the top of `runPionexCommand`, before `parseFlags`:

```typescript
const firstArg = argv[0];
if (firstArg === "-v" || firstArg === "--version") {
  process.stdout.write(version + "\n");
  return;
}
```

### `onboard` header fix

Replace hardcoded `"pionex-ai-kit v0.2.x"` with the dynamic version:

```typescript
// Before
process.stdout.write("\n  pionex-ai-kit v0.2.x\n");

// After
process.stdout.write(`\n  pionex-ai-kit v${version}\n`);
```

## No Schema / API Changes

This feature is pure CLI; no tools, no MCP protocol changes, no docs/tech-api-overview.yaml update needed.
