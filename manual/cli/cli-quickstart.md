# CLI Quickstart

Pionex AI Kit provides two CLI commands:

* **`pionex-ai-kit`** — Configuration wizard and MCP client setup
* **`pionex-trade-cli`** — Direct command-line access to Pionex market data, account, and order operations

### Prerequisites

* Node.js >= 18

### Installation

#### 1. Install the CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

This installs both `pionex-ai-kit` and `pionex-trade-cli` commands.

#### 2. Configure API Credentials

Run the interactive wizard:

```bash
pionex-ai-kit onboard
```

Enter your Pionex API Key and Secret when prompted. Credentials are saved to `~/.pionex/config.toml`.

> You can create an API Key at [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api).
>
> [API Key Guide](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> If you only need public market data, you can skip this step.

#### 3. Verify the Installation

```bash
# Test market data (no API key needed)
pionex-trade-cli market tickers --symbol BTC_USDT

# Test account access (API key required)
pionex-trade-cli account balance
```

### Upgrade

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### Quick Examples

```bash
# Order book depth
pionex-trade-cli market depth BTC_USDT --limit 5

# Recent trades
pionex-trade-cli market trades BTC_USDT --limit 10

# Place a market buy order (dry-run)
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

### Next Steps

* See the [CLI User Guide](cli-guides.md) for the full command reference
