# 雙向理財命令

雙向理財（earn dual）讓你投資與加密貨幣價格目標掛鉤的結構化產品。所有命令格式為 `pionex-trade-cli earn dual <command>`。

> **Beta：** 雙向理財 API 目前處於 Beta 階段，如需使用請聯絡 [open@pionex.com](mailto:open@pionex.com)。

**產品 ID 格式：** `{BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}`，其中 `C` = DUAL_BASE，`P` = DUAL_CURRENCY。

---

### 公開命令（無需 API Key）

#### earn dual symbols

列出雙向理財支援的所有交易對。

```bash
pionex-trade-cli earn dual symbols [--base <BASE>]
```

```bash
# 所有支援的交易對
pionex-trade-cli earn dual symbols

# 依基礎貨幣篩選
pionex-trade-cli earn dual symbols --base BTC
```

#### earn dual open-products

列出指定交易對和方向的當前開放產品。

```bash
pionex-trade-cli earn dual open-products --base <BASE> --quote <QUOTE> --type <DUAL_BASE|DUAL_CURRENCY> [--currency <CURRENCY>]
```

| 旗標 | 必填 | 說明 |
|------|------|------|
| `--base` | 是 | 基礎貨幣（如 `BTC`） |
| `--quote` | 是 | 計價貨幣。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `--type` | 是 | `DUAL_BASE`（投資基礎貨幣）或 `DUAL_CURRENCY`（投資計價/投資貨幣） |
| `--currency` | 否 | 投資貨幣篩選。BTC/ETH 對：`USDT` 或 `USDC`；其他：`USDT`。 |

```bash
# BTC/ETH：使用 quote=USDXO
pionex-trade-cli earn dual open-products --base BTC --quote USDXO --type DUAL_BASE --currency USDT

# 其他基礎貨幣（XRP 等）：使用 quote=USDT
pionex-trade-cli earn dual open-products --base XRP --quote USDT --type DUAL_BASE --currency USDT
```

#### earn dual prices

取得最新收益率和可申購狀態。三個旗標均為必填。

> **工作流程：** 申購前必須先執行此命令取得 `profit`，並將其原樣傳入 `earn dual invest`，過期值將被拒絕。

```bash
pionex-trade-cli earn dual prices --base <BASE> --quote <QUOTE> --product-ids <id1,id2,...>
```

```bash
# BTC/USDXO 對
pionex-trade-cli earn dual prices --base BTC --quote USDXO --product-ids BTC-USDXO-260402-68000-P-USDT

# 多個產品 ID（逗號分隔）
pionex-trade-cli earn dual prices --base ETH --quote USDXO --product-ids ETH-USDXO-260410-3000-C-USDT,ETH-USDXO-260410-2900-C-USDT

# 其他基礎貨幣（USDT 對）
pionex-trade-cli earn dual prices --base LRC --quote USDT --product-ids LRC-USDT-260410-0.03-C-USDT,LRC-USDT-260410-0.02-C-USDT
```

#### earn dual index

取得標的資產實時指數價格。兩個旗標均為必填。

```bash
pionex-trade-cli earn dual index --base <BASE> --quote <QUOTE>
```

```bash
# BTC/USDXO
pionex-trade-cli earn dual index --base BTC --quote USDXO

# 其他基礎貨幣
pionex-trade-cli earn dual index --base LRC --quote USDT
```

#### earn dual delivery-prices

取得歷史結算交割價格。`--base` 為必填。

```bash
pionex-trade-cli earn dual delivery-prices --base <BASE> [--quote <QUOTE>] [--start-time <ms>] [--end-time <ms>]
```

```bash
# BTC/USDXO
pionex-trade-cli earn dual delivery-prices --base BTC --quote USDXO

# 其他基礎貨幣
pionex-trade-cli earn dual delivery-prices --base XRP --quote USDT
```

---

### 需要驗證的命令（需要 API Key）

#### earn dual balances

查詢雙向理財帳戶餘額。需要 `View` 權限。

```bash
pionex-trade-cli earn dual balances [--merge]
```

`--merge`：合併相同幣種在不同基礎貨幣下的餘額。

#### earn dual records

查詢雙向理財歷史訂單。`--base` 和 `--end-time` 為必填。需要 `View` 權限。

```bash
pionex-trade-cli earn dual records --base <BASE> --end-time <ms> [--quote <QUOTE>] [--currency <CURRENCY>] [--limit <N>] [--start-time <ms>]
```

```bash
pionex-trade-cli earn dual records --base BTC --quote USDXO --end-time 1775027817297 --limit 20
```

#### earn dual get-invests

依客戶端訂單 ID 批次查詢投資訂單。需要 `View` 權限。

```bash
pionex-trade-cli earn dual get-invests [--base <BASE>] --client-dual-ids <id1,id2,...>
```

```bash
pionex-trade-cli earn dual get-invests --base BTC --client-dual-ids my-order-001,my-order-002
```

---

### 寫入命令（需要 Earn 權限）

所有寫入命令均支援 `--dry-run`，預覽請求而不實際執行。

#### earn dual invest

建立雙向理財申購訂單。

```bash
pionex-trade-cli earn dual invest \
  --base <BASE> \
  --product-id <PRODUCT_ID> \
  [--client-dual-id <ID>] \
  (--base-amount <N> | --currency-amount <N>) \
  --profit <RATE> \
  [--dry-run]
```

| 旗標 | 必填 | 說明 |
|------|------|------|
| `--base` | 是 | 基礎貨幣（如 `BTC`） |
| `--product-id` | 建議 | 產品 ID（來自 `open-products`） |
| `--client-dual-id` | 建議 | 自訂訂單 ID（冪等鍵） |
| `--base-amount` | 二選一 | 以基礎貨幣計的投資金額 |
| `--currency-amount` | 二選一 | 以投資貨幣計的投資金額 |
| `--profit` | 是 | 來自 `prices` 的當前收益率（須原樣傳入） |

**示例：**

```bash
# 第一步：取得當前收益率
pionex-trade-cli earn dual prices \
  --base BTC \
  --quote USDXO \
  --product-ids BTC-USDXO-260402-68000-P-USDT

# 第二步：預覽
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

撤銷待撮合的投資訂單（撮合前可撤）。三個旗標均為必填。

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

將已結算的雙向理財收益提取至現貨帳戶。三個旗標均為必填。

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
