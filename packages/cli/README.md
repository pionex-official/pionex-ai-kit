# pionex-ai-kit

CLI for Pionex MCP: initializes credentials in **~/.pionex/config.toml**.

## Install

```bash
npm install -g pionex-ai-kit
```

## Commands

- **pionex-ai-kit config init** — Interactive wizard: API Key, API Secret, profile name. Writes `~/.pionex/config.toml`.
- **pionex-ai-kit help** — Show help.

The MCP server (**pionex-trade-mcp**) reads from the same file. After init, run:

```bash
npm install -g pionex-trade-mcp
pionex-trade-mcp setup --client cursor
```
