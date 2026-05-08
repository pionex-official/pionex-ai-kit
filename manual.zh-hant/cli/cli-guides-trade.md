# 交易命令

### 市場命令（公開，無需認證）

#### market depth

取得某交易對的訂單簿深度（買賣盤）。

```bash
pionex-trade-cli market depth <symbol> [--limit <n>]
```

* `limit`：1–100，預設 5

```bash
pionex-trade-cli market depth BTC_USDT --limit 10
```

#### market trades

取得某交易對的最近公開成交記錄。

```bash
pionex-trade-cli market trades <symbol> [--limit <n>]
```

* `limit`：1–100

```bash
pionex-trade-cli market trades ETH_USDT --limit 20
```

#### market symbols

取得交易對的中繼資料（精度、最小數量、步進大小）。

```bash
pionex-trade-cli market symbols [--symbols <list>] [--type SPOT|PERP]
```

* `--symbols`：以逗號分隔的交易對列表
* `--type`：按 `SPOT` 或 `PERP` 篩選

```bash
pionex-trade-cli market symbols --symbols BTC_USDT,ETH_USDT
pionex-trade-cli market symbols --type SPOT
```

#### market tickers

取得 24 小時行情資料（開盤、收盤、最高、最低、成交量）。

```bash
pionex-trade-cli market tickers [--symbol <s>] [--type SPOT|PERP]
```

```bash
pionex-trade-cli market tickers --symbol BTC_USDT
pionex-trade-cli market tickers --type SPOT
```

#### market klines

取得 OHLCV K 線資料。

```bash
pionex-trade-cli market klines <symbol> <interval> [--endTime <ms>] [--limit <n>]
```

* `interval`：`1M`、`5M`、`15M`、`30M`、`60M`、`4H`、`8H`、`12H`、`1D`
* `endTime`：結束時間（毫秒級 Unix 時間戳）

```bash
pionex-trade-cli market klines BTC_USDT 60M --limit 24
pionex-trade-cli market klines BTC_USDT 1D
```

#### market book_tickers

取得最優買賣價行情。

```bash
pionex-trade-cli market book_tickers [--symbol <s>] [--type SPOT|PERP]
```

```bash
pionex-trade-cli market book_tickers --symbol BTC_USDT
pionex-trade-cli market book_tickers --type SPOT
```

---

### 訂單命令（需要認證）

#### orders new

建立新訂單。

```bash
pionex-trade-cli orders new --symbol <s> --side BUY|SELL --type MARKET|LIMIT [options]
```

| 參數                | 說明                                                |
| ------------------- | ---------------------------------------------------------- |
| `--symbol`          | 交易對（例如 `BTC_USDT`）                             |
| `--side`            | `BUY` 或 `SELL`                                            |
| `--type`            | `MARKET` 或 `LIMIT`                                        |
| `--amount`          | 計價貨幣數量（市價買入時，例如要花費的 USDT） |
| `--size`            | 基礎貨幣數量（市價賣出或限價單使用）    |
| `--price`           | 限價（`LIMIT` 訂單必填）                  |
| `--client-order-id` | 選填的自訂訂單 ID                          |
| `--IOC`             | 立即成交或取消標誌                                   |
| `--dry-run`         | 預覽訂單但不執行                        |

**範例：**

```bash
# 市價買入：花費 100 USDT 買入 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100

# 市價賣出：賣出 0.01 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side SELL --type MARKET --size 0.01

# 限價買入
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01

# 模擬執行（僅預覽）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

#### orders get

依 ID 查詢特定訂單。

```bash
pionex-trade-cli orders get --symbol <s> --order-id <id>
```

#### orders open

列出某交易對的未完成訂單。

```bash
pionex-trade-cli orders open --symbol <s>
```

#### orders all

列出訂單歷史記錄（已成交、已取消等）。

```bash
pionex-trade-cli orders all --symbol <s> [--limit <n>]
```

#### orders fills

按時間範圍查詢成交明細。

```bash
pionex-trade-cli orders fills --symbol <s> [--startTime <ms>] [--endTime <ms>]
```

#### orders fills_by_order_id

查詢特定訂單的成交明細。

```bash
pionex-trade-cli orders fills_by_order_id --symbol <s> --order-id <id>
```

```bash
pionex-trade-cli orders fills_by_order_id --symbol BTC_USDT --order-id 123456
```

#### orders cancel

取消特定訂單。

```bash
pionex-trade-cli orders cancel --symbol <s> --order-id <id> [--dry-run]
```

#### orders cancel_all

取消某交易對的所有未完成訂單。

```bash
pionex-trade-cli orders cancel_all --symbol <s> [--dry-run]
```
