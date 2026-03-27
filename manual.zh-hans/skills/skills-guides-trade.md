# Trade Skills

### pionex-market: 市场数据

所有命令都是只读的，**不需要 API 凭证**。

#### 命令参考

| 命令                                                                             | 描述                                                    |
| ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `pionex-trade-cli market depth <symbol> [--limit <n>]`                          | 订单簿深度（买卖盘）；limit 1–100，默认 5                |
| `pionex-trade-cli market trades <symbol> [--limit <n>]`                         | 最近的公开成交记录；limit 1–100                          |
| `pionex-trade-cli market symbols [--symbols <list>] [--type SPOT\|PERP]`        | 交易对元数据（精度、最小下单量）；逗号分隔的交易对列表        |
| `pionex-trade-cli market tickers [--symbol <s>] [--type SPOT\|PERP]`            | 24h 行情：开盘、收盘、最高、最低、成交量                   |
| `pionex-trade-cli market klines <symbol> <interval> [--endTime <ms>] [--limit <n>]` | OHLCV K线；interval: 1M, 5M, 15M, 30M, 60M, 4H, 8H, 12H, 1D |

#### 示例

```bash
# 订单簿深度（5档）
pionex-trade-cli market depth BTC_USDT --limit 5

# 最近10笔成交
pionex-trade-cli market trades BTC_USDT --limit 10

# 交易对精度和最小下单量
pionex-trade-cli market symbols --symbols BTC_USDT

# 24h 行情
pionex-trade-cli market tickers --symbol BTC_USDT

# 4小时 K线（最近24根）
pionex-trade-cli market klines BTC_USDT 4H --limit 24
```

---

### pionex-portfolio: 账户余额

查询现货账户余额。**需要 API 凭证**。

#### 命令

| 命令                            | 描述                         |
| ------------------------------ | --------------------------- |
| `pionex-trade-cli account balance` | 所有现货余额，返回 JSON 格式 |

#### 使用示例

* 用户："我有多少 USDT？"
* 智能体执行 `pionex-trade-cli account balance`，然后从 JSON 响应中提取 USDT 可用余额

---

### pionex-trade: 现货交易

现货订单下单和管理。**需要 API 凭证**。

#### 命令参考

| 命令                                                                                                                   | 类型  | 描述                     |
| --------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------- |
| `pionex-trade-cli orders new --symbol <s> --side BUY\|SELL --type MARKET\|LIMIT [--amount\|--size] [--price] [--dry-run]` | 写操作 | 创建订单                |
| `pionex-trade-cli orders get --symbol <s> --order-id <id>`                                                            | 读操作 | 根据 ID 获取订单         |
| `pionex-trade-cli orders open --symbol <s>`                                                                           | 读操作 | 列出未完成订单           |
| `pionex-trade-cli orders all --symbol <s> [--limit <n>]`                                                              | 读操作 | 订单历史记录             |
| `pionex-trade-cli orders fills --symbol <s> [--startTime] [--endTime]`                                                | 读操作 | 成交明细                |
| `pionex-trade-cli orders cancel --symbol <s> --order-id <id> [--dry-run]`                                             | 写操作 | 取消指定订单             |
| `pionex-trade-cli orders cancel-all --symbol <s> [--dry-run]`                                                         | 写操作 | 取消交易对的所有未完成订单 |

#### 订单参数

* **市价买入**：使用 `--amount`（计价货币数量，例如 USDT）
* **市价卖出**：使用 `--size`（基础货币数量，例如 BTC）
* **限价单**：使用 `--size` + `--price`

#### 示例

```bash
# 市价买入：花费 100 USDT 购买 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100

# 市价卖出：卖出 0.01 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side SELL --type MARKET --size 0.01

# 限价买入
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01

# 取消订单
pionex-trade-cli orders cancel --symbol BTC_USDT --order-id 123456

# 取消交易对的所有未完成订单
pionex-trade-cli orders cancel-all --symbol BTC_USDT
```

#### 行为约束

Skills 编码了以下安全规则，智能体在交易操作期间必须遵守：

1. **明确参数**：永远不要猜测交易对、方向或数量。如果用户意图不明确，智能体会要求澄清。
2. **先试运行**：对于任何写操作（下单或撤单），优先使用 `--dry-run` 运行，向用户展示将要发生的操作，仅在确认后执行。
3. **余额检查**：在下单前，检查可用余额。如果资金不足，不要下单——通知用户并建议调整金额。
4. **最小订单量**：如果订单因金额低于最小值而失败，智能体会查询交易对规则（`market symbols`）并建议有效的数量。
5. **撤单预览**：在执行 `cancel-all` 前，列出当前未完成订单并展示给用户确认。
6. **不单方面增加风险**：智能体永远不会在没有用户明确同意的情况下增加订单数量或下额外订单。

#### 交易流程示例

用户："用 1000 USDT 买入 BTC"

智能体执行流程：

1. 检查余额：`pionex-trade-cli account balance` -> 验证可用 USDT
2. 如果资金不足（例如只有 600 USDT 可用），通知用户并建议调整
3. 用户确认后，试运行预览：`pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 600 --dry-run`
4. 用户再次确认后，执行实际订单（移除 `--dry-run`）
