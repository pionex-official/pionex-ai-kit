English | [简体中文](CONTRIBUTING.zh-hans.md) | [繁體中文](CONTRIBUTING.zh-hant.md)

# Contributing to Pionex AI Kit

This repository is a monorepo that ships two npm packages:

- `@pionex/pionex-ai-kit` (CLI)
- `@pionex/pionex-trade-mcp` (MCP server)

Core utilities live in the private `@pionex-ai/core` package and are bundled into both.

---

## Develop in this repo

```bash
npm install
npm run build
```

Run the built artifacts:

- **CLI** (`@pionex/pionex-ai-kit`):  
  `node packages/cli/dist/index.js help`  
  `node packages/cli/dist/index.js onboard`

- **MCP server** (`@pionex/pionex-trade-mcp`):  
  `node packages/mcp/dist/index.js --help`

---

## Publish (two packages from one repo)

From the repo root:

```bash
cd packages/cli && npm publish --access public   # publishes @pionex/pionex-ai-kit
cd ../mcp && npm publish --access public        # publishes @pionex/pionex-trade-mcp
```

The publish order does not matter; neither package depends on the other.  
The shared `@pionex-ai/core` package is private and bundled into both public packages.

---

## Guidelines

- Keep API surface changes backwards compatible whenever possible.
- Do not add any code that logs or leaks API keys or sensitive account data.
- For non‑trivial changes, open an issue or proposal first to discuss the design.

