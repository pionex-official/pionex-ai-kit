[English](CHANGELOG.md) | [简体中文](CHANGELOG.zh-hans.md) | **繁體中文**

# 更新日誌

本檔案記錄本專案的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本專案遵循[語意化版本](https://semver.org/spec/v2.0.0.html)。

---

## [未發佈]

### 變更

- 將 Pionex Bot「合約網格」(建立/調整/縮減) 工具/CLI 介面與 `openapi_bot.yaml` 對齊：
  - MCP 工具命名統一為 `pionex_bot_futures_grid_{method}`
  - CLI 子命令 `adjust` 重新命名為 `adjust_params`
  - 建立/調整/縮減輸入中移除並禁止 `openPrice` 和 `keyId`；未知欄位將報錯
- 更新文件/技能指引，確保 AI 代理遵循新的更嚴格的參數規則和命名。
- 新增缺失的介面：`pionex_market_get_book_tickers`（公開市場最優買賣價）和 `pionex_orders_get_fills_by_order_id`（透過 `symbol` + `orderId` 查詢簽名訂單成交記錄）。
- 破壞性變更：CLI 二進位檔案重新命名 — `pionex` 已完全替換為 `pionex-trade-cli`。
- 破壞性變更：Bot CLI 路由 — 使用 `pionex-trade-cli bot futures_grid <command>`（如 `create`）取代 `pionex-trade-cli bot <command>`。
