# 机器人命令

### 机器人订单列表（需要认证）

#### bot order_list

列出所有类型的机器人订单，支持可选过滤条件和分页。

```bash
pionex-trade-cli bot order_list [--status running|finished] [--base <BASE>] [--quote <QUOTE>] [--page-token <token>] [--bu-order-types <types>]
```

| 参数 | 描述 |
| --- | --- |
| `--status` | `running`（默认）或 `finished` |
| `--base` | 基础货币过滤（例如 `BTC`） |
| `--quote` | 计价货币过滤（例如 `USDT`） |
| `--page-token` | 分页游标（来自上一次响应） |
| `--bu-order-types` | 逗号分隔的机器人类型：`futures_grid`、`spot_grid`、`smart_copy`。省略则返回所有类型 |

**示例：**

```bash
# 列出所有运行中的机器人订单
pionex-trade-cli bot order_list

# 仅列出合约网格订单
pionex-trade-cli bot order_list --bu-order-types futures_grid

# 列出已取消的 BTC 现货网格订单
pionex-trade-cli bot order_list --status finished --base BTC --bu-order-types spot_grid

# 翻到下一页
pionex-trade-cli bot order_list --page-token <token>
```

### 合约网格（需要认证）

#### bot futures_grid get

通过 ID 获取合约网格机器人订单。

```bash
pionex-trade-cli bot futures_grid get --bu-order-id <id> [--lang <language>]
```

```bash
pionex-trade-cli bot futures_grid get --bu-order-id 123456
```

#### bot futures_grid create

创建合约网格机器人订单。

```bash
pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--dry-run]
```

* `--base`：基础货币（例如 `BTC`）；如果缺少后缀，将自动规范化为 `<BASE>.PERP`
* `--quote`：计价货币（例如 `USDT`）
* `--bu-order-data-json`：包含网格订单参数的 JSON 字符串

**`buOrderData` 中的必需字段：**

| 字段              | 类型   | 描述                                             |
| ----------------- | ------ | ------------------------------------------------ |
| `top`             | string | 网格上限价格                                     |
| `bottom`          | string | 网格下限价格                                     |
| `row`             | number | 网格级数                                         |
| `grid_type`       | string | `"arithmetic"` 或 `"geometric"`                  |
| `trend`           | string | `"long"`、`"short"` 或 `"no_trend"`              |
| `leverage`        | number | 杠杆倍数                                         |
| `quoteInvestment` | string | 计价货币投资金额                                 |

**示例：**

```bash
# 为 BTC_USDT 创建做多合约网格机器人
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000",
  "bottom": "60000",
  "row": 50,
  "grid_type": "arithmetic",
  "trend": "long",
  "leverage": 5,
  "quoteInvestment": "1000"
}'

# 干运行（仅预览）
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"80000","bottom":"60000","row":50,"grid_type":"arithmetic","trend":"long","leverage":5,"quoteInvestment":"1000"}' --dry-run
```

#### bot futures_grid adjust_params

调整合约网格机器人参数（追加投资、修改网格区间等）。

```bash
pionex-trade-cli bot futures_grid adjust_params --body-json '<JSON>' [--dry-run]
```

**必需字段：**

| 字段          | 类型    | 描述                                                       |
| ------------- | ------- | ---------------------------------------------------------- |
| `buOrderId`   | string  | 合约网格机器人订单 ID                                      |
| `type`        | string  | `"invest_in"`、`"adjust_params"` 或 `"invest_in_trigger"` |
| `extraMargin` | boolean | 额外保证金标志                                             |

**示例：**

```bash
# 向现有机器人追加 500 USDT 保证金
pionex-trade-cli bot futures_grid adjust_params --body-json '{
  "buOrderId": "123456",
  "type": "invest_in",
  "extraMargin": true,
  "quoteInvestment": 500
}'
```

#### bot futures_grid reduce

减少合约网格机器人仓位。

```bash
pionex-trade-cli bot futures_grid reduce --body-json '<JSON>' [--dry-run]
```

| 字段        | 类型   | 描述                                       |
| ----------- | ------ | ------------------------------------------ |
| `buOrderId` | string | 合约网格机器人订单 ID                      |
| `reduceNum` | number | 要减少的仓位数量（正整数）                 |

```bash
pionex-trade-cli bot futures_grid reduce --body-json '{"buOrderId": "123456", "reduceNum": 10}'
```

#### bot futures_grid check_params

下单前校验合约网格参数。返回服务端校验结果。当参数超出范围时，`FailedWithData` 错误响应中会包含 `min_investment`、`max_investment` 和 `slippage`，可用于引导用户输入有效参数。

```bash
pionex-trade-cli bot futures_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'
```

使用与 `futures_grid create` 相同的 `buOrderData` 字段。

```bash
pionex-trade-cli bot futures_grid check_params --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000",
  "bottom": "60000",
  "row": 50,
  "grid_type": "arithmetic",
  "trend": "long",
  "leverage": 5,
  "quoteInvestment": "1000"
}'
```

#### bot futures_grid cancel

取消并关闭合约网格机器人订单。

```bash
pionex-trade-cli bot futures_grid cancel --bu-order-id <id> [--close-sell-model TO_QUOTE|TO_USDT] [--immediate] [--dry-run]
```

```bash
# 取消机器人并将仓位转换为 USDT
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456 --close-sell-model TO_USDT

# 立即取消
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456 --immediate
```

### 现货网格（需要认证）

#### bot spot_grid get

通过 ID 获取现货网格机器人订单。

```bash
pionex-trade-cli bot spot_grid get --bu-order-id <id>
```

```bash
pionex-trade-cli bot spot_grid get --bu-order-id 123456
```

#### bot spot_grid get_ai_strategy

获取交易对的 AI 推荐网格参数。

```bash
pionex-trade-cli bot spot_grid get_ai_strategy --base <BASE> --quote <QUOTE>
```

```bash
pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT
```

#### bot spot_grid create

创建现货网格机器人订单。

```bash
pionex-trade-cli bot spot_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--note <备注>] [--dry-run]
```

* `--base`：基础货币（例如 `BTC`）
* `--quote`：计价货币（例如 `USDT`）
* `--bu-order-data-json`：包含网格订单参数的 JSON 字符串

**`buOrderData` 中的必需字段：**

| 字段                   | 类型    | 描述                             |
| ---------------------- | ------- | -------------------------------- |
| `top`                  | string  | 网格上限价格                     |
| `bottom`               | string  | 网格下限价格                     |
| `row`                  | integer | 网格层数（2–200）                |
| `gridType`             | string  | `"arithmetic"` 或 `"geometric"`  |
| `quoteTotalInvestment` | string  | 计价货币投资金额                 |

**可选字段：** `lossStopType`、`lossStop`、`lossStopDelay`、`profitStopType`、`profitStop`、`profitStopDelay`、`condition`、`conditionDirection`、`slippage`、`closeSellModel`

**示例：**

```bash
# 创建 BTC/USDT 现货网格机器人
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000",
  "bottom": "90000",
  "row": 50,
  "gridType": "arithmetic",
  "quoteTotalInvestment": "100"
}'

# 干运行（仅预览）
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"110000","bottom":"90000","row":50,"gridType":"arithmetic","quoteTotalInvestment":"100"}' --dry-run
```

#### bot spot_grid adjust_params

调整现货网格机器人的网格区间或追加投资。

```bash
pionex-trade-cli bot spot_grid adjust_params --bu-order-id <id> [--top <价格>] [--bottom <价格>] [--row <层数>] [--quote-invest <金额>]
```

| 参数              | 描述                         |
| ----------------- | ---------------------------- |
| `--bu-order-id`   | 必需；现货网格机器人订单 ID  |
| `--top`           | 新网格上限价格               |
| `--bottom`        | 新网格下限价格               |
| `--row`           | 新网格层数                   |
| `--quote-invest`  | 追加计价货币投资金额         |

```bash
# 向运行中的机器人追加 50 USDT
pionex-trade-cli bot spot_grid adjust_params --bu-order-id 123456 --quote-invest 50
```

#### bot spot_grid invest_in

向运行中的现货网格机器人追加计价货币投资。

```bash
pionex-trade-cli bot spot_grid invest_in --bu-order-id <id> --quote-invest <金额>
```

```bash
pionex-trade-cli bot spot_grid invest_in --bu-order-id 123456 --quote-invest 100
```

#### bot spot_grid check_params

下单前校验现货网格参数。返回服务端校验结果。当参数超出范围时，`FailedWithData` 错误响应中会包含 `min_investment`、`max_investment` 和 `slippage`，可用于引导用户输入有效参数。

```bash
pionex-trade-cli bot spot_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'
```

使用与 `spot_grid create` 相同的 `buOrderData` 字段。

```bash
pionex-trade-cli bot spot_grid check_params --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000",
  "bottom": "90000",
  "row": 50,
  "gridType": "arithmetic",
  "quoteTotalInvestment": "100"
}'
```

#### bot spot_grid cancel

取消并关闭现货网格机器人订单。

```bash
pionex-trade-cli bot spot_grid cancel --bu-order-id <id> [--close-sell-model NOT_SELL|TO_QUOTE|TO_USDT] [--slippage <值>] [--dry-run]
```

```bash
# 取消并将基础货币卖出为计价货币
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456 --close-sell-model TO_QUOTE

# 取消并保留基础货币（默认：NOT_SELL）
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456
```

#### bot spot_grid profit

从现货网格机器人提取累积的网格利润。

```bash
pionex-trade-cli bot spot_grid profit --bu-order-id <id> --amount <金额>
```

```bash
pionex-trade-cli bot spot_grid profit --bu-order-id 123456 --amount 10
```

### 智能跟单（需要认证）

#### bot smart_copy get

通过 ID 获取智能跟单机器人订单。

```bash
pionex-trade-cli bot smart_copy get --bu-order-id <id>
```

```bash
pionex-trade-cli bot smart_copy get --bu-order-id 123456
```

#### bot smart_copy create

创建智能跟单机器人订单。

```bash
pionex-trade-cli bot smart_copy create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--copy-from <id>] [--dry-run]
```

* `--base`：基础货币（如 `BTC`）
* `--quote`：计价货币（如 `USDT`）
* `--bu-order-data-json`：包含跟单参数的 JSON 字符串
* `--copy-from`：信号源 / 交易员 ID

**`buOrderData` 必填字段：**

| 字段              | 类型   | 描述                                                  |
| ----------------- | ------ | ----------------------------------------------------- |
| `quoteInvestment` | string | 计价货币投资金额                                      |
| `leverageType`    | string | `"follow"`（跟随信号源杠杆）或 `"fixed"`（固定杠杆） |

**`buOrderData` 选填字段：**

| 字段                | 类型   | 描述                                                    |
| ------------------- | ------ | ------------------------------------------------------- |
| `leverage`          | number | 自定义杠杆倍数（`leverageType=fixed` 时必填）           |
| `maxInvestPerOrder` | string | 每笔复制订单的最大投资额                                |
| `copyMode`          | string | `"fixed_amount"` 或 `"fixed_ratio"`                     |

**示例：**

```bash
# 创建跟单机器人（跟随信号源杠杆）
pionex-trade-cli bot smart_copy create --base BTC --quote USDT \
  --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}' \
  --copy-from <signalSourceId>

# 模拟运行（预览）
pionex-trade-cli bot smart_copy create --base BTC --quote USDT \
  --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}' \
  --copy-from <signalSourceId> --dry-run
```

#### bot smart_copy check_params

下单前校验智能跟单参数。返回服务端校验结果，`FailedWithData` 错误时会包含 `min_investment` 和 `max_investment`。

```bash
pionex-trade-cli bot smart_copy check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'
```

字段与 `smart_copy create` 相同。

```bash
pionex-trade-cli bot smart_copy check_params --base BTC --quote USDT \
  --bu-order-data-json '{"quoteInvestment":"100","leverageType":"follow"}'
```

#### bot smart_copy cancel

取消并关闭智能跟单机器人订单。

```bash
pionex-trade-cli bot smart_copy cancel --bu-order-id <id> [--close-sell-model NOT_SELL|TO_QUOTE|TO_USDT] [--dry-run]
```

```bash
# 取消并将持仓转换为 USDT
pionex-trade-cli bot smart_copy cancel --bu-order-id 123456 --close-sell-model TO_QUOTE

# 取消并保留基础资产（默认：NOT_SELL）
pionex-trade-cli bot smart_copy cancel --bu-order-id 123456
```

### 信号（需要认证）

#### bot signal add_listener

订阅信号源（跟单交易员）。

```bash
pionex-trade-cli bot signal add_listener --signal-source-id <id> [--listen-mode <mode>]
```

| 参数                 | 描述                         |
| -------------------- | ---------------------------- |
| `--signal-source-id` | 必填；信号源 ID              |
| `--listen-mode`      | 选填；订阅模式               |

```bash
pionex-trade-cli bot signal add_listener --signal-source-id <providerId>
```
