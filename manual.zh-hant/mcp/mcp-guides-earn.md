# 雙幣理財工具

雙幣理財工具（`earn_dual` 模組）將 Pionex 雙幣理財 API 以 MCP 工具的形式提供給 AI 客戶端。

> **Beta：** 雙幣理財 API 目前處於 Beta 階段，如需使用請聯絡 [open@pionex.com](mailto:open@pionex.com)。

---

### 公開工具（無需 API Key）

#### `pionex_earn_dual_symbols`

列出雙幣理財支援的所有交易對。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 否 | 基礎貨幣篩選（如 `BTC`）。不填則返回全部。 |

#### `pionex_earn_dual_open_products`

列出指定交易對和方向的當前開放產品。

產品 ID 格式：`{BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}`，其中 `C` = DUAL_BASE，`P` = DUAL_CURRENCY。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣（如 `BTC`、`ETH`、`XRP`） |
| `quote` | 是 | 計價貨幣。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `type` | 是 | `DUAL_BASE`（投資基礎貨幣）或 `DUAL_CURRENCY`（投資計價/投資貨幣） |
| `currency` | 否 | 投資貨幣篩選。BTC/ETH 對：`USDT` 或 `USDC`；其他：`USDT`。 |

#### `pionex_earn_dual_prices`

取得最新收益率和可申購狀態。三個參數均為必填。

> **工作流程：** 申購前必須先呼叫此介面取得 `profit`，並將其原樣傳入 `pionex_earn_dual_invest`，過期值將被拒絕。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣（如 `BTC`、`ETH`、`LRC`） |
| `quote` | 是 | 計價貨幣。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `productIds` | 是 | 來自 `pionex_earn_dual_open_products` 的產品 ID 陣列 |

#### `pionex_earn_dual_index`

取得標的資產實時指數價格。兩個參數均為必填。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣（如 `BTC`、`LRC`） |
| `quote` | 是 | 計價貨幣。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |

#### `pionex_earn_dual_delivery_prices`

取得歷史結算交割價格。`base` 為必填。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣（如 `BTC`、`XRP`） |
| `quote` | 否 | 計價貨幣篩選。BTC/ETH 使用 `USDXO`；其他使用 `USDT`。 |
| `startTime` | 否 | 開始時間戳（毫秒） |
| `endTime` | 否 | 結束時間戳（毫秒） |

---

### 需要驗證的工具 — 讀取權限

#### `pionex_earn_dual_balances`

查詢雙幣理財帳戶餘額。

| 參數 | 必填 | 說明 |
|------|------|------|
| `merge` | 否 | 合併相同幣種在不同基礎貨幣下的餘額 |

#### `pionex_earn_dual_get_invests`

依客戶端訂單 ID 批次查詢投資訂單。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 否 | 基礎貨幣 |
| `clientDualIds` | 否 | 客戶端自訂訂單 ID 陣列 |

#### `pionex_earn_dual_records`

取得分頁投資歷史記錄。`base` 和 `endTime` 為必填。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣 |
| `endTime` | 是 | 結束時間戳（毫秒） |
| `quote` | 否 | 計價貨幣篩選 |
| `currency` | 否 | 投資貨幣篩選 |
| `filter` | 否 | 狀態篩選 |
| `startTime` | 否 | 開始時間戳（毫秒） |
| `limit` | 否 | 每頁最大記錄數 |

---

### 需要驗證的工具 — 理財權限（寫入）

#### `pionex_earn_dual_invest`

建立雙幣理財申購訂單。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣 |
| `productId` | 建議 | 要申購的產品 ID（來自 `pionex_earn_dual_open_products`） |
| `clientDualId` | 建議 | 自訂冪等鍵 |
| `baseAmount` | 二選一 | 以基礎貨幣計的投資金額 |
| `currencyAmount` | 二選一 | 以投資貨幣計的投資金額 |
| `profit` | 是 | 來自 `pionex_earn_dual_prices` 的當前收益率（須原樣傳入） |

#### `pionex_earn_dual_revoke_invest`

撤銷待撮合的投資訂單。三個參數均為必填。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣 |
| `productId` | 是 | 要撤銷訂單的產品 ID |
| `clientDualId` | 是 | 客戶端自訂訂單 ID |

#### `pionex_earn_dual_collect`

將已結算收益提取至現貨帳戶。三個參數均為必填。

| 參數 | 必填 | 說明 |
|------|------|------|
| `base` | 是 | 基礎貨幣 |
| `clientDualId` | 是 | 客戶端自訂訂單 ID |
| `productId` | 是 | 產品 ID |

---

### 示例 Prompt

```
"用 Pionex 工具列出所有 BTC DUAL_BASE 方向的開放雙幣理財產品。"
"用 Pionex 工具查詢 BTC-USDXO-260410-70000-C-USDT 的當前收益率。"
"用 Pionex 工具查看實時 BTC/USDXO 指數價格。"
"用 Pionex 工具查詢我的雙幣理財餘額。"
"用 Pionex 工具申購 100 USDT 投入 BTC-USDXO-260402-68000-P-USDT，使用當前收益率。"
"用 Pionex 工具撤銷我的雙幣理財待撮合訂單 my-order-001。"
"用 Pionex 工具提取我已結算的雙幣理財收益。"
"用 Pionex 工具查詢我 BTC 雙幣理財的歷史記錄。"
```
