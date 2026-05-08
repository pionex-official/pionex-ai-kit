# 钱包命令

### 钱包命令（需要认证）

#### wallet balance

获取所有现货账户余额（JSON 输出）。

```bash
pionex-trade-cli wallet balance
```

---

#### wallet balance_full

获取完整账户概览——现货（Bot Account）与合约（Trader Account）余额、各币种价格，以及 USDT/BTC 估值总额。

```bash
pionex-trade-cli wallet balance_full [--app-lang <lang>] [--sys-lang <lang>]
```

| 选项 | 说明 |
| --- | --- |
| `--app-lang` | 应用语言，例如 `en` 或 `zh`（优先于 `--sys-lang`） |
| `--sys-lang` | 系统语言备选 |

**示例：**

```bash
pionex-trade-cli wallet balance_full
pionex-trade-cli wallet balance_full --app-lang en
```
