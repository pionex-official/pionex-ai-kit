# CLI 快速入門

Pionex AI Kit 提供兩個 CLI 命令：

* **`pionex-ai-kit`** — 設定精靈與 MCP 客戶端配置
* **`pionex-trade-cli`** — 直接透過命令列存取 Pionex 市場資料、帳戶及訂單操作

### 前置需求

* Node.js >= 18

### 安裝

#### 1. 安裝 CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

這會同時安裝 `pionex-ai-kit` 和 `pionex-trade-cli` 命令。

#### 2. 設定 API 憑證

執行互動式設定精靈：

```bash
pionex-ai-kit onboard
```

依照提示輸入您的 Pionex API Key 和 Secret。憑證會儲存到 `~/.pionex/config.toml`。

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 建立 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> 如果您只需要公開市場資料，可以跳過此步驟。

#### 3. 驗證安裝

```bash
# 測試市場資料（無需 API Key）
pionex-trade-cli market tickers --symbol BTC_USDT

# 測試帳戶存取（需要 API Key）
pionex-trade-cli account balance
```

### 升級

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### 快速範例

```bash
# 訂單簿深度
pionex-trade-cli market depth BTC_USDT --limit 5

# 最近成交
pionex-trade-cli market trades BTC_USDT --limit 10

# 下一筆市價買單（模擬執行）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

### 後續步驟

* 查看 [CLI 使用指南](cli-guides.md) 以獲取完整的命令參考
