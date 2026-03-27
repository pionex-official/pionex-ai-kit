# MCP 快速入門

Pionex Trade MCP Server 讓 AI 客戶端（Cursor、Claude Desktop、VS Code 等）可以直接呼叫 Pionex 交易所的功能，包括市場資料、帳戶查詢及訂單管理。

### 前置需求

* Node.js >= 18

### 安裝

#### 1. 安裝 CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

#### 2. 設定 API 憑證

執行互動式精靈，輸入您的 Pionex API Key 和 Secret：

```bash
pionex-ai-kit onboard
```

憑證會儲存到 `~/.pionex/config.toml`，支援多組設定檔。

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 建立 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> 如果您只需要市場資料（無需交易或餘額查詢），可以跳過此步驟。

#### 3. 在您的 AI 客戶端註冊 MCP 伺服器

選擇您使用的客戶端，執行對應的命令：

```bash
# Cursor
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor

# Claude Desktop
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop

# Claude Code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code

# VS Code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode

# Windsurf
pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf

# OpenClaw
pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw
```

#### 4. 重新啟動客戶端

設定完成後，**重新啟動您的 AI 客戶端**以使 MCP Server 生效。

### 升級

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### 驗證安裝

在您的 AI 客戶端中輸入以下提示：

> 「使用 Pionex 工具顯示 BTC_USDT 的訂單簿深度。」

如果 Agent 成功回傳 BTC_USDT 訂單簿，表示 MCP 已正確安裝。

### 後續步驟

* 查看 [MCP 使用指南](mcp-guides.md) 以瞭解完整功能和詳細設定
