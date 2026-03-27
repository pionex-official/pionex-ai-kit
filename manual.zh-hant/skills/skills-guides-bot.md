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
