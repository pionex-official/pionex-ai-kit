# Pionex AI Kit — Quickstart

MCP (Model Context Protocol) server that exposes [Pionex](https://www.pionex.com) REST APIs to Cursor, OpenClaw, Claude Desktop, Windsurf, VS Code, and other MCP clients. Credentials are stored in **~/.pionex/config.toml**; the client config only stores how to run the server (no keys in env).

## Features

- **Market data (public)** — depth, trades, symbol info; no API key required.
- **Account & orders (auth)** — balances and order management when configured in `~/.pionex/config.toml`.
- **Two-package flow** — **@pionex/pionex-ai-kit** for onboarding; **@pionex/pionex-trade-mcp** for the MCP server and client registration.

---

## Prerequisites

- **Node.js 18+**

  ```bash
  node --version
  ```

- A **Pionex account** (only needed for private/trading tools; public market data works without credentials).

---

## Getting API Keys

1. Log in to [pionex.com](https://www.pionex.com).
2. Go to **API Management** (profile / settings).
3. Create a new API key with only the permissions you need (read-only is enough for balances and order queries).
4. Copy the **API Key** and **Secret** (the secret is shown only once).
5. Optionally restrict to specific IPs.

---

## 1. Install

```bash
npm install -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

---

## 2. Configure credentials

Run the onboarding wizard (writes **~/.pionex/config.toml**):

```bash
pionex-ai-kit onboard
```

You will be prompted for:

- **Pionex API Key**
- **Pionex API Secret**
- **Profile name** (default: `default`)

---

## 3. Register the MCP server with your client

Register the server so your IDE/client can start it (no keys are written to the client config):

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
```

Supported clients:

| Option | Config file |
|--------|-------------|
| `--client cursor` | `~/.cursor/mcp.json` |
| `--client claude-desktop` | Claude Desktop config (path depends on OS) |
| `--client windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| `--client vscode` | `.mcp.json` in current directory |

Then **restart your client** (Cursor, Claude Desktop, etc.).

---

## Manual setup (no wizard)

If you prefer not to use `pionex-ai-kit onboard`, create **~/.pionex/config.toml** yourself:

```toml
default_profile = "default"

[profiles.default]
api_key = "your-api-key"
secret_key = "your-api-secret"
base_url = "https://api.pionex.com"
```

If you prefer not to use `pionex-ai-kit setup`, add the server to your MCP config by hand. The server reads credentials from `~/.pionex/config.toml`, so **do not** put keys in `env`.

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "pionex-trade-mcp"]
    }
  }
}
```

---

## Environment variables (optional)

You can override the TOML profile with env vars when the server runs. Env values can come from:

- Your shell (e.g. `export PIONEX_API_KEY=...`)  
- The MCP client config (`env` block inside `mcpServers.pionex-trade-mcp` for Cursor / Claude Desktop / etc.)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PIONEX_API_KEY` | No | — | API key for private endpoints |
| `PIONEX_API_SECRET` | No | — | API secret for signing |
| `PIONEX_BASE_URL` | No | `https://api.pionex.com` | API base URL |

Priority when the server starts:

1. **Env vars** (from shell or MCP client config)  
2. **`~/.pionex/config.toml`** (selected profile) — used only when a given env var is missing

---

## Example prompts

After the MCP server is connected:

**Market (no API key):**

- “Use the Pionex tools to show the order book depth for BTC_USDT.”
- “Use the Pionex tools to fetch the last 10 trades for ETH_USDT.”
- “Get symbol info for BTC_USDT.”

**Account & orders (API key required):**

- “Use the Pionex tools to list my spot balances.”
- “Use the Pionex tools to place a limit buy order for 0.01 BTC at 30000 USDT on BTC_USDT.”
- “Use the Pionex tools to get the status of order &lt;orderId&gt; for BTC_USDT.”
- “Use the Pionex tools to cancel order &lt;orderId&gt; for BTC_USDT.”

---

## Using with mcporter (OpenClaw)

When calling Pionex tools via **mcporter**, pass arguments as **top-level fields** matching the tool schema:

- ✅ Correct:

  ```bash
  mcporter call pionex pionex.orders.new_order \
    symbol="ADA_USDT" side="BUY" type="MARKET" amount="5"
  ```

- ❌ Incorrect (wrapping under `schema` can break parsing):

  ```bash
  mcporter call 'pionex.pionex.orders.new_order(schema:{...})'
  ```

The server has a compatibility fallback for `schema:{...}` for some tools, but new integrations should pass arguments as top-level fields.

---

## Security

- Never hardcode API keys or commit `~/.pionex/config.toml` to git.
- For market data only, you can run without any API key (or use a read-only key).
- For trading, use a dedicated key with minimum permissions and consider IP whitelisting.
