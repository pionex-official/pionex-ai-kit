# Pionex AI Kit (monorepo)

One Git repo, **two published npm packages** (no need to split repos):

| Package | Role |
|--------|------|
| **@pionex/pionex-ai-kit** | CLI: `pionex-ai-kit onboard` — interactive wizard that writes **~/.pionex/config.toml** (API key, secret, base URL). |
| **@pionex/pionex-trade-mcp** | MCP server: reads credentials from **~/.pionex/config.toml**, exposes Pionex tools; configure via `pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>`. |

Internal package (not published): **@pionex-ai/core** — shared config path `~/.pionex/config.toml`, TOML read/write, and setup helpers (bundled into the two published packages).

---

## 1. Install

```bash
npm install -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

Or install only one:

- **@pionex/pionex-ai-kit** — if you only want the config wizard (`pionex-ai-kit onboard`).
- **@pionex/pionex-trade-mcp** — if you only want the MCP server (you can still create `~/.pionex/config.toml` by hand or with `pionex-ai-kit onboard` from the other package).

---

## 2. Configure credentials (~/.pionex/config.toml)

Run the interactive wizard (from **pionex-ai-kit**):

```bash
pionex-ai-kit onboard
```

You will be prompted for:

- **Pionex API Key**
- **Pionex API Secret**
- **Profile name** (default: `default`)

Config is written to **~/.pionex/config.toml**. You can add multiple profiles and set `default_profile` in that file.

**Credential priority (when `pionex-trade-mcp` starts):**

- **1. Environment variables** — `PIONEX_API_KEY`, `PIONEX_API_SECRET`, `PIONEX_BASE_URL`  
  - Can come from your shell (`export ...`) **or** from the MCP client config (`env` field in `mcp.json` / `claude_desktop_config.json` / etc.).
- **2. `~/.pionex/config.toml` profile** — used as a fallback **only when the corresponding env var is missing**.

The MCP server itself never writes your API keys into client configs; it only reads from env and `~/.pionex/config.toml`.

---

## 3. Register the MCP server with your AI client

After credentials are in place, register the server so your client (Cursor, Claude Desktop, etc.) can start it:

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
```
Then **restart Cursor** (or your client). The client config only stores the command to run the server (e.g. `npx -y pionex-trade-mcp`); **no API keys are written there** — they are read from `~/.pionex/config.toml` when the server starts.

Supported clients:

| `--client`       | Config file written |
|------------------|---------------------|
| `cursor`         | `~/.cursor/mcp.json` |
| `openclaw`       | `~/.openclaw/workspace/config/mcporter.json` |
| `claude-desktop` | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`; Windows/Linux: see [Claude docs](https://docs.anthropic.com/claude/docs/model-context-protocol) |
| `windsurf`       | `~/.codeium/windsurf/mcp_config.json` |
| `vscode`         | `.mcp.json` in the **current directory** (project-level) |


---

## 4. Manual MCP configuration (no setup command)

If you prefer not to use `pionex-ai-kit setup`, add the server entry yourself. Credentials are still read from `~/.pionex/config.toml` by the server, so you **do not** need to put keys in `env`.

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

**Claude Desktop** (config path depends on OS): same shape — `"command": "npx"`, `"args": ["-y", "pionex-trade-mcp"]`, no `env` for keys.

**VS Code** (project `.mcp.json`): use `"command": "pionex-trade-mcp"` if the binary is on your PATH, or `"command": "npx"` with `"args": ["-y", "pionex-trade-mcp"]`.

---

## 5. MCP tools

| Area | Tools | Auth |
|------|--------|-----|
| **Market** | `pionex.market.get_depth`, `pionex.market.get_trades`, `pionex.market.get_symbol_info`, `pionex.market.get_tickers`, `pionex.market.get_klines` | No |
| **Account** | `pionex.account.get_balance` | Yes |
| **Orders** | `pionex.orders.new_order`, `pionex.orders.get_order`, `pionex.orders.get_order_by_client_order_id`, `pionex.orders.get_open_orders`, `pionex.orders.get_all_orders`, `pionex.orders.cancel_order`, `pionex.orders.get_fills`, `pionex.orders.cancel_all_orders` | Yes |

---

## 6. Example prompts (after MCP is connected)

**Market (no API key needed):**

- “Use the Pionex tools to show the order book depth for BTC_USDT.”
- “Use the Pionex tools to fetch the last 10 trades for ETH_USDT.”
- “Get symbol info for BTC_USDT and ADA_USDT.”

**Account & orders (API key required):**

- “Use the Pionex tools to list my spot balances.”
- “Use the Pionex tools to place a limit buy order for 0.01 BTC at 30000 USDT on BTC_USDT.”
- “Use the Pionex tools to get the status of order &lt;orderId&gt; for BTC_USDT.”
- “Use the Pionex tools to cancel order &lt;orderId&gt; for BTC_USDT.”

---

## 7. Security

- **Never** commit `~/.pionex/config.toml` or paste API keys in chat.
- Prefer a **dedicated API key** with minimal permissions for the agent.
- For trading, test on small size first; consider IP whitelisting in Pionex API settings.

---

## 8. Develop in this repo

```bash
npm install
npm run build
```

- **pionex-ai-kit**: `node packages/cli/dist/index.js help` / `node packages/cli/dist/index.js onboard`
- **pionex-trade-mcp**: `node packages/mcp/dist/index.js --help`

---

## 9. Publish (two packages from one repo)

```bash
cd packages/cli && npm publish --access public   # publishes @pionex/pionex-ai-kit
cd packages/mcp && npm publish --access public  # publishes @pionex/pionex-trade-mcp
```

Publish order does not matter; neither package depends on the other. Core is private and bundled into both.

---

## 10. Legacy entrypoints

The old root-level `cli.mjs` / `server.mjs` and `src/` are superseded by `packages/cli` and `packages/mcp`. You can remove them once you no longer need the previous single-package flow.
