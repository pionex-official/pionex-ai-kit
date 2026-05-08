# 錢包工具

### 錢包工具（需要 API Key）

| 工具                              | 說明                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `pionex_wallet_get_balance`       | 所有幣種的現貨帳戶餘額                                 |
| `pionex_wallet_get_balance_full`  | 完整帳戶概覽——現貨＋合約餘額、幣種價格、USDT/BTC 估值總額 |

---

### `pionex_wallet_get_balance`

返回所有幣種的現貨（Bot Account）餘額。

**輸入：** 無

**範例提示詞：**
> "使用 Pionex 工具顯示我的現貨餘額。"

---

### `pionex_wallet_get_balance_full`

返回完整帳戶概覽，包含：
- 現貨（Bot Account）各分類餘額
- 合約（Trader Account）餘額、持倉及風控狀態
- 各幣種價格資訊（USD/BTC 計價、24h 漲跌、全名）
- 全帳戶 USDT 和 BTC 估值總額

**輸入參數（均為選填）：**

| 參數       | 類型   | 說明                                   |
| ---------- | ------ | -------------------------------------- |
| `appLang`  | string | 應用語言，例如 `en` 或 `zh`（優先於 sysLang） |
| `sysLang`  | string | 系統語言備援                           |

**範例提示詞：**
> "使用 Pionex 工具顯示我的完整錢包概覽。"  
> "我的帳戶 USDT 總估值是多少？"  
> "顯示我的合約帳戶餘額和持倉。"
