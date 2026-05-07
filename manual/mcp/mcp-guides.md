# MCP Guides

### Overview

`@pionex/pionex-trade-mcp` is an MCP (Model Context Protocol) Server that exposes Pionex exchange capabilities as standardized tools to AI clients. It supports market data queries, account balance lookups, order management, and futures grid bot operations.

#### Design Principles

* **Local-first**: The MCP Server runs as a local process. API keys are stored in environment variables or `~/.pionex/config.toml`, never in chat history.
* **MCP-native**: Compatible with any MCP-compliant client.
* **Credential safety**: Client configuration only stores the server launch command — no API keys are written there.

### Installation

```bash
npm install -g @pionex/pionex-ai-kit
```

You can either:

* Rely on `npx @pionex/pionex-trade-mcp` to fetch the latest version on demand when the server starts
* Manually run `npm install -g @pionex/pionex-trade-mcp` to pin a specific global version

### Credential Configuration

#### Interactive Wizard

```bash
pionex-ai-kit onboard
```

The wizard will prompt for:

* **Pionex API Key**
* **Pionex API Secret**
* **Profile name** (default: `default`)

Configuration is written to `~/.pionex/config.toml`. Multiple profiles are supported — set `default_profile` to choose the active one.

> You can create an API Key at [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api).
>
> [API Key Guide](https://www.pionex.com/docs/api-docs/references/api-key-guide)

#### Credential Priority

When the MCP Server starts, credentials are resolved in the following order:

1. **Environment variables** (highest priority):
   * `PIONEX_API_KEY`
   * `PIONEX_API_SECRET`
   * `PIONEX_BASE_URL`
   * These can come from your shell (`export ...`) or from the MCP client config (`env` field)
2. **`~/.pionex/config.toml`**: Used as a fallback only when the corresponding environment variable is missing

### Registering the MCP Server

#### Automatic Setup (Recommended)

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client-name>
```

**Restart your client** after registration.

Supported clients:

| `--client`                   | Config File Written                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| `cursor`                   | `~/.cursor/mcp.json`                                                    |
| `openclaw`                 | `~/.openclaw/workspace/config/mcporter.json`                            |
| `claude-desktop`           | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
| `claude-code` / `claude` | No file written; runs `claude mcp add` command                          |
| `windsurf`                 | `~/.codeium/windsurf/mcp_config.json`                                   |
| `vscode`                   | `.mcp.json` in the current project directory                            |

#### Manual Setup

If you prefer not to use the `setup` command, add the server entry to your client config manually.

**Cursor** (`~/.cursor/mcp.json`):

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

**Claude Desktop**, **VS Code**, and other clients use the same format — just keep `"command"` and `"args"` consistent. Credentials are read from `~/.pionex/config.toml`, so **no API keys need to be placed** in the config.

### Tool Reference

* [Trade Tools](mcp-guides-trade.md) — Market data and spot order operations
* [Wallet Tools](mcp-guides-wallet.md) — Account balances and full account overview
* [Bot Tools](mcp-guides-bot.md) — Futures grid bot creation, management, and cancellation
* [Earn Dual Tools](mcp-guides-earn.md) — Dual Investment: query products, invest, revoke, and collect earnings

### Example Prompts

#### Market Queries (No API Key Required)

* "Use the Pionex tools to show the order book depth for BTC_USDT."
* "Use the Pionex tools to fetch the last 10 trades for ETH_USDT."
* "Get symbol info for BTC_USDT and ADA_USDT."

#### Account & Order Operations (API Key Required)

* "Use the Pionex tools to list my spot balances."
* "Use the Pionex tools to place a limit buy order for 0.01 BTC at 30000 USDT on BTC_USDT."
* "Use the Pionex tools to get the status of order `<orderId>` for BTC_USDT."
* "Use the Pionex tools to cancel order `<orderId>` for BTC_USDT."

#### Bot Operations (API Key Required)

* "Use the Pionex tools to create a long futures grid bot for BTC_USDT with price range 60000–80000, 50 grids, 5x leverage, and 1000 USDT investment."
* "Use the Pionex tools to get the status of my futures grid bot `<buOrderId>`."
* "Use the Pionex tools to add 500 USDT margin to my futures grid bot `<buOrderId>`."
* "Use the Pionex tools to reduce 10 positions from my futures grid bot `<buOrderId>`."
* "Use the Pionex tools to cancel my futures grid bot `<buOrderId>`."

#### Dual Investment (API Key Required for most)

* "Use the Pionex tools to list all open BTC dual investment products for the UP direction."
* "Use the Pionex tools to get the current yield rate for product BTC-USDT-260402-70000-C-USDT."
* "Use the Pionex tools to invest 100 USDT in the BTC dual investment product BTC-USDT-260402-70000-C-USDT."
* "Use the Pionex tools to show my dual investment balance."
* "Use the Pionex tools to collect my settled dual investment earnings."

### Security Best Practices

* **Never** commit `~/.pionex/config.toml` to version control or paste API keys in chat
* Use a **dedicated API key** with minimal permissions for the agent
* Test with small trade sizes before going live
* Consider enabling IP whitelisting in your Pionex API settings
