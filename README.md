## Pionex MCP Server (Node.js)

Node.js MCP server that exposes Pionex REST APIs as tools for Cursor, OpenClaw, and other MCP clients. Layout mirrors `gate-local-mcp`: `src/tools/common`, `src/tools/market`, `src/tools/account`, `src/tools/orders` (and optional `src/tools/websocket` later).

### Features

- **setup**: One-time wizard to add the server to Cursor or OpenClaw and save your API key locally.
- **common**: Shared client (signed GET/POST/DELETE), auth, and response helpers.
- **market** (public, no auth): `pionex.market.get_depth`, `pionex.market.get_trades`.
- **account** (auth): `pionex.account.get_balance`.
- **orders** (auth): `pionex.orders.new_order`, `pionex.orders.get_order`, `pionex.orders.get_order_by_client_order_id`, `pionex.orders.get_open_orders`, `pionex.orders.get_all_orders`, `pionex.orders.cancel_order`.
- **websocket**: Placeholder only; not implemented.

### Quick start (recommended)

No install. Run the setup wizard, then use the server from your IDE:

```bash
npx pionex-mcp-server setup
```

You’ll be prompted for:

- **Client**: Cursor, OpenClaw, or both.
- **Pionex API Key** and **API Secret** (stored only in your local MCP config).
- **Pionex Base URL** (optional; default `https://api.pionex.com`).

The script writes the Pionex MCP entry (with credentials) into:

- **Cursor**: `~/.cursor/mcp.json`
- **OpenClaw** main config: `~/.openclaw/openclaw.json`
- **OpenClaw mcporter** (for workspace tools): `~/.openclaw/workspace/config/mcporter.json`

Restart Cursor or OpenClaw after setup. The Pionex tools (market, account, orders) will then be available.

### Running the server (without setup)

If you prefer to configure by hand:

```bash
npx pionex-mcp-server
```

Set env vars before running (or in your client’s MCP config):

- `PIONEX_API_KEY` — required  
- `PIONEX_API_SECRET` — required  
- `PIONEX_BASE_URL` — optional (default `https://api.pionex.com`)

### Manual MCP configuration

Example config you can add yourself (same shape the setup command writes):

```json
{
  "mcpServers": {
    "pionex": {
      "command": "npx",
      "args": ["pionex-mcp-server"],
      "env": {
        "PIONEX_API_KEY": "your-key",
        "PIONEX_API_SECRET": "your-secret",
        "PIONEX_BASE_URL": "https://api.pionex.com"
      }
    }
  }
}
```

- **Cursor**: put this in `~/.cursor/mcp.json` (or merge into existing `mcpServers`).
- **OpenClaw 主配置**: put/merge into `~/.openclaw/openclaw.json` under `mcpServers`.
- **OpenClaw mcporter**: put/merge into `~/.openclaw/workspace/config/mcporter.json` under `mcpServers` so mcporter can also discover the `pionex` server.

