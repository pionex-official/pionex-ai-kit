# Research: .mcpb Format

## .mcpb File Format

A `.mcpb` is a standard ZIP archive with the `.mcpb` extension. It is produced by `@anthropic-ai/mcpb` (v2.1.2).

### Directory structure inside the ZIP

```
manifest.json          ← required; describes the server
package.json
README.md
dist/
  index.js             ← entry point (compiled JS)
  server.js
node_modules/          ← bundled runtime dependencies
  @modelcontextprotocol/sdk/
  @anthropic-ai/mcpb/
  ...
```

JS is **not** a single bundle. The `mcpb pack` tool runs after `tsc`/tsup compilation and zips the output directory (excluding files listed in `.mcpbignore`).

### manifest.json schema (v0.3)

Key fields:
- `manifest_version`: `"0.3"`
- `server.type`: `"node"`
- `server.entry_point`: path to compiled JS entry
- `server.mcp_config.env`: maps env vars to `${user_config.*}` template vars
- `user_config`: defines fields Claude Desktop prompts the user to fill in; `sensitive: true` masks the value
- `tools`: static list (or `tools_generated: true` for dynamic)
- `compatibility.runtimes.node`: minimum Node version

### Build process

```json
"pack:mcpb": "npm run build && npx --no-install mcpb pack"
```

### GitHub Actions pattern (blofin-mcp)

```yaml
on:
  push:
    tags: ["v*"]
steps:
  - npm ci
  - npm run pack:mcpb
  - uses: softprops/action-gh-release@v2
    with:
      files: "*.mcpb"
```

## Decision: Source Sharing Strategy

`packages/mcpb/src/` duplicates `packages/mcp/src/` (index.ts + server.ts). Alternatives considered:

| Option | Pros | Cons |
|--------|------|------|
| Copy source files | Simple, self-contained | Two copies to keep in sync |
| Relative import from `../mcp/src/` | Single source | Breaks tsup bundling for mcpb |
| Extract to `@pionex-ai/core` | Clean | Invasive refactor, out of scope |

**Decision: copy** — the mcpb package is a standalone distribution artifact; keeping it self-contained is the right tradeoff. Server name changed from `pionex-trade-mcp` → `pionex-mcp` to match the manifest.

## Credential Flow in .mcpb

Claude Desktop injects `PIONEX_API_KEY` and `PIONEX_API_SECRET` from the user_config prompt into the process environment. The existing `loadConfig()` in `@pionex-ai/core` already reads from env vars first, so no code change is needed.
