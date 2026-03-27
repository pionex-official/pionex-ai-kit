# Bot Skills

### pionex-bot: 合约网格机器人

合约网格机器人创建和管理。**需要 API 凭证**。

#### 命令参考

| 命令                                                                        | 类型  | 描述                                          |
| -------------------------------------------------------------------------- | ----- | -------------------------------------------- |
| `pionex-trade-cli bot futures_grid get --bu-order-id <id>`                                  | 读操作 | 根据 ID 获取合约网格机器人订单                |
| `pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | 写操作 | 创建合约网格机器人订单          |
| `pionex-trade-cli bot futures_grid adjust_params --body-json '<JSON>'`                      | 写操作 | 调整机器人参数（投资额 / 网格区间）           |
| `pionex-trade-cli bot futures_grid reduce --body-json '<JSON>'`                             | 写操作 | 减少机器人仓位                               |
| `pionex-trade-cli bot futures_grid cancel --bu-order-id <id>`                               | 写操作 | 取消并关闭机器人订单                         |

#### 创建参数

**`buOrderData` 中的必填字段：**

* `top` / `bottom`：网格上限 / 下限价格
* `row`：网格层数
* `grid_type`：`"arithmetic"` 或 `"geometric"`
* `trend`：`"long"`、`"short"` 或 `"no_trend"`
* `leverage`：杠杆倍数
* `quoteInvestment`：计价货币的投资金额

#### 示例

```bash
# 创建做多合约网格机器人
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000", "bottom": "60000", "row": 50,
  "grid_type": "arithmetic", "trend": "long",
  "leverage": 5, "quoteInvestment": "1000"
}'

# 获取机器人状态
pionex-trade-cli bot futures_grid get --bu-order-id 123456

# 追加保证金
pionex-trade-cli bot futures_grid adjust_params --body-json '{
  "buOrderId": "123456", "type": "invest_in",
  "extraMargin": true, "quoteInvestment": 500
}'

# 减少仓位
pionex-trade-cli bot futures_grid reduce --body-json '{"buOrderId": "123456", "reduceNum": 10}'

# 取消机器人
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456
```

#### 行为约束

1. **明确参数**：永远不要猜测网格区间、杠杆或投资金额。如果不明确，询问用户。
2. **先试运行**：对于任何写操作（创建、调整、减仓、取消），优先使用 `--dry-run` 运行，向用户展示将要发生的操作，仅在确认后执行。
3. **余额检查**：在创建机器人前，检查可用余额。如果资金不足，通知用户并建议调整投资金额。
4. **杠杆意识**：始终与用户确认杠杆。永远不要在没有明确同意的情况下增加杠杆。
5. **取消预览**：在取消机器人前，检索其当前状态并展示给用户确认。
6. **不单方面增加风险**：智能体永远不会在没有用户明确同意的情况下增加投资、杠杆或网格区间。

#### 机器人交易流程示例

用户："用 1000 USDT 创建一个做多 BTC 的合约网格机器人"

智能体执行流程：

1. 检查余额：`pionex-trade-cli account balance` -> 验证可用 USDT
2. 获取交易对信息：`pionex-trade-cli market symbols --symbols BTC_USDT --type PERP`
3. 获取当前价格：`pionex-trade-cli market tickers --symbol BTC_USDT --type PERP`
4. 询问用户网格区间、网格数量和杠杆（如果未指定）
5. 试运行预览：`pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
6. 用户确认后，执行实际创建（移除 `--dry-run`）
```
