# pionex-mcp-server Quickstart Guide

An MCP (Model Context Protocol) server that exposes [Pionex](https://www.pionex.com) REST APIs to any MCP-compatible client (Cursor, OpenClaw, Claude Desktop, etc.).

## Features

- **Market data (public)** — depth and recent trades for any symbol, no API key required.
- **Account & orders (auth)** — balances and basic order management when `PIONEX_API_KEY` + `PIONEX_API_SECRET` are set.
- **Zero-copy setup** — `npx pionex-mcp-server setup` writes MCP config for you.

---

## Prerequisites

- **Node.js 18+** — verify with:

```bash
node --version
```

- A **Pionex account** — only needed for private/trading tools. Public market data works without credentials.

---

## Getting API Keys

1. Log in to [pionex.com](https://www.pionex.com)
2. Go to **API Management** (usually under profile / settings)
3. Create a new API key:
   - Grant only the permissions you need (read-only is enough for balances and order queries)
4. Copy the **API Key** and **Secret** (the secret is only shown once)
5. Optionally restrict to specific IPs for extra security

---

## One-line Setup (Cursor / OpenClaw)

From any terminal:

```bash
npx pionex-mcp-server setup
```

The wizard will ask for:

- Which client: **Cursor**, **OpenClaw**, or **Both**
- **PIONEX_API_KEY** and **PIONEX_API_SECRET**
- Optional **PIONEX_BASE_URL** (defaults to `https://api.pionex.com`)

It writes MCP config to:

- Cursor: `~/.cursor/mcp.json`
- OpenClaw main config: `~/.openclaw/openclaw.json`
- OpenClaw mcporter config: `~/.openclaw/workspace/config/mcporter.json`

Restart your client after the setup.

---

## Manual Agent Setup

If you prefer to configure MCP by hand, use:

```bash
npx pionex-mcp-server
```

and add this to your MCP config.

### Cursor (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "pionex": {
      "command": "npx",
      "args": ["pionex-mcp-server"],
      "env": {
        "PIONEX_API_KEY": "your-api-key",
        "PIONEX_API_SECRET": "your-api-secret",
        "PIONEX_BASE_URL": "https://api.pionex.com"
      }
    }
  }
}
```

### OpenClaw (`~/.openclaw/openclaw.json` + `~/.openclaw/workspace/config/mcporter.json`)

```json
{
  "mcpServers": {
    "pionex": {
      "command": "npx",
      "args": ["pionex-mcp-server"],
      "env": {
        "PIONEX_API_KEY": "your-api-key",
        "PIONEX_API_SECRET": "your-api-secret",
        "PIONEX_BASE_URL": "https://api.pionex.com"
      }
    }
  }
}

You can use the same `mcpServers.pionex` block in both:

- `~/.openclaw/openclaw.json` (OpenClaw main config)
- `~/.openclaw/workspace/config/mcporter.json` (so mcporter can also manage the Pionex MCP server)
```

---

## Environment Variables

| Variable           | Required | Default                   | Description                           |
|--------------------|----------|---------------------------|---------------------------------------|
| `PIONEX_API_KEY`   | No       | —                         | API key for authenticated endpoints   |
| `PIONEX_API_SECRET`| No       | —                         | API secret for authenticated endpoints|
| `PIONEX_BASE_URL`  | No       | `https://api.pionex.com`  | Override API base URL                 |

You can set these in your shell:

```bash
export PIONEX_API_KEY="your-key"
export PIONEX_API_SECRET="your-secret"
export PIONEX_BASE_URL="https://api.pionex.com"
```

---

## Example Prompts

Once connected to your agent, try:

**Market data (no API key):**

```text
Use the Pionex tools to show me the order book depth for BTC_USDT.
Use the Pionex tools to fetch the last 10 trades for ETH_USDT.
```

**Account & orders (API key required):**

```text
Use the Pionex tools to list my spot balances.
Use the Pionex tools to place a limit buy order for 0.01 BTC at 30000 USDT.
Use the Pionex tools to get the status of order 1234567890 for BTC_USDT.
Use the Pionex tools to cancel order 1234567890 for BTC_USDT.
```

---

## Using with mcporter (important for agents)

When calling Pionex tools via **mcporter**, make sure that:

- **Arguments are passed as top-level fields**, matching the tool schema:
  - ✅ Correct:
    ```bash
    mcporter call pionex pionex.orders.new_order \
      symbol="ADA_USDT" \
      side="BUY" \
      type="MARKET" \
      amount="5"
    ```
  - ❌ Incorrect (will wrap everything under `schema` and break parameter parsing):
    ```bash
    mcporter call 'pionex.pionex.orders.new_order(schema:{symbol:"ADA_USDT",side:"BUY",type:"MARKET",amount:"5"})'
    ```

The server now also has a compatibility fallback for `pionex.orders.new_order`:  
if a client mistakenly wraps parameters as `schema:{...}`, it will unwrap that object and still send the correct payload to Pionex. However, **new integrations should always pass arguments as top-level fields** to avoid surprises with other tools.

---

## Security Notes

- Never hardcode API keys into source code or commit them to git.
- If you only need market data, you can run without any API key.
- For trading, create a dedicated key with the minimum required permissions.
- Consider enabling IP whitelisting in the Pionex API settings when possible.

