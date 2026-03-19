# @pionex/pionex-trade-mcp

MCP server for Pionex. Reads credentials from **~/.pionex/config.toml** (no env vars needed in client config).

## Install & Setup

1. Create config (if not done yet):  
   `pionex-ai-kit onboard` (from **@pionex/pionex-ai-kit**).

2. Register with your AI client using the CLI:
   ```bash
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw
   ```
   Supported: `cursor`, `claude-desktop`, `windsurf`, `vscode`, `claude-code`, `openclaw`.

3. Restart Cursor (or your client).

Credentials are read from `~/.pionex/config.toml` when the server starts; the client config (e.g. `~/.cursor/mcp.json`) only needs a command such as:

```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "@pionex/pionex-trade-mcp"]
    }
  }
}
```

## Tools

- **Market** (no auth): `pionex_market_get_depth`, `pionex_market_get_trades`, `pionex_market_get_symbol_info`, `pionex_market_get_tickers`, `pionex_market_get_klines`
- **Account** (auth): `pionex_account_get_balance`
- **Orders** (auth): `pionex_orders_new_order`, `pionex_orders_get_order`, `pionex_orders_get_order_by_client_order_id`, `pionex_orders_get_open_orders`, `pionex_orders_get_all_orders`, `pionex_orders_cancel_order`, `pionex_orders_get_fills`, `pionex_orders_cancel_all_orders`
