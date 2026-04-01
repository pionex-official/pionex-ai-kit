# MCP 使用指南

### 概覽

`@pionex/pionex-trade-mcp` 是一個 MCP（Model Context Protocol）伺服器，將 Pionex 交易所的功能以標準化工具的形式提供給 AI 客戶端。支援市場資料查詢、帳戶餘額查詢、訂單管理及合約網格機器人操作。

#### 設計原則

* **本地優先**：MCP Server 作為本地進程運行。API Key 儲存在環境變數或 `~/.pionex/config.toml` 中，不會出現在聊天記錄中。
* **MCP 原生**：相容任何符合 MCP 規範的客戶端。
* **憑證安全**：客戶端設定檔中只儲存伺服器啟動命令，不會寫入任何 API Key。

### 安裝

```bash
npm install -g @pionex/pionex-ai-kit
```

您可以選擇：

* 依賴 `npx @pionex/pionex-trade-mcp` 在伺服器啟動時按需取得最新版本
* 手動執行 `npm install -g @pionex/pionex-trade-mcp` 以固定全域版本

### 憑證設定

#### 互動式精靈

```bash
pionex-ai-kit onboard
```

精靈會要求輸入：

* **Pionex API Key**
* **Pionex API Secret**
* **設定檔名稱**（預設：`default`）

設定會寫入 `~/.pionex/config.toml`。支援多組設定檔 — 設定 `default_profile` 以選擇啟用的設定檔。

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 建立 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

#### 憑證優先順序

MCP Server 啟動時，憑證依以下順序解析：

1. **環境變數**（最高優先）：
   * `PIONEX_API_KEY`
   * `PIONEX_API_SECRET`
   * `PIONEX_BASE_URL`
   * 這些可來自您的 shell（`export ...`）或 MCP 客戶端設定（`env` 欄位）
2. **`~/.pionex/config.toml`**：僅在對應環境變數缺失時作為備用

### 註冊 MCP 伺服器

#### 自動設定（推薦）

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client-name>
```

註冊後**請重新啟動您的客戶端**。

支援的客戶端：

| `--client`                   | 寫入的設定檔                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| `cursor`                   | `~/.cursor/mcp.json`                                                    |
| `openclaw`                 | `~/.openclaw/workspace/config/mcporter.json`                            |
| `claude-desktop`           | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
| `claude-code` / `claude` | 不寫入檔案；執行 `claude mcp add` 命令                          |
| `windsurf`                 | `~/.codeium/windsurf/mcp_config.json`                                   |
| `vscode`                   | 當前專案目錄下的 `.mcp.json`                            |

#### 手動設定

如果您不想使用 `setup` 命令，可以手動將伺服器條目新增到客戶端設定中。

**Cursor**（`~/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "@pionex/pionex-trade-mcp"]
    }
  }
}
```

**Claude Desktop**、**VS Code** 及其他客戶端使用相同格式 — 只需保持 `"command"` 和 `"args"` 一致。憑證從 `~/.pionex/config.toml` 讀取，因此**無需在設定中放置 API Key**。

### 工具參考

* [交易工具](mcp-guides-trade.md) — 市場資料、帳戶餘額及現貨訂單操作
* [機器人工具](mcp-guides-bot.md) — 合約網格機器人的建立、管理與取消
* [雙幣理財工具](mcp-guides-earn.md) — 雙幣理財：查詢產品、申購、撤單、收益提取

### 範例提示

#### 市場查詢（無需 API Key）

* 「使用 Pionex 工具顯示 BTC_USDT 的訂單簿深度。」
* 「使用 Pionex 工具取得 ETH_USDT 最近 10 筆成交記錄。」
* 「取得 BTC_USDT 和 ADA_USDT 的交易對資訊。」

#### 帳戶與訂單操作（需要 API Key）

* 「使用 Pionex 工具列出我的現貨餘額。」
* 「使用 Pionex 工具在 BTC_USDT 以 30000 USDT 限價買入 0.01 BTC。」
* 「使用 Pionex 工具查詢 BTC_USDT 訂單 `<orderId>` 的狀態。」
* 「使用 Pionex 工具取消 BTC_USDT 的訂單 `<orderId>`。」

#### 機器人操作（需要 API Key）

* 「使用 Pionex 工具建立一個 BTC_USDT 做多合約網格機器人，價格範圍 60000–80000，50 格，5 倍槓桿，投入 1000 USDT。」
* 「使用 Pionex 工具查詢我的合約網格機器人 `<buOrderId>` 的狀態。」
* 「使用 Pionex 工具為我的合約網格機器人 `<buOrderId>` 追加 500 USDT 保證金。」
* 「使用 Pionex 工具從我的合約網格機器人 `<buOrderId>` 減少 10 個倉位。」
* 「使用 Pionex 工具取消我的合約網格機器人 `<buOrderId>`。」

### 安全最佳實踐

* **切勿**將 `~/.pionex/config.toml` 提交至版本控制或在聊天中貼上 API Key
* 為 Agent 使用**專用 API Key** 並設定最小權限
* 正式操作前先以小額進行測試
* 考慮在 Pionex API 設定中啟用 IP 白名單
