# 交易命令

### 市场命令（公开，无需认证）

#### market depth

获取交易对的订单簿深度（买单/卖单）。

```bash
pionex-trade-cli market depth <symbol> [--limit <n>]
```

* `limit`：1–100，默认 5

```bash
pionex-trade-cli market depth BTC_USDT --limit 10
```

#### market trades

获取交易对的最近公开成交记录。

```bash
pionex-trade-cli market trades <symbol> [--limit <n>]
```

* `limit`：1–100

```bash
pionex-trade-cli market trades ETH_USDT --limit 20
```

#### market symbols

获取交易对元数据（精度、最小数量、步长）。

```bash
pionex-trade-cli market symbols [--symbols <list>] [--type SPOT|PERP]
```

* `--symbols`：逗号分隔的交易对列表
* `--type`：按 `SPOT` 或 `PERP` 筛选

```bash
pionex-trade-cli market symbols --symbols BTC_USDT,ETH_USDT
pionex-trade-cli market symbols --type SPOT
```

#### market tickers

获取 24 小时行情数据（开盘价、收盘价、最高价、最低价、成交量）。

```bash
pionex-trade-cli market tickers [--symbol <s>] [--type SPOT|PERP]
```

```bash
pionex-trade-cli market tickers --symbol BTC_USDT
pionex-trade-cli market tickers --type SPOT
```

#### market klines

获取 OHLCV K线数据。

```bash
pionex-trade-cli market klines <symbol> <interval> [--endTime <ms>] [--limit <n>]
```

* `interval`：`1M`、`5M`、`15M`、`30M`、`60M`、`4H`、`8H`、`12H`、`1D`
* `endTime`：结束时间（毫秒时间戳）

```bash
pionex-trade-cli market klines BTC_USDT 60M --limit 24
pionex-trade-cli market klines BTC_USDT 1D
```

#### market book_tickers

获取最优买卖价行情。

```bash
pionex-trade-cli market book_tickers [--symbol <s>] [--type SPOT|PERP]
```

```bash
pionex-trade-cli market book_tickers --symbol BTC_USDT
pionex-trade-cli market book_tickers --type SPOT
```

---

### 账户命令（需要认证）

#### account balance

获取所有现货账户余额（JSON 输出）。

```bash
pionex-trade-cli account balance
```

---

#### account balance_full

获取完整账户概览——现货（Bot Account）与合约（Trader Account）余额、各币种价格，以及 USDT/BTC 估值总额。

```bash
pionex-trade-cli account balance_full [--app-lang <lang>] [--sys-lang <lang>]
```

| 选项 | 说明 |
| --- | --- |
| `--app-lang` | 应用语言，例如 `en` 或 `zh`（优先于 `--sys-lang`） |
| `--sys-lang` | 系统语言备选 |

---

### 订单命令（需要认证）

#### orders new

创建新订单。

```bash
pionex-trade-cli orders new --symbol <s> --side BUY|SELL --type MARKET|LIMIT [options]
```

| 标志                | 描述                                                     |
| ------------------- | -------------------------------------------------------- |
| `--symbol`          | 交易对（例如 `BTC_USDT`）                                |
| `--side`            | `BUY` 或 `SELL`                                          |
| `--type`            | `MARKET` 或 `LIMIT`                                      |
| `--amount`          | 计价货币金额（用于市价买单，例如要花费的 USDT）         |
| `--size`            | 基础货币数量（用于市价卖单或限价单）                     |
| `--price`           | 限价（`LIMIT` 订单必需）                                 |
| `--client-order-id` | 可选的客户端分配订单 ID                                  |
| `--IOC`             | 立即成交或取消标志                                       |
| `--dry-run`         | 预览订单而不执行                                         |

**示例：**

```bash
# 市价买单：花费 100 USDT 买入 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100

# 市价卖单：卖出 0.01 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side SELL --type MARKET --size 0.01

# 限价买单
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01

# 干运行（仅预览）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

#### orders get

通过 ID 获取特定订单。

```bash
pionex-trade-cli orders get --symbol <s> --order-id <id>
```

#### orders open

列出交易对的挂单。

```bash
pionex-trade-cli orders open --symbol <s>
```

#### orders all

列出订单历史（已成交、已取消等）。

```bash
pionex-trade-cli orders all --symbol <s> [--limit <n>]
```

#### orders fills

按时间范围查询成交详情。

```bash
pionex-trade-cli orders fills --symbol <s> [--startTime <ms>] [--endTime <ms>]
```

#### orders fills_by_order_id

查询特定订单的成交详情。

```bash
pionex-trade-cli orders fills_by_order_id --symbol <s> --order-id <id>
```

```bash
pionex-trade-cli orders fills_by_order_id --symbol BTC_USDT --order-id 123456
```

#### orders cancel

取消特定订单。

```bash
pionex-trade-cli orders cancel --symbol <s> --order-id <id> [--dry-run]
```

#### orders cancel_all

取消交易对的所有挂单。

```bash
pionex-trade-cli orders cancel_all --symbol <s> [--dry-run]
```
