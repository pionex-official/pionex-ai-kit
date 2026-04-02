# 機器人命令

### 機器人訂單列表（需要認證）

#### bot order_list

列出所有類型的機器人訂單，支援可選過濾條件與分頁。

```bash
pionex-trade-cli bot order_list [--status running|finished] [--base <BASE>] [--quote <QUOTE>] [--page-token <token>] [--bu-order-types <types>]
```

| 參數 | 說明 |
| --- | --- |
| `--status` | `running`（預設）或 `finished` |
| `--base` | 基礎貨幣過濾（例如 `BTC`） |
| `--quote` | 計價貨幣過濾（例如 `USDT`） |
| `--page-token` | 分頁游標（來自上一次回應） |
| `--bu-order-types` | 逗號分隔的機器人類型：`futures_grid`、`spot_grid`、`smart_copy`。省略則回傳所有類型 |

**範例：**

```bash
# 列出所有執行中的機器人訂單
pionex-trade-cli bot order_list

# 僅列出合約網格訂單
pionex-trade-cli bot order_list --bu-order-types futures_grid

# 列出已取消的 BTC 現貨網格訂單
pionex-trade-cli bot order_list --status finished --base BTC --bu-order-types spot_grid

# 翻到下一頁
pionex-trade-cli bot order_list --page-token <token>
```

### 合約網格（需要認證）

#### bot futures_grid get

依 ID 查詢合約網格機器人訂單。

```bash
pionex-trade-cli bot futures_grid get --bu-order-id <id> [--lang <language>]
```

```bash
pionex-trade-cli bot futures_grid get --bu-order-id 123456
```

#### bot futures_grid create

建立合約網格機器人訂單。

```bash
pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--dry-run]
```

* `--base`：基礎貨幣（例如 `BTC`）；若缺少後綴會自動正規化為 `<BASE>.PERP`
* `--quote`：計價貨幣（例如 `USDT`）
* `--bu-order-data-json`：包含網格訂單參數的 JSON 字串

**`buOrderData` 必填欄位：**

| 欄位             | 類型   | 說明                                      |
| ----------------- | ------ | ------------------------------------------------ |
| `top`             | string | 網格上限價格                                 |
| `bottom`          | string | 網格下限價格                                 |
| `row`             | number | 網格層數                            |
| `grid_type`       | string | `"arithmetic"` 或 `"geometric"`                  |
| `trend`           | string | `"long"`、`"short"` 或 `"no_trend"`             |
| `leverage`        | number | 槓桿倍數                              |
| `quoteInvestment` | string | 以計價貨幣計算的投入金額              |

**範例：**

```bash
# 建立 BTC_USDT 做多合約網格機器人
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000",
  "bottom": "60000",
  "row": 50,
  "grid_type": "arithmetic",
  "trend": "long",
  "leverage": 5,
  "quoteInvestment": "1000"
}'

# 模擬執行（僅預覽）
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"80000","bottom":"60000","row":50,"grid_type":"arithmetic","trend":"long","leverage":5,"quoteInvestment":"1000"}' --dry-run
```

#### bot futures_grid adjust_params

調整合約網格機器人參數（追加投入、修改網格範圍等）。

```bash
pionex-trade-cli bot futures_grid adjust_params --body-json '<JSON>' [--dry-run]
```

**必填欄位：**

| 欄位         | 類型    | 說明                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| `buOrderId`   | string  | 合約網格機器人訂單 ID                                  |
| `type`        | string  | `"invest_in"`、`"adjust_params"` 或 `"invest_in_trigger"` |
| `extraMargin` | boolean | 額外保證金標誌                                          |

**範例：**

```bash
# 為現有機器人追加 500 USDT 保證金
pionex-trade-cli bot futures_grid adjust_params --body-json '{
  "buOrderId": "123456",
  "type": "invest_in",
  "extraMargin": true,
  "quoteInvestment": 500
}'
```

#### bot futures_grid reduce

減少合約網格機器人倉位。

```bash
pionex-trade-cli bot futures_grid reduce --body-json '<JSON>' [--dry-run]
```

| 欄位       | 類型   | 說明                                |
| ----------- | ------ | ------------------------------------------ |
| `buOrderId` | string | 合約網格機器人訂單 ID                  |
| `reduceNum` | number | 要減少的倉位數量（正整數） |

```bash
pionex-trade-cli bot futures_grid reduce --body-json '{"buOrderId": "123456", "reduceNum": 10}'
```

#### bot futures_grid cancel

取消並關閉合約網格機器人訂單。

```bash
pionex-trade-cli bot futures_grid cancel --bu-order-id <id> [--close-sell-model TO_QUOTE|TO_USDT] [--immediate] [--dry-run]
```

```bash
# 取消機器人並將倉位轉換為 USDT
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456 --close-sell-model TO_USDT

# 立即取消
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456 --immediate
```
