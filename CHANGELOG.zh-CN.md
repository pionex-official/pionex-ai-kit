[English](CHANGELOG.md) | [中文](CHANGELOG.zh-CN.md)

# 更新日志

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) ，
版本管理遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

---

## [Unreleased]

### 变更

- 对齐 Pionex Bot “Futures Grid”（create/adjust/reduce）工具与 CLI 的输入契约，严格以 `openapi_bot.yaml` 为准：
  - MCP 工具命名统一为 `pionex_bot_futures_grid_{method}`
  - CLI 子命令 `adjust` -> `adjust_params`
  - create/adjust/reduce 输入中移除/禁止 `openPrice` 与 `keyId`；未知字段将直接报错
- 更新文档与 skills 指引，确保 Agent 按新的参数/字段规则调用。
- 文档：补充按版本号固定的升级建议（非 Bot 功能 vs 含 Bot）：
  - 非 Bot 功能：`@pionex/pionex-ai-kit@0.2.19` + `@pionex/pionex-trade-mcp@0.2.17`
  - 含 Futures Grid Bot：`@pionex/pionex-ai-kit@0.2.32` + `@pionex/pionex-trade-mcp@0.2.28`

