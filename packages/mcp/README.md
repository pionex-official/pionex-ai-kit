# pionex-trade-mcp

MCP server for Pionex. Reads credentials from **~/.pionex/config.toml** (no env vars needed in client config).

## Install

```bash
npm install -g pionex-trade-mcp
```

## Setup

1. Create config (if not done yet):  
   `pionex-ai-kit config init` (from **pionex-ai-kit**).

2. Register with your AI client:
   ```bash
   pionex-trade-mcp setup --client cursor
   ```
   Supported: `cursor`, `claude-desktop`, `windsurf`, `vscode`.

3. Restart Cursor (or your client).

Credentials are read from `~/.pionex/config.toml` when the server starts; the client config (e.g. `~/.cursor/mcp.json`) only needs the command (e.g. `npx -y pionex-trade-mcp`), with no `env` for keys.

## Tools

- **Market** (no auth): `pionex.market.get_depth`, `pionex.market.get_trades`, `pionex.market.get_symbol_info`
- **Account** (auth): `pionex.account.get_balance`
- **Orders** (auth): `pionex.orders.new_order`, `pionex.orders.get_order`, `pionex.orders.get_open_orders`, etc.
