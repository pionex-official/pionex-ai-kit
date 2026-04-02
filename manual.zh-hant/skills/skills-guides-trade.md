# 交易 Skills

### pionex-market：市場資料

所有命令皆為唯讀，**不需要 API 憑證**。

#### 命令參考

| 命令                                                                             | 說明                                                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `pionex-trade-cli market depth <symbol> [--limit <n>]`                              | 訂單簿深度（買賣盤）；limit 1–100，預設 5           |
| `pionex-trade-cli market trades <symbol> [--limit <n>]`                             | 最近公開成交記錄；limit 1–100                              |
| `pionex-trade-cli market symbols [--symbols <list>] [--type SPOT\|PERP]`            | 交易對中繼資料（精度、最小數量）；以逗號分隔 |
| `pionex-trade-cli market tickers [--symbol <s>] [--type SPOT\|PERP]`                | 24 小時行情：開盤、收盤、最高、最低、成交量                     |
| `pionex-trade-cli market klines <symbol> <interval> [--endTime <ms>] [--limit <n>]` | OHLCV K 線；interval: 1M, 5M, 15M, 30M, 60M, 4H, 8H, 12H, 1D |

#### 範例

```bash
# 訂單簿深度（5 檔）
pionex-trade-cli market depth BTC_USDT --limit 5

# 最近 10 筆成交
pionex-trade-cli market trades BTC_USDT --limit 10

# 交易對精度與最小下單量
pionex-trade-cli market symbols --symbols BTC_USDT

# 24 小時行情
pionex-trade-cli market tickers --symbol BTC_USDT

# 4 小時 K 線（最近 24 根）
pionex-trade-cli market klines BTC_USDT 4H --limit 24
```

---

### pionex-portfolio：帳戶餘額

查詢現貨帳戶餘額。**需要 API 憑證**。

#### 命令

| 命令                            | 說明                         |
| ---------------------------------- | ----------------------------------- |
| `pionex-trade-cli account balance` | 所有現貨餘額，以 JSON 格式回傳 |

#### 使用範例

* 使用者：「我有多少 USDT？」
* Agent 執行 `pionex-trade-cli account balance`，然後從 JSON 回應中提取 USDT 可用餘額

---

### pionex-trade：現貨交易

現貨訂單的下單與管理。**需要 API 憑證**。

#### 命令參考

| 命令                                                                                                                   | 類型  | 說明                         |
| ------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------- |
| `pionex-trade-cli orders new --symbol <s> --side BUY\|SELL --type MARKET\|LIMIT [--amount\|--size] [--price] [--dry-run]` | 寫入 | 建立訂單                     |
| `pionex-trade-cli orders get --symbol <s> --order-id <id>`                                                                | 讀取  | 依 ID 查詢訂單                     |
| `pionex-trade-cli orders open --symbol <s>`                                                                               | 讀取  | 列出未完成訂單                    |
| `pionex-trade-cli orders all --symbol <s> [--limit <n>]`                                                                  | 讀取  | 訂單歷史記錄                       |
| `pionex-trade-cli orders fills --symbol <s> [--startTime] [--endTime]`                                                    | 讀取  | 成交明細                        |
| `pionex-trade-cli orders cancel --symbol <s> --order-id <id> [--dry-run]`                                                 | 寫入 | 取消特定訂單             |
| `pionex-trade-cli orders cancel_all --symbol <s> [--dry-run]`                                                             | 寫入 | 取消某交易對的所有未完成訂單 |

#### 訂單參數

* **市價買入**：使用 `--amount`（計價貨幣數量，例如 USDT）
* **市價賣出**：使用 `--size`（基礎貨幣數量，例如 BTC）
* **限價單**：使用 `--size` + `--price`

#### 範例

```bash
# 市價買入：花費 100 USDT 買入 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100

# 市價賣出：賣出 0.01 BTC
pionex-trade-cli orders new --symbol BTC_USDT --side SELL --type MARKET --size 0.01

# 限價買入
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01

# 取消訂單
pionex-trade-cli orders cancel --symbol BTC_USDT --order-id 123456

# 取消某交易對的所有未完成訂單
pionex-trade-cli orders cancel_all --symbol BTC_USDT
```

#### 行為約束

Skills 編碼了以下安全規則，Agent 在交易操作期間必須遵守：

1. **明確參數**：絕不猜測交易對、方向或數量。若使用者意圖不明確，Agent 會請求澄清。
2. **先模擬執行**：對於任何寫入操作（下單或取消訂單），優先以 `--dry-run` 執行，向使用者展示將會發生什麼，確認後再實際執行。
3. **餘額檢查**：下單前檢查可用餘額。若資金不足，不下單 — 告知使用者並建議調整金額。
4. **最小下單量**：若訂單因金額低於最小值而失敗，Agent 會查詢交易對規則（`market symbols`）並建議有效的數量。
5. **取消預覽**：執行 `cancel_all` 前，先列出當前未完成訂單並展示給使用者確認。
6. **不單方面增加風險**：Agent 絕不會在未經使用者明確同意的情況下增加訂單數量或追加訂單。

#### 交易流程範例

使用者：「用 1000 USDT 買 BTC」

Agent 執行流程：

1. 檢查餘額：`pionex-trade-cli account balance` -> 驗證可用 USDT
2. 若餘額不足（例如只有 600 USDT），告知使用者並建議調整
3. 使用者確認後，模擬執行預覽：`pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 600 --dry-run`
4. 使用者再次確認後，執行實際訂單（移除 `--dry-run`）
