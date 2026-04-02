# 機器人 Skills

### pionex-bot：合約網格機器人

合約網格機器人的建立與管理。**需要 API 憑證**。

#### 命令參考

| 命令                                                                        | 類型  | 說明                                          |
| ------------------------------------------------------------------------------ | ----- | ---------------------------------------------------- |
| `pionex-trade-cli bot futures_grid get --bu-order-id <id>`                                  | 讀取  | 依 ID 查詢合約網格機器人訂單                   |
| `pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | 寫入 | 建立合約網格機器人訂單          |
| `pionex-trade-cli bot futures_grid adjust_params --body-json '<JSON>'`                      | 寫入 | 調整機器人參數（追加投入/網格範圍）              |
| `pionex-trade-cli bot futures_grid reduce --body-json '<JSON>'`                             | 寫入 | 減少機器人倉位                                 |
| `pionex-trade-cli bot futures_grid cancel --bu-order-id <id>`                               | 寫入 | 取消並關閉機器人訂單                         |

#### 建立參數

**`buOrderData` 必填欄位：**

* `top` / `bottom`：網格上限/下限價格
* `row`：網格層數
* `grid_type`：`"arithmetic"` 或 `"geometric"`
* `trend`：`"long"`、`"short"` 或 `"no_trend"`
* `leverage`：槓桿倍數
* `quoteInvestment`：以計價貨幣計算的投入金額

#### 範例

```bash
# 建立做多合約網格機器人
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000", "bottom": "60000", "row": 50,
  "grid_type": "arithmetic", "trend": "long",
  "leverage": 5, "quoteInvestment": "1000"
}'

# 查詢機器人狀態
pionex-trade-cli bot futures_grid get --bu-order-id 123456

# 追加保證金
pionex-trade-cli bot futures_grid adjust_params --body-json '{
  "buOrderId": "123456", "type": "invest_in",
  "extraMargin": true, "quoteInvestment": 500
}'

# 減少倉位
pionex-trade-cli bot futures_grid reduce --body-json '{"buOrderId": "123456", "reduceNum": 10}'

# 取消機器人
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456
```

#### 行為約束

1. **明確參數**：絕不猜測網格範圍、槓桿或投入金額。若不明確，請詢問使用者。
2. **先模擬執行**：對於任何寫入操作（建立、調整、減倉、取消），優先以 `--dry-run` 執行，向使用者展示將會發生什麼，確認後再實際執行。
3. **餘額檢查**：建立機器人前檢查可用餘額。若資金不足，告知使用者並建議調整投入金額。
4. **槓桿意識**：始終與使用者確認槓桿。絕不在未經明確同意的情況下增加槓桿。
5. **取消預覽**：取消機器人前，先取得其當前狀態並展示給使用者確認。
6. **不單方面增加風險**：Agent 絕不會在未經使用者明確同意的情況下增加投入、槓桿或網格範圍。

#### 機器人交易流程範例

使用者：「用 1000 USDT 建立一個做多 BTC 合約網格機器人」

Agent 執行流程：

1. 檢查餘額：`pionex-trade-cli account balance` -> 驗證可用 USDT
2. 取得交易對資訊：`pionex-trade-cli market symbols --symbols BTC_USDT --type PERP`
3. 取得當前價格：`pionex-trade-cli market tickers --symbol BTC_USDT --type PERP`
4. 詢問使用者網格範圍、格數和槓桿（若未指定）
5. 模擬執行預覽：`pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
6. 使用者確認後，執行實際建立（移除 `--dry-run`）

---

### pionex-bot：現貨網格機器人

現貨網格機器人的建立與管理。**需要 API 憑證**。

#### 命令參考

| 命令                                                                                                        | 類型  | 說明                                           |
| ----------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------- |
| `pionex-trade-cli bot spot_grid get --bu-order-id <id>`                                                     | 讀取  | 依 ID 查詢現貨網格機器人訂單                   |
| `pionex-trade-cli bot spot_grid get_ai_strategy --base <BASE> --quote <QUOTE>`                              | 讀取  | 取得交易對的 AI 推薦網格參數                   |
| `pionex-trade-cli bot spot_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'`         | 寫入  | 建立現貨網格機器人訂單                         |
| `pionex-trade-cli bot spot_grid adjust_params --bu-order-id <id> [--top <p>] [--bottom <p>] [--row <n>] [--quote-invest <amt>]` | 寫入 | 調整網格範圍或追加投入            |
| `pionex-trade-cli bot spot_grid invest_in --bu-order-id <id> --quote-invest <金額>`                         | 寫入  | 向執行中的機器人追加計價貨幣投入               |
| `pionex-trade-cli bot spot_grid cancel --bu-order-id <id> [--close-sell-model NOT_SELL\|TO_QUOTE\|TO_USDT]` | 寫入  | 取消並關閉機器人訂單                           |
| `pionex-trade-cli bot spot_grid profit --bu-order-id <id> --amount <金額>`                                  | 寫入  | 提取累積的網格利潤                             |

#### 建立參數

**`buOrderData` 必填欄位：**

* `top` / `bottom`：網格上限/下限價格
* `row`：網格層數（2–200）
* `gridType`：`"arithmetic"` 或 `"geometric"`（駝峰命名，與合約網格的 `grid_type` 不同）
* `quoteTotalInvestment`：以計價貨幣計算的投入金額

**與合約網格的關鍵差異：**
- 無 `leverage`（槓桿）與 `trend`（方向）欄位（現貨，非合約）
- `gridType` 為駝峰命名；合約網格使用 `grid_type` 底線命名
- 建立時使用 `quoteTotalInvestment`，而非 `quoteInvestment`
- 追加投入使用 `quoteInvest`
- 預設 `closeSellModel` 為 `NOT_SELL`（合約網格預設為 `TO_QUOTE`）

#### 範例

```bash
# 取得 AI 策略推薦
pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT

# 建立現貨網格機器人（先模擬執行）
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000", "bottom": "90000", "row": 50,
  "gridType": "arithmetic", "quoteTotalInvestment": "100"
}' --dry-run

# 查詢機器人狀態
pionex-trade-cli bot spot_grid get --bu-order-id 123456

# 追加投入
pionex-trade-cli bot spot_grid invest_in --bu-order-id 123456 --quote-invest 50

# 調整網格範圍
pionex-trade-cli bot spot_grid adjust_params --bu-order-id 123456 --top 120000 --bottom 85000

# 提取利潤
pionex-trade-cli bot spot_grid profit --bu-order-id 123456 --amount 10

# 取消機器人
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456 --close-sell-model TO_QUOTE
```

#### 行為約束

1. **明確參數**：絕不猜測網格範圍或投入金額。若不明確，請詢問使用者。
2. **優先 AI 策略**：對於新機器人，建議先呼叫 `get_ai_strategy` 取得推薦參數，再由使用者確認或調整。
3. **先模擬執行**：對於任何寫入操作（建立、調整、追加投入、取消、提取利潤），優先以 `--dry-run` 執行，確認後再實際執行。
4. **餘額檢查**：建立機器人前，檢查可用計價貨幣餘額。
5. **取消預覽**：取消機器人前，先取得其當前狀態並展示給使用者確認。
6. **不單方面增加風險**：Agent 絕不會在未經使用者明確同意的情況下增加投入或網格範圍。

#### 現貨網格交易流程範例

使用者：「用 100 USDT 建立一個 BTC 現貨網格機器人」

Agent 執行流程：

1. 檢查餘額：`pionex-trade-cli account balance` → 驗證可用 USDT
2. 取得 AI 策略：`pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT`
3. 取得當前價格：`pionex-trade-cli market tickers --symbol BTC_USDT`
4. 展示 AI 推薦參數；請使用者確認或調整
5. 模擬執行預覽：`pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
6. 使用者確認後，執行實際建立（移除 `--dry-run`）
