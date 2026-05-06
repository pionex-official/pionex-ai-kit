# Tech Design: .mcpb Claude Desktop Installer

## New Files

### `packages/mcpb/manifest.json`
`.mcpb` manifest (v0.3). Defines:
- `user_config`: `api_key` + `api_secret` (both `sensitive: true`)
- `server.mcp_config.env`: injects `PIONEX_API_KEY`/`PIONEX_API_SECRET` from user_config
- `tools`: static list of all 22 tools (matches what `buildTools()` exposes with full auth)
- `compatibility.runtimes.node`: `">=18"`

### `packages/mcpb/package.json`
Private package (`"private": true`), not published to npm.
- `devDependencies`: `@anthropic-ai/mcpb: ^2.1.2`
- Scripts: `build` (tsup), `pack:mcpb` (build + mcpb pack)

### `packages/mcpb/tsup.config.ts`
Same as `packages/mcp/tsup.config.ts` but `sourcemap: false` (smaller output for distribution).
`noExternal: ["@pionex-ai/core"]` — bundles core into dist.

### `packages/mcpb/src/index.ts`
Copy of `packages/mcp/src/index.ts` — identical logic, no functional change.

### `packages/mcpb/src/server.ts`
Copy of `packages/mcp/src/server.ts` with one change:
- `SERVER_NAME = "pionex-mcp"` (was `"pionex-trade-mcp"`)

### `packages/mcpb/.mcpbignore`
Excludes: `src/`, `*.ts`, `*.map`, `tsconfig.json`, `tsup.config.ts`, `.gitignore`, `.mcpbignore`

### `packages/mcpb/tsconfig.json`
Standard NodeNext config, same as mcp package.

### `.github/workflows/release-mcpb.yml`
Triggered on `v*` tag push. Steps:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (node 20)
3. `npm install`
4. `npm run build` (root — builds core → cli → mcp → mcpb)
5. `npx mcpb pack` in `packages/mcpb/`
6. `softprops/action-gh-release@v2` uploads `packages/mcpb/*.mcpb`

## Modified Files

### `package.json` (root)
Add `packages/mcpb` to build order:
```
npm run build --workspace=@pionex-ai/core
  && npm run build --workspace=@pionex/pionex-ai-kit
  && npm run build --workspace=@pionex/pionex-trade-mcp
  && npm run build --workspace=@pionex/pionex-mcp   ← add
```

### `README.md` (root)
Add "Claude Desktop — One-Click Install (.mcpb)" section under Quick Start, before the existing npm-based setup. Link to GitHub Releases for download.

### `packages/mcp/README.md`
Add a brief note: "For Claude Desktop, a one-click `.mcpb` installer is available — see the main README."

## Credential Flow

```
Claude Desktop UI
  → user enters api_key, api_secret
  → stored securely by Claude Desktop
  → injected as PIONEX_API_KEY, PIONEX_API_SECRET into the Node process
  → loadConfig() reads env vars (priority 1)
  → PionexRestClient uses them for signed requests
```

No changes to `loadConfig()` or `PionexRestClient` required.
