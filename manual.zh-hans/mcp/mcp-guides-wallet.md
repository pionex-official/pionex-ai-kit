# 钱包工具

### 钱包工具（需要 API Key）

| 工具                              | 描述                                                   |
| --------------------------------- | ------------------------------------------------------ |
| `pionex_wallet_get_balance`       | 所有币种的现货账户余额                                 |
| `pionex_wallet_get_balance_full`  | 完整账户概览——现货＋合约余额、币种价格、USDT/BTC 估值总额 |

---

### `pionex_wallet_get_balance`

返回所有币种的现货（Bot Account）余额。

**输入：** 无

**示例提示词：**
> "使用 Pionex 工具显示我的现货余额。"

---

### `pionex_wallet_get_balance_full`

返回完整账户概览，包含：
- 现货（Bot Account）各分类余额
- 合约（Trader Account）余额、持仓及风控状态
- 各币种价格信息（USD/BTC 计价、24h 涨跌、全名）
- 全账户 USDT 和 BTC 估值总额

**输入参数（均为选填）：**

| 参数       | 类型   | 说明                                   |
| ---------- | ------ | -------------------------------------- |
| `appLang`  | string | 应用语言，例如 `en` 或 `zh`（优先于 sysLang） |
| `sysLang`  | string | 系统语言备选                           |

**示例提示词：**
> "使用 Pionex 工具显示我的完整钱包概览。"  
> "我的账户 USDT 总估值是多少？"  
> "显示我的合约账户余额和持仓。"
