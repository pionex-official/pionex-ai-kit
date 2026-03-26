# Pionex AI Kit Docs

This folder provides task‑oriented documentation for **`@pionex/pionex-trade-mcp`** and **`@pionex/pionex-ai-kit`**, inspired by the structure of `agent-trade-kit/docs`.

The main audience is:

- Users who want to connect Cursor / Claude / Windsurf / VS Code to Pionex
- Agent developers who want to understand what tools exist and how to call them safely

---

## Documents

- `TOOLS.md` – **Tool catalog** for the current MCP server:
  - Market tools (no API key required)
  - Account tools
  - Order tools
  - Example prompts and how the descriptions help agents choose tools

Planned (but not yet added, to keep the surface small while the project is young):

- `configuration.md` – install, credentials, multi‑profile examples, and MCP client config snippets
- `faq.md` – common error codes, troubleshooting connection/auth issues
- `modules/*.md` – deep dives per future module (bots, VIP endpoints, etc.)

---

## How this maps to the code

- MCP tools are registered in TypeScript under `packages/mcp/src/tools/**`.
- `packages/mcp/src/run-server.ts` wires the tools into the MCP server.
- `@pionex/pionex-ai-kit` (`packages/cli`) provides:
  - `pionex-ai-kit onboard` – writes `~/.pionex/config.toml`
  - `pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>` – writes MCP client config using `npx @pionex/pionex-trade-mcp`.

If you add new tools or modules, update `TOOLS.md` in the same style so agents (and humans) can immediately see what’s available.

