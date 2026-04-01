# 双向理财工具

双向理财工具（`earn_dual` 模块）将 Pionex 双向理财 API 以 MCP 工具的形式暴露给 AI 客户端。

> **Beta：** 双向理财 API 当前处于 Beta 阶段，如需使用请联系 [open@pionex.com](mailto:open@pionex.com)。

---

### 公开工具（无需 API Key）

#### `pionex_earn_dual_symbols`

列出双向理财支持的所有交易对。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 否 | 基础货币筛选（如 `BTC`）。不填则返回全部。 |

#### `pionex_earn_dual_open_products`

列出指定交易对和方向的当前开放产品。

产品 ID 格式：`{BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}`，其中 `C` = DUAL_BASE，`P` = DUAL_CURRENCY。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币（如 `BTC`、`ETH`、`XRP`） |
| `quote` | 是 | 计价货币。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `type` | 是 | `DUAL_BASE`（投资基础货币）或 `DUAL_CURRENCY`（投资计价/投资货币） |
| `currency` | 否 | 投资货币筛选。BTC/ETH 对：`USDT` 或 `USDC`；其他：`USDT`。 |

#### `pionex_earn_dual_prices`

获取最新收益率和可申购状态。三个参数均为必填。

> **工作流：** 申购前必须先调用此接口获取 `profit`，并将其原样传入 `pionex_earn_dual_invest`，过期值会被拒绝。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币（如 `BTC`、`ETH`、`LRC`） |
| `quote` | 是 | 计价货币。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `productIds` | 是 | 来自 `pionex_earn_dual_open_products` 的产品 ID 数组 |

#### `pionex_earn_dual_index`

获取标的资产实时指数价格。两个参数均为必填。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币（如 `BTC`、`LRC`） |
| `quote` | 是 | 计价货币。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |

#### `pionex_earn_dual_delivery_prices`

获取历史结算交割价格。`base` 为必填。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币（如 `BTC`、`XRP`） |
| `quote` | 否 | 计价货币筛选。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `startTime` | 否 | 开始时间戳（毫秒） |
| `endTime` | 否 | 结束时间戳（毫秒） |

---

### 需要鉴权的工具 — View 权限

#### `pionex_earn_dual_balances`

查询双向理财账户余额。

| 参数 | 必填 | 描述 |
|------|------|------|
| `merge` | 否 | 合并相同币种在不同基础货币下的余额 |

#### `pionex_earn_dual_get_invests`

按客户端订单 ID 批量查询投资订单。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 否 | 基础货币 |
| `clientDualIds` | 否 | 客户端自定义订单 ID 数组 |

#### `pionex_earn_dual_records`

获取分页的投资历史记录。`base` 和 `endTime` 为必填。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币 |
| `endTime` | 是 | 结束时间戳（毫秒） |
| `quote` | 否 | 计价货币筛选 |
| `currency` | 否 | 投资货币筛选 |
| `filter` | 否 | 状态筛选 |
| `startTime` | 否 | 开始时间戳（毫秒） |
| `limit` | 否 | 每页最大记录数 |

---

### 需要鉴权的工具 — Earn 权限（写操作）

#### `pionex_earn_dual_invest`

创建双向理财申购订单。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币 |
| `productId` | 建议 | 要申购的产品 ID（来自 `pionex_earn_dual_open_products`） |
| `clientDualId` | 建议 | 自定义幂等键 |
| `baseAmount` | 二选一 | 以基础货币计的投资金额 |
| `currencyAmount` | 二选一 | 以投资货币计的投资金额 |
| `profit` | 是 | 来自 `pionex_earn_dual_prices` 的当前收益率（须原样传入） |

#### `pionex_earn_dual_revoke_invest`

撤销待匹配的投资订单。三个参数均为必填。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币 |
| `productId` | 是 | 要撤销订单的产品 ID |
| `clientDualId` | 是 | 客户端自定义订单 ID |

#### `pionex_earn_dual_collect`

将已结算收益提取到现货账户。三个参数均为必填。

| 参数 | 必填 | 描述 |
|------|------|------|
| `base` | 是 | 基础货币 |
| `clientDualId` | 是 | 客户端自定义订单 ID |
| `productId` | 是 | 产品 ID |

---

### 示例 Prompt

```
"用 Pionex 工具列出所有 BTC DUAL_BASE 方向的开放双向理财产品。"
"用 Pionex 工具查询 BTC-USDXO-260410-70000-C-USDT 的当前收益率。"
"用 Pionex 工具查看实时 BTC/USDXO 指数价格。"
"用 Pionex 工具查询我的双向理财余额。"
"用 Pionex 工具申购 100 USDT 投入 BTC-USDXO-260402-68000-P-USDT，使用当前收益率。"
"用 Pionex 工具撤销我的双向理财待匹配订单 my-order-001。"
"用 Pionex 工具提取我已结算的双向理财收益。"
"用 Pionex 工具查询我 BTC 双向理财的历史记录。"
```
