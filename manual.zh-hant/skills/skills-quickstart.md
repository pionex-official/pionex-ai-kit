# Skills 快速入門

Pionex Skills 是 AI Agent 的高階行為手冊，使其能夠透過 `pionex-trade-cli` 命令列安全地執行市場資料查詢、餘額查詢及現貨交易操作。

### 前置需求

* Node.js >= 18

### 安裝

#### 1. 安裝 CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

這會同時安裝 `pionex-trade-cli` 和 `pionex-ai-kit` 命令。

#### 2. 設定 API 憑證

```bash
pionex-ai-kit onboard
```

依照提示輸入您的 Pionex API Key 和 Secret。憑證會儲存到 `~/.pionex/config.toml`。

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 建立 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> 如果您只需要市場資料，可以跳過此步驟。

#### 3. 安裝 Skills

```bash
npx skills add pionex-official/pionex-skills
```

#### 4. 驗證安裝

```bash
# 測試市場資料（無需 API Key）
pionex-trade-cli market tickers --symbol BTC_USDT

# 測試帳戶查詢（需要 API Key）
pionex-trade-cli account balance
```

### 升級

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### 驗證 Skills 是否正常運作

在您的 AI 客戶端中輸入以下提示：

> 「使用 Pionex skills 顯示 BTC_USDT 的訂單簿深度 5。」

如果 Agent 成功呼叫 `pionex-trade-cli` 並回傳訂單簿資料，表示 Skills 已正確安裝。

### 後續步驟

* 查看 [Skills 使用指南](skills-guides.md) 以瞭解完整的 Skill 功能和使用詳情
