# Requirements: CLI Version Flag

**Iteration:** `2026040202_cli_version`
**Date:** 2026-04-02
**Related Issue:** #18

## Background

Users and maintainers need a quick way to check which version of the CLI is installed without running a full command or inspecting `node_modules`. Standard CLI convention is `-v` / `--version`.

## Current State

Neither `pionex-ai-kit` nor `pionex-trade-cli` supports `-v` or `--version`. Running them with these flags results in an error:

```
$ pionex-ai-kit -v
Unknown command: -v. Run 'pionex-ai-kit help'.
```

```
$ pionex-trade-cli -v
# (no output, unhandled flag falls through to runPionexCommand which treats it as an unknown group)
```

## Requirements

### FR-1: `pionex-ai-kit -v` and `pionex-ai-kit --version`

Print the package version and exit with code 0:

```
$ pionex-ai-kit -v
0.2.36
```

### FR-2: `pionex-trade-cli -v` and `pionex-trade-cli --version`

Print the package version and exit with code 0:

```
$ pionex-trade-cli -v
0.2.36
```

Both binaries are aliases for the same `dist/index.js` in `packages/cli`, so the version is the same value from `packages/cli/package.json`.

### FR-3: Version shown in `onboard` header stays in sync

The `onboard` command currently hardcodes `"pionex-ai-kit v0.2.x"` (line 33 of `packages/cli/src/index.ts`). Update it to use the dynamic version so it never goes stale.

## Non-Requirements

- No `--version` flag for the MCP server (`pionex-trade-mcp`) — out of scope for this iteration, separate binary.
- No machine-readable JSON output; plain version string only.

## Acceptance Criteria

- [ ] `pionex-ai-kit -v` prints version string (e.g. `0.2.36`) and exits 0
- [ ] `pionex-ai-kit --version` same behavior
- [ ] `pionex-trade-cli -v` prints version string and exits 0
- [ ] `pionex-trade-cli --version` same behavior
- [ ] `pionex-ai-kit onboard` header shows real version, not `v0.2.x`
- [ ] Version value is read dynamically from `package.json`, not hardcoded
- [ ] Build passes (`npm run build`)
