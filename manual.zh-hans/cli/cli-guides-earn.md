# 双向理财命令

双向理财（earn dual）允许你投资与加密货币价格目标挂钩的结构化产品。所有命令格式为 `pionex-trade-cli earn dual <command>`。

> **Beta：** 双向理财 API 当前处于 Beta 阶段，如需使用请联系 [open@pionex.com](mailto:open@pionex.com)。

**产品 ID 格式：** `{BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}`，其中 `C` = DUAL_BASE，`P` = DUAL_CURRENCY。

---

### 公开命令（无需 API Key）

#### earn dual symbols

列出双向理财支持的所有交易对。

```bash
pionex-trade-cli earn dual symbols [--base <BASE>]
```

```bash
# 所有支持的交易对
pionex-trade-cli earn dual symbols

# 按基础货币筛选
pionex-trade-cli earn dual symbols --base BTC
```

#### earn dual open-products

列出指定交易对和方向的当前开放产品。

```bash
pionex-trade-cli earn dual open-products --base <BASE> --quote <QUOTE> --type <DUAL_BASE|DUAL_CURRENCY> [--currency <CURRENCY>]
```

| 标志 | 必填 | 描述 |
|------|------|------|
| `--base` | 是 | 基础货币（如 `BTC`） |
| `--quote` | 是 | 计价货币。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `--type` | 是 | `DUAL_BASE`（投资基础货币）或 `DUAL_CURRENCY`（投资计价/投资货币） |
| `--currency` | 否 | 投资货币筛选。BTC/ETH 对：`USDT` 或 `USDC`；其他：`USDT`。 |

```bash
# BTC/ETH：使用 quote=USDXO
pionex-trade-cli earn dual open-products --base BTC --quote USDXO --type DUAL_BASE --currency USDT

# 其他基础货币（XRP 等）：使用 quote=USDT
pionex-trade-cli earn dual open-products --base XRP --quote USDT --type DUAL_BASE --currency USDT
```

#### earn dual prices

获取最新收益率和可申购状态。三个标志均为必填。

> **工作流：** 申购前必须先调用此命令获取 `profit`，并将其原样传入 `earn dual invest`，过期值会被拒绝。

```bash
pionex-trade-cli earn dual prices --base <BASE> --quote <QUOTE> --product-ids <id1,id2,...>
```

```bash
# BTC/USDXO 对
pionex-trade-cli earn dual prices --base BTC --quote USDXO --product-ids BTC-USDXO-260402-68000-P-USDT

# 多个产品 ID（逗号分隔）
pionex-trade-cli earn dual prices --base ETH --quote USDXO --product-ids ETH-USDXO-260410-3000-C-USDT,ETH-USDXO-260410-2900-C-USDT

# 其他基础货币（USDT 对）
pionex-trade-cli earn dual prices --base LRC --quote USDT --product-ids LRC-USDT-260410-0.03-C-USDT,LRC-USDT-260410-0.02-C-USDT
```

#### earn dual index

获取标的资产实时指数价格。两个标志均为必填。

```bash
pionex-trade-cli earn dual index --base <BASE> --quote <QUOTE>
```

```bash
# BTC/USDXO
pionex-trade-cli earn dual index --base BTC --quote USDXO

# 其他基础货币
pionex-trade-cli earn dual index --base LRC --quote USDT
```

#### earn dual delivery-prices

获取历史结算交割价格。`--base` 为必填。

```bash
pionex-trade-cli earn dual delivery-prices --base <BASE> [--quote <QUOTE>] [--start-time <ms>] [--end-time <ms>]
```

```bash
# BTC/USDXO
pionex-trade-cli earn dual delivery-prices --base BTC --quote USDXO

# 其他基础货币
pionex-trade-cli earn dual delivery-prices --base XRP --quote USDT
```

---

### 需要鉴权的命令（需要 API Key）

#### earn dual balances

查询双向理财账户余额。需要 `View` 权限。

```bash
pionex-trade-cli earn dual balances [--merge]
```

`--merge`：合并相同币种在不同基础货币下的余额。

#### earn dual records

查询双向理财历史订单。`--base` 和 `--end-time` 为必填。需要 `View` 权限。

```bash
pionex-trade-cli earn dual records --base <BASE> --end-time <ms> [--quote <QUOTE>] [--currency <CURRENCY>] [--limit <N>] [--start-time <ms>]
```

```bash
pionex-trade-cli earn dual records --base BTC --quote USDXO --end-time 1775027817297 --limit 20
```

#### earn dual get-invests

按客户端订单 ID 批量查询投资订单。需要 `View` 权限。

```bash
pionex-trade-cli earn dual get-invests [--base <BASE>] --client-dual-ids <id1,id2,...>
```

```bash
pionex-trade-cli earn dual get-invests --base BTC --client-dual-ids my-order-001,my-order-002
```

---

### 写操作命令（需要 Earn 权限）

所有写操作均支持 `--dry-run`，预览请求而不实际执行。

#### earn dual invest

创建双向理财申购订单。

```bash
pionex-trade-cli earn dual invest \
  --base <BASE> \
  --product-id <PRODUCT_ID> \
  [--client-dual-id <ID>] \
  (--base-amount <N> | --currency-amount <N>) \
  --profit <RATE> \
  [--dry-run]
```

| 标志 | 必填 | 描述 |
|------|------|------|
| `--base` | 是 | 基础货币（如 `BTC`） |
| `--product-id` | 建议 | 产品 ID（来自 `open-products`） |
| `--client-dual-id` | 建议 | 自定义订单 ID（幂等键） |
| `--base-amount` | 二选一 | 以基础货币计的投资金额 |
| `--currency-amount` | 二选一 | 以投资货币计的投资金额 |
| `--profit` | 是 | 来自 `prices` 的当前收益率（须原样传入） |

**示例：**

```bash
# 第一步：获取当前收益率
pionex-trade-cli earn dual prices \
  --base BTC \
  --quote USDXO \
  --product-ids BTC-USDXO-260402-68000-P-USDT

# 第二步：预览
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0039 \
  --dry-run

# 第三步：提交
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0039
```

#### earn dual revoke-invest

撤销待匹配的投资订单（匹配前可撤）。三个标志均为必填。

```bash
pionex-trade-cli earn dual revoke-invest \
  --base <BASE> \
  --product-id <PRODUCT_ID> \
  --client-dual-id <ID> \
  [--dry-run]
```

```bash
pionex-trade-cli earn dual revoke-invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001
```

#### earn dual collect

将已结算的双向理财收益提取到现货账户。三个标志均为必填。

```bash
pionex-trade-cli earn dual collect \
  --base <BASE> \
  --client-dual-id <ID> \
  --product-id <PRODUCT_ID> \
  [--dry-run]
```

```bash
pionex-trade-cli earn dual collect \
  --base BTC \
  --client-dual-id my-order-001 \
  --product-id BTC-USDXO-260402-68000-P-USDT
```
