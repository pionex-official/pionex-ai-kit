# Skills 使用指南

### 概覽

Pionex Skills 是高階行為手冊，告訴 AI Agent 如何安全有效地使用 `pionex-trade-cli` 命令列工具進行加密貨幣交易操作。

與 MCP（定義工具介面）不同，Skills 還編碼了**風險控制和行為約束** — 例如下單前檢查餘額、遵守最小下單量以及使用模擬執行預覽。

### 安裝

```bash
# 安裝 CLI
npm install -g @pionex/pionex-ai-kit

# 設定憑證（在 https://www.pionex.com/my-account/api 建立 API Key）
pionex-ai-kit onboard

# 安裝 Skills
npx skills add pionex-official/pionex-skills
```

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 建立 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

### Skill 列表

| Skill                      | 說明                                                                | 需要 API Key |
| -------------------------- | -------------------------------------------------------------------------- | ---------------- |
| **pionex-market**    | 公開市場資料：訂單簿深度、行情、交易對資訊、K 線、成交記錄 | 否               |
| **pionex-portfolio** | 帳戶餘額（現貨）                                                     | 是              |
| **pionex-trade**     | 現貨訂單：下單、取消、未完成訂單、成交記錄                             | 是              |
| **pionex-bot**        | 合約網格機器人：建立、調整、減倉、取消、查詢                   | 是               |
| **pionex-earn-dual** | 雙幣理財：查詢產品與收益率、申購、撤單、提取收益                | 部分             |

### Skill 路由

Agent 會根據使用者意圖自動選擇適當的 Skill：

* 市場資料、價格、訂單簿、K 線 -> **pionex-market**
* 餘額、可用資金 -> **pionex-portfolio**
* 下單/取消訂單、訂單狀態 -> **pionex-trade**
* 合約網格機器人的建立/調整/減倉/取消/查詢 -> **pionex-bot**
* 雙幣理財查詢/申購/撤單/收益提取 -> **pionex-earn-dual**

---

### Skills

* [交易 Skills](skills-guides-trade.md) — 市場資料、帳戶餘額及現貨訂單操作
* [機器人 Skills](skills-guides-bot.md) — 合約網格機器人的建立、管理與取消
* [雙幣理財 Skills](skills-guides-earn.md) — 雙幣理財：查詢產品、申購、撤單、收益提取

---

### 跨 Skill 協作

下單通常涉及多個 Skill 協同運作：

```bash
# 1. 查看當前價格和 24 小時範圍（pionex-market）
pionex-trade-cli market tickers --symbol BTC_USDT

# 2. 查看交易對規則：最小下單量、精度（pionex-market）
pionex-trade-cli market symbols --symbols BTC_USDT

# 3. 查看可用餘額（pionex-portfolio）
pionex-trade-cli account balance

# 4. 下單（pionex-trade）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01
```

### 安全最佳實踐

* **切勿**將 `~/.pionex/config.toml` 提交至版本控制或在聊天中貼上 API Key
* 為 Agent 使用**專用 API Key** 並設定最小權限
* 正式操作前先以小額進行測試
* 考慮在 Pionex API 設定中啟用 IP 白名單
