[English](CHANGELOG.md) | **简体中文** | [繁體中文](CHANGELOG.zh-hant.md)

# 更新日志

本文件记录本项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本项目遵循 [语义化版本](https://semver.org/spec/v2.0.0.html)。

---

## [未发布]

### 变更

- 将 Pionex Bot "合约网格" (创建/调整/缩减) 工具/CLI 接口与 `openapi_bot.yaml` 对齐：
  - MCP 工具命名统一为 `pionex_bot_futures_grid_{method}`
  - CLI 子命令 `adjust` 重命名为 `adjust_params`
  - 创建/调整/缩减输入中移除并禁止 `openPrice` 和 `keyId`；未知字段将报错
- 更新文档/技能指引，确保 AI 代理遵循新的更严格的参数规则和命名。
- 新增缺失的接口：`pionex_market_get_book_tickers`（公开市场最优买卖价）和 `pionex_orders_get_fills_by_order_id`（通过 `symbol` + `orderId` 查询签名订单成交记录）。
- 破坏性变更：CLI 二进制文件重命名 — `pionex` 已完全替换为 `pionex-trade-cli`。
- 破坏性变更：Bot CLI 路由 — 使用 `pionex-trade-cli bot futures_grid <command>`（如 `create`）替代 `pionex-trade-cli bot <command>`。
