# Bot Skills

### 机器人订单列表

#### 命令参考

| 命令 | 类型 | 描述 |
| ---- | ---- | ---- |
| `pionex-trade-cli bot order_list [--status running\|finished] [--base <BASE>] [--quote <QUOTE>] [--page-token <token>] [--bu-order-types <types>]` | 读操作 | 列出所有类型的机器人订单，支持过滤和分页 |

#### 参数

| 参数 | 描述 |
| ---- | ---- |
| `--status` | `running`（默认）或 `finished` |
| `--base` | 基础货币过滤（例如 `BTC`） |
| `--quote` | 计价货币过滤（例如 `USDT`） |
| `--page-token` | 分页游标（来自上一次响应） |
| `--bu-order-types` | 逗号分隔的机器人类型：`futures_grid`、`spot_grid`、`smart_copy`。省略则返回所有类型 |

#### MCP 工具

| 工具 | 描述 |
| ---- | ---- |
| `pionex_bot_order_list` | 列出机器人订单（支持过滤和分页，覆盖 futures_grid / spot_grid / smart_copy） |

#### 示例

```bash
# 列出所有运行中的机器人订单
pionex-trade-cli bot order_list

# 仅列出现货网格订单
pionex-trade-cli bot order_list --bu-order-types spot_grid

# 列出已完成的 BTC 所有类型机器人订单
pionex-trade-cli bot order_list --status finished --base BTC

# 同时过滤多个机器人类型
pionex-trade-cli bot order_list --bu-order-types futures_grid,spot_grid

# 翻到下一页
pionex-trade-cli bot order_list --page-token <token>
```

---

### pionex-bot: 合约网格机器人

合约网格机器人创建和管理。**需要 API 凭证**。

#### 命令参考

| 命令                                                                        | 类型  | 描述                                          |
| -------------------------------------------------------------------------- | ----- | -------------------------------------------- |
| `pionex-trade-cli bot futures_grid get --bu-order-id <id>`                                  | 读操作 | 根据 ID 获取合约网格机器人订单                |
| `pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | 写操作 | 创建合约网格机器人订单          |
| `pionex-trade-cli bot futures_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | 读操作 | 下单前校验参数 |
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
2. **下单前校验**：始终先调用 `check_params` 校验参数。如果服务端返回含 `min_investment` / `max_investment` 的 `FailedWithData` 错误，将有效范围展示给用户并请其调整。
3. **先试运行**：对于任何写操作（创建、调整、减仓、取消），优先使用 `--dry-run` 运行，向用户展示将要发生的操作，仅在确认后执行。
4. **余额检查**：在创建机器人前，检查可用余额。如果资金不足，通知用户并建议调整投资金额。
5. **杠杆意识**：始终与用户确认杠杆。永远不要在没有明确同意的情况下增加杠杆。
6. **取消预览**：在取消机器人前，检索其当前状态并展示给用户确认。
7. **不单方面增加风险**：智能体永远不会在没有用户明确同意的情况下增加投资、杠杆或网格区间。

#### 机器人交易流程示例

用户："用 1000 USDT 创建一个做多 BTC 的合约网格机器人"

智能体执行流程：

1. 检查余额：`pionex-trade-cli account balance` -> 验证可用 USDT
2. 获取交易对信息：`pionex-trade-cli market symbols --symbols BTC_USDT --type PERP`
3. 获取当前价格：`pionex-trade-cli market tickers --symbol BTC_USDT --type PERP`
4. 询问用户网格区间、网格数量和杠杆（如果未指定）
5. 校验参数：`pionex-trade-cli bot futures_grid check_params --base BTC --quote USDT --bu-order-data-json '...'` — 若返回 `FailedWithData`，展示有效范围并请用户调整
6. 试运行预览：`pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
7. 用户确认后，执行实际创建（移除 `--dry-run`）

---

### pionex-bot：现货网格机器人

现货网格机器人创建和管理。**需要 API 凭证**。

#### 命令参考

| 命令                                                                                                        | 类型   | 描述                                           |
| ----------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| `pionex-trade-cli bot spot_grid get --bu-order-id <id>`                                                     | 读操作 | 根据 ID 获取现货网格机器人订单                 |
| `pionex-trade-cli bot spot_grid get_ai_strategy --base <BASE> --quote <QUOTE>`                              | 读操作 | 获取交易对的 AI 推荐网格参数                   |
| `pionex-trade-cli bot spot_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'`         | 写操作 | 创建现货网格机器人订单                         |
| `pionex-trade-cli bot spot_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'`   | 读操作 | 下单前校验参数                                 |
| `pionex-trade-cli bot spot_grid adjust_params --bu-order-id <id> [--top <p>] [--bottom <p>] [--row <n>] [--quote-invest <amt>]` | 写操作 | 调整网格区间或追加投资              |
| `pionex-trade-cli bot spot_grid invest_in --bu-order-id <id> --quote-invest <金额>`                         | 写操作 | 向运行中的机器人追加计价货币投资               |
| `pionex-trade-cli bot spot_grid cancel --bu-order-id <id> [--close-sell-model NOT_SELL\|TO_QUOTE\|TO_USDT]` | 写操作 | 取消并关闭机器人订单                           |
| `pionex-trade-cli bot spot_grid profit --bu-order-id <id> --amount <金额>`                                  | 写操作 | 提取累积的网格利润                             |

#### 创建参数

**`buOrderData` 中的必填字段：**

* `top` / `bottom`：网格上限 / 下限价格
* `row`：网格层数（2–200）
* `gridType`：`"arithmetic"` 或 `"geometric"`（注意驼峰命名，与合约网格的 `grid_type` 不同）
* `quoteTotalInvestment`：计价货币投资金额

**与合约网格的关键区别：**
- 没有 `leverage`（杠杆）和 `trend`（方向）字段（现货，非合约）
- `gridType` 驼峰命名；合约网格使用 `grid_type` 下划线命名
- 创建时用 `quoteTotalInvestment`，不是 `quoteInvestment`
- 追加投资用 `quoteInvest`
- 默认 `closeSellModel` 为 `NOT_SELL`（合约网格默认为 `TO_QUOTE`）

#### 示例

```bash
# 获取 AI 策略推荐
pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT

# 创建现货网格机器人（先试运行）
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000", "bottom": "90000", "row": 50,
  "gridType": "arithmetic", "quoteTotalInvestment": "100"
}' --dry-run

# 获取机器人状态
pionex-trade-cli bot spot_grid get --bu-order-id 123456

# 追加投资
pionex-trade-cli bot spot_grid invest_in --bu-order-id 123456 --quote-invest 50

# 调整网格区间
pionex-trade-cli bot spot_grid adjust_params --bu-order-id 123456 --top 120000 --bottom 85000

# 提取利润
pionex-trade-cli bot spot_grid profit --bu-order-id 123456 --amount 10

# 取消机器人
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456 --close-sell-model TO_QUOTE
```

#### 行为约束

1. **明确参数**：永远不要猜测网格区间或投资金额。如果不明确，询问用户。
2. **优先 AI 策略**：对于新机器人，建议先调用 `get_ai_strategy` 获取推荐参数，再让用户手动确认或调整。
3. **下单前校验**：始终先调用 `check_params` 校验参数。如果服务端返回含 `min_investment` / `max_investment` 的 `FailedWithData` 错误，将有效范围展示给用户并请其调整。
4. **先试运行**：对于任何写操作（创建、调整、追加投资、取消、提取利润），优先使用 `--dry-run` 运行，向用户展示将要发生的操作，仅在确认后执行。
5. **余额检查**：在创建机器人前，检查可用计价货币余额。
6. **取消预览**：在取消机器人前，检索其当前状态并展示给用户确认。
7. **不单方面增加风险**：智能体永远不会在没有用户明确同意的情况下增加投资或网格区间。

#### 现货网格交易流程示例

用户："用 100 USDT 创建一个 BTC 现货网格机器人"

智能体执行流程：

1. 检查余额：`pionex-trade-cli account balance` → 验证可用 USDT
2. 获取 AI 策略：`pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT`
3. 获取当前价格：`pionex-trade-cli market tickers --symbol BTC_USDT`
4. 展示 AI 推荐参数；请用户确认或调整
5. 校验参数：`pionex-trade-cli bot spot_grid check_params --base BTC --quote USDT --bu-order-data-json '...'` — 若返回 `FailedWithData`，展示有效范围并请用户调整
6. 试运行预览：`pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
7. 用户确认后，执行实际创建（移除 `--dry-run`）

---

### pionex-bot：智能跟单机器人

智能跟单机器人的创建与管理。自动复制信号源的交易操作。**需要 API 凭据**。

#### 命令参考

| 命令                                                                                                              | 类型   | 描述                                              |
| ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| `pionex-trade-cli bot smart_copy get --bu-order-id <id>`                                                         | 读操作 | 通过 ID 获取智能跟单机器人订单                    |
| `pionex-trade-cli bot smart_copy create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'`             | 写操作 | 创建智能跟单机器人订单                            |
| `pionex-trade-cli bot smart_copy check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'`       | 读操作 | 下单前校验参数                                    |
| `pionex-trade-cli bot smart_copy cancel --bu-order-id <id> [--close-sell-model NOT_SELL\|TO_QUOTE\|TO_USDT]`    | 写操作 | 取消并关闭智能跟单机器人订单                      |
| `pionex-trade-cli bot signal add_listener --signal-source-id <id>`                                               | 写操作 | 订阅信号源                                        |

#### 创建参数

**`buOrderData` 必填字段：**

* `quoteInvestment`：计价货币投资金额（字符串）
* `leverageType`：`"follow"`（跟随信号源杠杆）或 `"fixed"`（固定杠杆）

**`buOrderData` 选填字段：**

* `leverage`：自定义杠杆倍数 — `leverageType="fixed"` 时必填
* `maxInvestPerOrder`：每笔复制订单的最大报价金额
* `copyMode`：`"fixed_amount"` 或 `"fixed_ratio"`

**与网格机器人的主要区别：** 无 `top`/`bottom`/`row` 字段 — 智能跟单无需设置网格区间，直接复制信号源的仓位大小。

#### 示例

```bash
# 先订阅信号源
pionex-trade-cli bot signal add_listener --signal-source-id <providerId>

# 检查余额
pionex-trade-cli account balance

# 校验参数
pionex-trade-cli bot smart_copy check_params --base BTC --quote USDT \
  --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}'

# 试运行预览
pionex-trade-cli bot smart_copy create --base BTC --quote USDT \
  --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}' \
  --copy-from <signalSourceId> --dry-run

# 确认后创建机器人
pionex-trade-cli bot smart_copy create --base BTC --quote USDT \
  --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}' \
  --copy-from <signalSourceId>

# 获取机器人状态
pionex-trade-cli bot smart_copy get --bu-order-id 123456

# 取消机器人
pionex-trade-cli bot smart_copy cancel --bu-order-id 123456 --close-sell-model TO_QUOTE
```

#### 行为约束

1. **明确参数**：不猜测 `quoteInvestment` 或 `leverageType`。如不明确，向用户询问。
2. **必须确认信号源**：创建前必须与用户确认 `signalSourceId`（信号源）。不得在没有用户明确指令的情况下自行选择信号源。
3. **下单前校验**：始终先调用 `check_params`。若 `FailedWithData` 返回 `min_investment`/`max_investment`，展示有效范围并请用户调整。
4. **先试运行**：对于所有写操作（创建、取消、add_listener），优先使用 `--dry-run`，仅在用户确认后执行。
5. **余额检查**：创建机器人前检查可用计价货币余额。
6. **取消预览**：取消前检索机器人当前状态，展示给用户确认。
7. **不单方面改变风险**：不在用户明确同意的情况下更改 `leverage` 或 `quoteInvestment`。

#### 智能跟单交易流程示例

用户："用 100 USDT 跟单交易员 X 的 BTC 交易"

智能体执行流程：

1. 订阅信号源：`pionex-trade-cli bot signal add_listener --signal-source-id <交易员X的providerId>`
2. 检查余额：`pionex-trade-cli account balance` → 验证可用 USDT ≥ 100
3. 校验参数：`pionex-trade-cli bot smart_copy check_params --base BTC --quote USDT --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}'` — 若 `FailedWithData`，展示有效范围
4. 试运行预览：在创建命令中加 `--dry-run`，将解析后的请求体展示给用户
5. 用户确认后，移除 `--dry-run` 执行实际创建
