# @pionex/pionex-trade-mcp

MCP server for Pionex. Reads credentials from **~/.pionex/config.toml** (no env vars needed in client config).

## Install

```bash
npm install -g @pionex/pionex-trade-mcp
```

## Setup

1. Create config (if not done yet):  
   `pionex-ai-kit onboard` (from **@pionex/pionex-ai-kit**).

2. Register with your AI client using the CLI:
   ```bash
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
   ```
   Supported: `cursor`, `claude-desktop`, `windsurf`, `vscode`, `claude-code`, `open_claw`.

3. Restart Cursor (or your client).

Credentials are read from `~/.pionex/config.toml` when the server starts; the client config (e.g. `~/.cursor/mcp.json`) only needs the command (e.g. `npx -y pionex-trade-mcp`), with no `env` for keys.

## Tools

- **Market** (no auth): `pionex.market.get_depth`, `pionex.market.get_trades`, `pionex.market.get_symbol_info`, `pionex.market.get_tickers`, `pionex.market.get_klines`
- **Account** (auth): `pionex.account.get_balance`
- **Orders** (auth): `pionex.orders.new_order`, `pionex.orders.get_order`, `pionex.orders.get_order_by_client_order_id`, `pionex.orders.get_open_orders`, `pionex.orders.get_all_orders`, `pionex.orders.cancel_order`, `pionex.orders.get_fills`, `pionex.orders.cancel_all_orders`
