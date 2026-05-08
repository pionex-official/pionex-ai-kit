# Trade Skills

### pionex-market: Market Data

All commands are read-only and **do not require API credentials**.

#### Command Reference

| Command                                                                             | Description                                                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pionex-trade-cli market depth <symbol> [--limit <n>]`                              | Order book depth (bids/asks); limit 1–100, default 5           |
| `pionex-trade-cli market trades <symbol> [--limit <n>]`                             | Recent public trades; limit 1–100                              |
| `pionex-trade-cli market symbols [--symbols <list>] [--type SPOT\|PERP]`            | Symbol metadata (precision, min size); comma-separated symbols |
| `pionex-trade-cli market tickers [--symbol <s>] [--type SPOT\|PERP]`                | 24h ticker: open, close, high, low, volume                     |
| `pionex-trade-cli market book_tickers [--symbol <s>] [--type SPOT\|PERP]`           | Best bid/ask ticker(s)                                         |
| `pionex-trade-cli market klines <symbol> <interval> [--endTime <ms>] [--limit <n>]` | OHLCV klines; interval: 1M, 5M, 15M, 30M, 60M, 4H, 8H, 12H, 1D |

#### Examples

```bash
# Order book depth (5 levels)
pionex-trade-cli market depth BTC_USDT --limit 5

# Last 10 trades
pionex-trade-cli market trades BTC_USDT --limit 10

# Symbol precision and minimum order size
pionex-trade-cli market symbols --symbols BTC_USDT

# 24h ticker
pionex-trade-cli market tickers --symbol BTC_USDT

# 4-hour klines (last 24 candles)
pionex-trade-cli market klines BTC_USDT 4H --limit 24
```

---

### pionex-portfolio: Account Balance

Queries spot account balances. **Requires API credentials**.

#### Command

| Command                             | Description                         |
| ----------------------------------- | ----------------------------------- |
| `pionex-trade-cli account balance` | All spot balances, returned as JSON |

#### Usage Example

* User: "How much USDT do I have?"
* Agent runs `pionex-trade-cli account balance`, then extracts the USDT available balance from the JSON response

---

### pionex-trade: Spot Trading

Spot order placement and management. **Requires API credentials**.

#### Command Reference

| Command                                                                                                                   | Type  | Description                         |
| ------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| `pionex-trade-cli orders new --symbol <s> --side BUY\|SELL --type MARKET\|LIMIT [--amount\|--size] [--price] [--dry-run]` | Write | Create an order                     |
| `pionex-trade-cli orders get --symbol <s> --order-id <id>`                                                                | Read  | Get order by ID                     |
| `pionex-trade-cli orders open --symbol <s>`                                                                               | Read  | List open orders                    |
| `pionex-trade-cli orders all --symbol <s> [--limit <n>]`                                                                  | Read  | Order history                       |
| `pionex-trade-cli orders fills --symbol <s> [--startTime] [--endTime]`                                                    | Read  | Fill details by time range          |
| `pionex-trade-cli orders fills_by_order_id --symbol <s> --order-id <id>`                                                  | Read  | Fills for a specific order          |
| `pionex-trade-cli orders cancel --symbol <s> --order-id <id> [--dry-run]`                                                 | Write | Cancel a specific order             |
| `pionex-trade-cli orders cancel_all --symbol <s> [--dry-run]`                                                             | Write | Cancel all open orders for a symbol |

#### Order Parameters

* **Market buy**: Use `--amount` (quote currency quantity, e.g. USDT)
* **Market sell**: Use `--size` (base currency quantity, e.g. BTC)
* **Limit order**: Use `--size` + `--price`

#### Examples

```bash
# Market buy: spend 100 USDT to buy BTC
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100

# Market sell: sell 0.01 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side SELL --type MARKET --size 0.01

# Limit buy
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01

# Cancel an order
pionex-trade-cli orders cancel --symbol BTC_USDT --order-id 123456

# Cancel all open orders for a symbol
pionex-trade-cli orders cancel_all --symbol BTC_USDT
```

#### Behavioral Constraints

Skills encode the following safety rules that the agent must follow during trading operations:

1. **Explicit parameters**: Never guess the symbol, side, or size. If the user's intent is unclear, the agent will ask for clarification.
2. **Dry-run first**: For any write operation (placing or canceling orders), prefer running with `--dry-run` first, showing the user what will happen, and only executing after confirmation.
3. **Balance check**: Before placing an order, check the available balance. If funds are insufficient, do not place the order — inform the user and suggest adjusting the amount.
4. **Minimum order size**: If an order fails due to amount being below the minimum, the agent queries symbol rules (`market symbols`) and suggests a valid size.
5. **Cancel preview**: Before executing `cancel_all`, list current open orders and show them to the user for confirmation.
6. **No unilateral risk increase**: The agent will never increase order size or place additional orders without the user's explicit agreement.

#### Trading Flow Example

User: "Buy BTC with 1000 USDT"

Agent execution flow:

1. Check balance: `pionex-trade-cli account balance` -> verify available USDT
2. If insufficient (e.g. only 600 USDT available), inform the user and suggest adjusting
3. After user confirms, dry-run preview: `pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 600 --dry-run`
4. After user confirms again, execute the actual order (remove `--dry-run`)
