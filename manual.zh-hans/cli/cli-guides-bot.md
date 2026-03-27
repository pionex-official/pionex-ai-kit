# 机器人命令

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
