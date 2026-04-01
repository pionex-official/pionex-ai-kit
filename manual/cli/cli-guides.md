# CLI Guides

### Overview

The Pionex AI Kit ships two CLI commands:

| Command              | Purpose                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `pionex-ai-kit`    | Configuration wizard (`onboard`) and MCP client registration (`setup`)                             |
| `pionex-trade-cli` | Direct command-line access to Pionex market data, account balances, spot orders, and futures grid bots |

Both are installed from a single package:

```bash
npm install -g @pionex/pionex-ai-kit
```

---

### pionex-ai-kit

#### onboard — Configure Credentials

```bash
pionex-ai-kit onboard
```

Interactive wizard that prompts for:

* **Pionex API Key**
* **Pionex API Secret**

Credentials are written to `~/.pionex/config.toml` under the default profile.

> You can create an API Key at [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api).
>
> [API Key Guide](https://www.pionex.com/docs/api-docs/references/api-key-guide)

#### setup — Register MCP Server

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>
```

Writes the MCP server configuration for the specified AI client so it can launch `npx @pionex/pionex-trade-mcp`. No API keys are written to the client config.

Supported `--client` values:

| Client                       | Config File                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `cursor`                   | `~/.cursor/mcp.json`                                                    |
| `openclaw`                 | `~/.openclaw/workspace/config/mcporter.json`                            |
| `claude-desktop`           | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
| `claude-code` / `claude` | Runs `claude mcp add` (no file written)                                 |
| `windsurf`                 | `~/.codeium/windsurf/mcp_config.json`                                   |
| `vscode`                   | `.mcp.json` in the current project directory                            |

#### help

```bash
pionex-ai-kit help
```

---

### pionex-trade-cli

#### Usage

```
pionex-trade-cli <group> <command> [args] [--flags]
```

#### Global Flags

| Flag                 | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `--profile <name>` | Use a specific profile from `~/.pionex/config.toml`                 |
| `--base-url <url>` | Override the API base URL                                             |
| `--read-only`      | Disable write operations (order placement/cancellation)               |
| `--dry-run`        | Print the tool call payload without executing (write operations only) |

#### Credential Priority

1. **Environment variables** (highest): `PIONEX_API_KEY`, `PIONEX_API_SECRET`, `PIONEX_BASE_URL`
2. **`~/.pionex/config.toml`**: Fallback when environment variables are not set

---

### Commands

* [Trade Commands](cli-guides-trade.md) — Market data, account balances, and spot order operations
* [Bot Commands](cli-guides-bot.md) — Futures grid bot creation, management, and cancellation
* [Earn Dual Commands](cli-guides-earn.md) — Dual Investment: query products, invest, revoke, and collect earnings

---

### Output Format

All commands output JSON to stdout. Errors are written to stderr as JSON with an error payload.

**Example output:**

```bash
$ pionex-trade-cli market tickers --symbol BTC_USDT
{
  "tickers": [
    {
      "symbol": "BTC_USDT",
      "open": "67000.00",
      "close": "67500.00",
      "high": "68000.00",
      "low": "66500.00",
      "volume": "1234.56"
    }
  ]
}
```

### Security Best Practices

* **Never** commit `~/.pionex/config.toml` to version control or paste API keys in chat
* Use a **dedicated API key** with minimal permissions
* Use `--dry-run` to preview orders before executing
* Use `--read-only` to disable all write operations when you only need data
* Test with small trade sizes before going live
* Consider enabling IP whitelisting in your Pionex API settings
