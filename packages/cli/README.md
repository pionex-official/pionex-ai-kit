# @pionex/pionex-ai-kit

CLI for Pionex MCP: initializes credentials in **~/.pionex/config.toml**.

## Install

```bash
npm install -g @pionex/pionex-ai-kit
```

## Commands

- **pionex-ai-kit onboard** — Interactive wizard: API Key, API Secret, profile name. Writes `~/.pionex/config.toml`.
- **pionex-ai-kit setup** — Register MCP servers for supported clients.
- **pionex-ai-kit help** — Show help.
- **pionex-trade-cli market ...** — Public market data commands.
- **pionex-trade-cli account ...** — Account balance command.
- **pionex-trade-cli orders ...** — Spot order lifecycle commands.
- **pionex-trade-cli bot futures_grid ...** — Futures grid bot lifecycle commands (`get/create/adjust_params/reduce/cancel`).

The MCP server (**@pionex/pionex-trade-mcp**) reads from the same file. After init, run:

```bash
npm install -g @pionex/pionex-trade-mcp
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
```