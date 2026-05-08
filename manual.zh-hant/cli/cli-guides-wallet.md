# 錢包命令

### 錢包命令（需要認證）

#### wallet balance_full

取得完整帳戶概覽——現貨（Bot Account）與合約（Trader Account）餘額、各幣種價格，以及 USDT/BTC 估值總額。

```bash
pionex-trade-cli wallet balance_full [--app-lang <lang>] [--sys-lang <lang>]
```

| 選項 | 說明 |
| --- | --- |
| `--app-lang` | 應用語言，例如 `en` 或 `zh`（優先於 `--sys-lang`） |
| `--sys-lang` | 系統語言備援 |

**範例：**

```bash
pionex-trade-cli wallet balance_full
pionex-trade-cli wallet balance_full --app-lang en
```
