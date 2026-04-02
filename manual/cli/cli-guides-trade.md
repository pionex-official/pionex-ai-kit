# Trade Commands

### Market Commands (Public, No Auth Required)

#### market depth

Get order book depth (bids/asks) for a symbol.

```bash
pionex-trade-cli market depth <symbol> [--limit <n>]
```

* `limit`: 1–100, default 5

```bash
pionex-trade-cli market depth BTC_USDT --limit 10
```

#### market trades

Get recent public trades for a symbol.

```bash
pionex-trade-cli market trades <symbol> [--limit <n>]
```

* `limit`: 1–100

```bash
pionex-trade-cli market trades ETH_USDT --limit 20
```

#### market symbols

Get symbol metadata (precision, minimum size, step size).

```bash
pionex-trade-cli market symbols [--symbols <list>] [--type SPOT|PERP]
```

* `--symbols`: Comma-separated symbol list
* `--type`: Filter by `SPOT` or `PERP`

```bash
pionex-trade-cli market symbols --symbols BTC_USDT,ETH_USDT
pionex-trade-cli market symbols --type SPOT
```

#### market tickers

Get 24h ticker data (open, close, high, low, volume).

```bash
pionex-trade-cli market tickers [--symbol <s>] [--type SPOT|PERP]
```

```bash
pionex-trade-cli market tickers --symbol BTC_USDT
pionex-trade-cli market tickers --type SPOT
```

#### market klines

Get OHLCV candlestick data.

```bash
pionex-trade-cli market klines <symbol> <interval> [--endTime <ms>] [--limit <n>]
```

* `interval`: `1M`, `5M`, `15M`, `30M`, `60M`, `4H`, `8H`, `12H`, `1D`
* `endTime`: End time in milliseconds (Unix timestamp)

```bash
pionex-trade-cli market klines BTC_USDT 60M --limit 24
pionex-trade-cli market klines BTC_USDT 1D
```

#### market book_tickers

Get best bid/ask ticker(s).

```bash
pionex-trade-cli market book_tickers [--symbol <s>] [--type SPOT|PERP]
```

```bash
pionex-trade-cli market book_tickers --symbol BTC_USDT
pionex-trade-cli market book_tickers --type SPOT
```

---

### Account Commands (Auth Required)

#### account balance

Get all spot account balances (JSON output).

```bash
pionex-trade-cli account balance
```

---

### Order Commands (Auth Required)

#### orders new

Create a new order.

```bash
pionex-trade-cli orders new --symbol <s> --side BUY|SELL --type MARKET|LIMIT [options]
```

| Flag                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `--symbol`          | Trading pair (e.g. `BTC_USDT`)                             |
| `--side`            | `BUY` or `SELL`                                            |
| `--type`            | `MARKET` or `LIMIT`                                        |
| `--amount`          | Quote currency amount (for market buy, e.g. USDT to spend) |
| `--size`            | Base currency quantity (for market sell or limit orders)    |
| `--price`           | Limit price (required for `LIMIT` orders)                  |
| `--client-order-id` | Optional client-assigned order ID                          |
| `--IOC`             | Immediate-or-cancel flag                                   |
| `--dry-run`         | Preview the order without executing                        |

**Examples:**

```bash
# Market buy: spend 100 USDT to buy BTC
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100

# Market sell: sell 0.01 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side SELL --type MARKET --size 0.01

# Limit buy
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01

# Dry-run (preview only)
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

#### orders get

Get a specific order by ID.

```bash
pionex-trade-cli orders get --symbol <s> --order-id <id>
```

#### orders open

List open orders for a symbol.

```bash
pionex-trade-cli orders open --symbol <s>
```

#### orders all

List order history (filled, cancelled, etc.).

```bash
pionex-trade-cli orders all --symbol <s> [--limit <n>]
```

#### orders fills

Query fill (execution) details by time range.

```bash
pionex-trade-cli orders fills --symbol <s> [--startTime <ms>] [--endTime <ms>]
```

#### orders fills_by_order_id

Query fills for a specific order.

```bash
pionex-trade-cli orders fills_by_order_id --symbol <s> --order-id <id>
```

```bash
pionex-trade-cli orders fills_by_order_id --symbol BTC_USDT --order-id 123456
```

#### orders cancel

Cancel a specific order.

```bash
pionex-trade-cli orders cancel --symbol <s> --order-id <id> [--dry-run]
```

#### orders cancel_all

Cancel all open orders for a symbol.

```bash
pionex-trade-cli orders cancel_all --symbol <s> [--dry-run]
```
