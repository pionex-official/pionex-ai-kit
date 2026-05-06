# Requirements: .mcpb Claude Desktop One-Click Installer

## Background

Issue #45 proposes shipping a `.mcpb` package — Claude Desktop's native MCP plugin format — so users can install Pionex MCP with a single double-click, without any command-line setup.

A community contributor opened the proposal following CONTRIBUTING.md ("open an issue first for non-trivial changes") and attached a working reference zip. The project owner confirmed the approach and assigned implementation to @liyifan.

## Goals

1. **`packages/mcpb/`** — new package that produces `pionex-mcp.mcpb` (a ZIP with `manifest.json` + compiled JS)
2. **GitHub Actions release workflow** — on every `v*` tag, auto-build and upload the `.mcpb` to the GitHub Release as a downloadable asset
3. **README update** — document the new installation path in root `README.md` and `packages/mcp/README.md`

## Out of Scope

- Changes to existing `@pionex/pionex-trade-mcp` npm package
- Changes to CLI or core logic
- Publishing `packages/mcpb` to npm (it's a private distribution package)

## Acceptance Criteria

- [ ] `packages/mcpb/manifest.json` is valid — passes `npx mcpb validate`
- [ ] `npm run build` (root) succeeds including the mcpb package
- [ ] `npx mcpb pack` (in `packages/mcpb/`) produces `pionex-mcp.mcpb`
- [ ] GitHub Actions workflow triggers on `v*` tags and uploads `*.mcpb` to the release
- [ ] Root README has a "Claude Desktop (one-click)" section explaining the `.mcpb` install path
- [ ] No API keys or secrets are hardcoded anywhere

## Reference

- Issue: https://github.com/pionex-official/pionex-ai-kit/issues/45
- Reference implementation: blofin-mcp releases (https://github.com/blofin/blofin-mcp/releases)
- `.mcpb` format: `@anthropic-ai/mcpb` npm package, manifest v0.3
