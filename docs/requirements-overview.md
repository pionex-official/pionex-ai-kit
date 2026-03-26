# 需求概览

本文档汇总 Pionex AI Kit 项目的需求历史和当前状态。

## 当前状态

**最后更新：** 2026-03-26

### 核心功能

#### 1. MCP 服务器 (`@pionex/pionex-trade-mcp`)
**状态：** 已完成
**描述：** 提供 MCP 协议服务器，将 Pionex 交易 API 暴露为 MCP 工具供 AI 客户端使用

**工具模块：**
- ✅ Market 模块（公开市场数据，无需认证）
  - depth, trades, symbol_info, tickers, book_tickers, klines
- ✅ Account 模块（账户余额，需认证）
  - get_balance
- ✅ Orders 模块（现货订单，需认证）
  - new_order, get_order, cancel_order, get_fills, get_fills_by_order_id, 等
- ✅ Bot 模块（合约网格机器人，需认证）
  - futures_grid_create, get_order, adjust_params, reduce, cancel

#### 2. CLI 工具 (`@pionex/pionex-ai-kit`)
**状态：** 已完成
**描述：** 提供命令行工具用于配置和交易操作

**功能：**
- ✅ `onboard` 命令：交互式配置向导，生成 `~/.pionex/config.toml`
- ✅ `setup` 命令：为不同 MCP 客户端写入配置文件
  - 支持：cursor, claude-desktop, claude-code, windsurf, vscode, openclaw
- ✅ 直接交易命令（通过 `pionex-trade-cli` 别名）
  - market, account, orders, bot 子命令

#### 3. 核心库 (`@pionex-ai/core`)
**状态：** 已完成
**描述：** 私有共享库，被 CLI 和 MCP 打包使用

**提供：**
- ✅ `PionexRestClient`：REST API 封装，支持签名认证
- ✅ 工具系统：模块化工具注册和执行
- ✅ 配置管理：TOML 配置读写
- ✅ JSON Schema 验证（合约网格参数）

### 安全要求

- ✅ API 密钥存储在 `~/.pionex/config.toml`，不写入 MCP 客户端配置
- ✅ 凭证优先级：环境变量 > TOML 配置文件
- ✅ MCP 服务器通过 `npx` 启动，不在客户端配置中暴露密钥

## 迭代历史

### 2026-03-18: CLI & Skills 支持
**迭代目录：** `specs/iterations/20260318_cli_skills/`
**需求：** 添加 CLI 子命令支持和 Skills 对接

**详见：** `specs/iterations/20260318_cli_skills/PRD.md`

## 未来规划

暂无明确的未来需求。项目当前处于稳定状态，专注于维护和 bug 修复。

可能的扩展方向：
- 添加更多交易工具模块（VIP 端点、其他交易对类型）
- 增强错误处理和日志记录
- 添加测试覆盖

## 验收标准

每个新增功能需满足：
1. 工具可通过 MCP 客户端正确调用
2. CLI 命令提供 `--dry-run` 选项（写操作）
3. 错误消息清晰，包含可操作的修复建议
4. 文档更新（README.md, specs/docs/TOOLS.md）
