# CLI 使用指南

### 概覽

Pionex AI Kit 提供兩個 CLI 命令：

| 命令              | 用途                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `pionex-ai-kit`    | 設定精靈（`onboard`）與 MCP 客戶端註冊（`setup`）                             |
| `pionex-trade-cli` | 直接透過命令列存取 Pionex 市場資料、帳戶餘額、現貨訂單及合約網格機器人 |

兩者皆從同一個套件安裝：

```bash
npm install -g @pionex/pionex-ai-kit
```

---

### pionex-ai-kit

#### onboard — 設定憑證

```bash
pionex-ai-kit onboard
```

互動式精靈會要求輸入：

* **Pionex API Key**
* **Pionex API Secret**

憑證會寫入 `~/.pionex/config.toml` 的預設設定檔。

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 建立 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

#### setup — 註冊 MCP 伺服器

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>
```

為指定的 AI 客戶端寫入 MCP 伺服器設定，使其能夠啟動 `npx @pionex/pionex-trade-mcp`。不會將 API Key 寫入客戶端設定檔。

支援的 `--client` 值：

| 客戶端                       | 設定檔                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `cursor`                   | `~/.cursor/mcp.json`                                                    |
| `openclaw`                 | `~/.openclaw/workspace/config/mcporter.json`                            |
| `claude-desktop`           | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
| `claude-code` / `claude` | 執行 `claude mcp add`（不寫入檔案）                                 |
| `windsurf`                 | `~/.codeium/windsurf/mcp_config.json`                                   |
| `vscode`                   | 當前專案目錄下的 `.mcp.json`                            |

#### help

```bash
pionex-ai-kit help
```

---

### pionex-trade-cli

#### 使用方式

```
pionex-trade-cli <group> <command> [args] [--flags]
```

#### 全域參數

| 參數                 | 說明                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `--profile <name>` | 使用 `~/.pionex/config.toml` 中的指定設定檔                 |
| `--base-url <url>` | 覆蓋 API 基底 URL                                             |
| `--read-only`      | 停用寫入操作（下單/取消訂單）               |
| `--dry-run`        | 印出工具呼叫的載荷但不執行（僅限寫入操作） |

#### 憑證優先順序

1. **環境變數**（最高優先）：`PIONEX_API_KEY`、`PIONEX_API_SECRET`、`PIONEX_BASE_URL`
2. **`~/.pionex/config.toml`**：當環境變數未設定時作為備用

---

### 命令

* [交易命令](cli-guides-trade.md) — 市場資料及現貨訂單操作
* [錢包命令](cli-guides-wallet.md) — 帳戶餘額與完整帳戶概覽
* [機器人命令](cli-guides-bot.md) — 合約網格機器人的建立、管理與取消
* [雙幣理財命令](cli-guides-earn.md) — 雙幣理財：查詢產品、申購、撤單、收益提取

---

### 輸出格式

所有命令將 JSON 輸出至標準輸出。錯誤以 JSON 格式寫入標準錯誤輸出。

**範例輸出：**

```bash
$ pionex-trade-cli market tickers --symbol BTC_USDT
{
  "tickers": [
    {
      "symbol": "BTC_USDT",
      "open": "67000.00",
      "close": "67500.00",
      "high": "68000.00",
      "low": "66500.00",
      "volume": "1234.56"
    }
  ]
}
```

### 安全最佳實踐

* **切勿**將 `~/.pionex/config.toml` 提交至版本控制或在聊天中貼上 API Key
* 使用**專用 API Key** 並設定最小權限
* 使用 `--dry-run` 在執行前預覽訂單
* 使用 `--read-only` 在只需要資料時停用所有寫入操作
* 正式操作前先以小額進行測試
* 考慮在 Pionex API 設定中啟用 IP 白名單
