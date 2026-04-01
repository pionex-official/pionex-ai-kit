# Pionex AI Kit

[![CI](https://img.shields.io/badge/CI-no%20status-lightgrey)](#)
[![coverage](https://img.shields.io/badge/codecov-unknown-lightgrey)](#)
[![npm: kit](https://img.shields.io/npm/v/@pionex/pionex-ai-kit?label=pionex-ai-kit)](https://www.npmjs.com/package/@pionex/pionex-ai-kit)
[![npm downloads: kit](https://img.shields.io/npm/dt/@pionex/pionex-ai-kit?label=kit+total+downloads)](https://www.npmjs.com/package/@pionex/pionex-ai-kit)
[![npm: mcp](https://img.shields.io/npm/v/@pionex/pionex-trade-mcp?label=pionex-trade-mcp)](https://www.npmjs.com/package/@pionex/pionex-trade-mcp)
[![npm downloads: mcp](https://img.shields.io/npm/dt/@pionex/pionex-trade-mcp?label=mcp+total+downloads)](https://www.npmjs.com/package/@pionex/pionex-trade-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

English | [简体中文](README.zh-hans.md) | [繁體中文](README.zh-hant.md)

Pionex AI Kit — an AI-powered trading toolkit with two standalone packages:

| Package                      | Description                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pionex/pionex-ai-kit`    | CLI for onboarding and configuring MCP clients; runs `pionex-ai-kit onboard` to write `~/.pionex/config.toml` (API key, secret, base URL).                 |
| `@pionex/pionex-trade-mcp` | MCP server that reads credentials from `~/.pionex/config.toml` and exposes Pionex trading tools to Cursor, Claude Desktop, and other MCP-compatible clients. |

---

## What is this?

Pionex AI Kit provides you with a complete set of AI Agent infrastructure for connecting to Pionex, including MCP, Skills, and CLI. It supports mainstream AI Agents such as Cursor, Claude, OpenClaw, Windsurf, and VSCode.

Instead of jumping between your AI and the exchange UI, you describe what you want — the AI calls tools on the local MCP server and executes the right API calls on Pionex.

- **Local-first**: runs as a local process; API keys live in env vars or `~/.pionex/config.toml`, never in chat history.
- **Two entrypoints**: CLI for onboarding & setup, MCP server for tool calls.
- **MCP-native**: works with any MCP-compatible client.

---

## Features

### MCP

MCP servers for trading on Pionex.

| Package                            | Area                         | Tools                                                                                                                                                                                                                                                                                                                    | Auth |
| ---------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| **@pionex/pionex-trade-mcp** | **Market**             | `pionex_market_get_depth`, `pionex_market_get_trades`, `pionex_market_get_symbol_info`, `pionex_market_get_tickers`, `pionex_market_get_book_tickers`, `pionex_market_get_klines`                                                                                                                            | No   |
|                                    | **Account**            | `pionex_account_get_balance`                                                                                                                                                                                                                                                                                           | Yes  |
|                                    | **Orders**             | `pionex_orders_new_order`, `pionex_orders_get_order`, `pionex_orders_get_order_by_client_order_id`, `pionex_orders_get_open_orders`, `pionex_orders_get_all_orders`, `pionex_orders_cancel_order`, `pionex_orders_get_fills`, `pionex_orders_get_fills_by_order_id`, `pionex_orders_cancel_all_orders` | Yes  |
|                                    | **Bot / Futures Grid** | `pionex_bot_futures_grid_get_order`, `pionex_bot_futures_grid_create`, `pionex_bot_futures_grid_adjust_params`, `pionex_bot_futures_grid_reduce`, `pionex_bot_futures_grid_cancel`                                                                                                                             | Yes  |
|                                    | **Earn / Dual**        | `pionex_earn_dual_symbols`, `pionex_earn_dual_open_products`, `pionex_earn_dual_prices`, `pionex_earn_dual_index`, `pionex_earn_dual_delivery_prices`, `pionex_earn_dual_balances`, `pionex_earn_dual_get_invests`, `pionex_earn_dual_records`, `pionex_earn_dual_invest`, `pionex_earn_dual_revoke_invest`, `pionex_earn_dual_collect` | Partial (public + auth) |

---

### Skills

| Skill                                                                                                        | Description                                                  | Auth |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---- |
| [pionex-market](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-market/SKILL.md)       | Public market data: depth, tickers, symbols, klines, trades  | No   |
| [pionex-portfolio](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-portfolio/SKILL.md) | Account balance (spot)                                       | Yes  |
| [pionex-trade](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-trade/SKILL.md)         | Spot orders: place, cancel, open orders, fills               | Yes  |
| [pionex-bot](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-bot/SKILL.md)             | Futures Grid Bot: get, create, adjust params, reduce, cancel | Yes  |
| pionex-earn-dual                                                                                                  | Dual Investment: query products, invest, revoke, collect     | Partial |

### CLI

**`pionex-trade-cli`** — Direct command-line access to Pionex market data, account, orders, futures grid bot, and Dual Investment operations

---

## Quick Start

### **Install**

**Prerequisites:** Node.js ≥ 18

```bash
# 1. Install the Kit
npm install -g @pionex/pionex-ai-kit

# 2. Configure Pionex API credentials (interactive wizard)
pionex-ai-kit onboard

# 3. Setup the MCP server with your AI client (Choose whatever you're using)
# This setup will write the appropriate MCP config for your client 
# so it can start the server using `npx @pionex/pionex-trade-mcp`.

pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf
pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode
pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw

# 4. Install skills
npx skills add pionex-official/pionex-skills
```

### Examples

<details>
<summary><strong>MCP Examples</strong></summary>

**Order book**

In your AI client, ask: *"Use the Pionex tools to show the order book depth for BTC_USDT."*

The agent will call the MCP tool and display the bids and asks.

<img src="assets/images/orderbook-btc-usdt.png" width="50%" />

**Futures Grid Bot (long BTC grid)**

In your AI client, ask: *"Use the Pionex tools to create a BTC long futures grid: invest 100 USDT, upper bound 100000, lower bound 50000, 30 grid rows, 3x leverage."*

The agent should call `pionex_bot_futures_grid_create` with matching `base`, `quote`, and `buOrderData`.

<img src="assets/images/btc-bot-create.png" width="50%" />

**Dual Investment — find low-strike BTC products**

In your AI client, ask: *"Use the Pionex tools to find BTC Dual Investment products where I invest USDT and receive BTC if the price drops below the strike at expiry — show me the available strikes and their current yields."*

The agent will call `pionex_earn_dual_open_products` (type=DUAL_CURRENCY) then `pionex_earn_dual_prices` to retrieve investable products and live yields.

<img src="assets/images/dual-open-products.png" width="50%" />

</details>

<details>
<summary><strong>Skills Examples</strong></summary>

**Order book**

In your AI client, ask: *"Use the Pionex skills to show the order book depth 5 for BTC_USDT."*

The agent will use the Pionex market skill and display the bids and asks.

<img src="assets/images/orderbook-btc-usdt-skill.png" width="75%" />

**Futures Grid Bot (long BTC grid)**

In your AI client, ask: *"Use the Pionex bot skill to create a BTC long futures grid: 100 USDT margin, price range 50000–100000, 30 rows, 3x leverage."*

The agent will follow the `pionex-bot` skill and use the CLI or MCP tools as documented there.

<img src="assets/images/btc-bot-create-skill.png" width="75%" />

**Dual Investment — find low-strike BTC products**

In your AI client, ask: *"Use the Pionex skills to find BTC Dual Investment products where I invest USDT and receive BTC if the price drops below the strike at expiry — show me the available strikes and their current yields."*

<img src="assets/images/dual-open-products-skill.png" width="75%" />

</details>

<details>
<summary><strong>CLI Examples</strong></summary>

**Order book & orders**

```
# Order book depth
pionex-trade-cli market depth BTC_USDT --limit 5

# Recent trades
pionex-trade-cli market trades BTC_USDT --limit 10

# Place a market buy order (dry-run)
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

**Futures Grid Bot (long BTC grid)**

Create a long futures grid on BTC/USDT: 100 USDT quoted investment, upper bound 100000, lower bound 50000, 30 rows, 3× leverage (dry-run first):

```
pionex-trade-cli bot futures_grid create \
  --base BTC \
  --quote USDT \
  --bu-order-data-json '{"top":"100000","bottom":"50000","row":30,"grid_type":"arithmetic","trend":"long","leverage":3,"quoteInvestment":"100"}' \
  --dry-run
```

Remove `--dry-run` to submit the order for real.

**Dual Investment (earn dual)**

```
# List open BTC DUAL_BASE products (BTC/ETH use quote=USDXO)
pionex-trade-cli earn dual open-products --base BTC --quote USDXO --type DUAL_BASE --currency USDT

# Invest 100 USDT (dry-run first)
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0039 \
  --dry-run
```

</details>

---

## Manual

- [`manual/`](manual/)

---

## Changelog

- [`CHANGELOG.md`](CHANGELOG.md)

---

## Security

- **Never** commit `~/.pionex/config.toml` or paste API keys in chat.
- Prefer a **dedicated API key** with minimal permissions for the agent.
- For trading, test on small size first; consider IP whitelisting in Pionex API settings.

---

## Contributing

Development, build, and publish instructions live in [`CONTRIBUTING.md`](CONTRIBUTING.md).
