# Skills Guides

### Overview

Pionex Skills are high-level behavioral playbooks that tell AI agents how to safely and effectively use the `pionex-trade-cli` command line tool for cryptocurrency trading operations.

Unlike MCP (which defines tool interfaces), Skills also encode **risk controls and behavioral constraints** — such as checking balances before placing orders, respecting minimum order sizes, and using dry-run previews.

### Installation

```bash
# Install CLI
npm install -g @pionex/pionex-ai-kit

# Configure credentials (create API Key at https://www.pionex.com/my-account/api)
pionex-ai-kit onboard

# Install Skills
npx skills add pionex-official/pionex-skills
```

> You can create an API Key at [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api).
>
> [API Key Guide](https://www.pionex.com/docs/api-docs/references/api-key-guide)

### Skill List

| Skill                      | Description                                                                | API Key Required |
| -------------------------- | -------------------------------------------------------------------------- | ---------------- |
| **pionex-market**     | Public market data: order book depth, tickers, symbol info, klines, trades | No               |
| **pionex-portfolio**  | Account balance (spot)                                                     | Yes              |
| **pionex-trade**      | Spot orders: place, cancel, open orders, fills                             | Yes              |
| **pionex-bot**        | Futures grid bot: create, adjust, reduce, cancel, query                    | Yes              |
| **pionex-earn-dual**  | Dual Investment: query products & prices, invest, revoke, collect earnings | Partial          |

### Skill Routing

The agent automatically selects the appropriate skill based on user intent:

* Market data, prices, order book, klines -> **pionex-market**
* Balance, available funds -> **pionex-portfolio**
* Place/cancel orders, order status -> **pionex-trade**
* Futures grid bot create/adjust/reduce/cancel/query -> **pionex-bot**
* Dual Investment query/invest/revoke/collect -> **pionex-earn-dual**

---

### Skills

* [Trade Skills](skills-guides-trade.md) — Market data and spot order operations
* [Bot Skills](skills-guides-bot.md) — Futures grid bot creation, management, and cancellation
* [Earn Dual Skills](skills-guides-earn.md) — Dual Investment: query products, invest, revoke, collect earnings

---

### Cross-Skill Collaboration

Placing an order typically involves multiple skills working together:

```bash
# 1. Check current price and 24h range (pionex-market)
pionex-trade-cli market tickers --symbol BTC_USDT

# 2. Check symbol rules: min order size, precision (pionex-market)
pionex-trade-cli market symbols --symbols BTC_USDT

# 3. Check available balance (pionex-portfolio)
pionex-trade-cli account balance

# 4. Place the order (pionex-trade)
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01
```

### Security Best Practices

* **Never** commit `~/.pionex/config.toml` to version control or paste API keys in chat
* Use a **dedicated API key** with minimal permissions for the agent
* Test with small trade sizes before going live
* Consider enabling IP whitelisting in your Pionex API settings
