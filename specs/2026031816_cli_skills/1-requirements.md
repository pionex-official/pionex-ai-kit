# 需求文档：CLI & Skills 支持

## 变更概述

**迭代目标：** 为 Pionex AI Kit 添加完整的 CLI 命令支持和 Skills 集成能力

**变更类型：** 新功能（Feature）

**优先级：** P0（核心功能）

---

## 背景

### 业务背景

Pionex 用户希望在 Cursor/Claude 等 AI 客户端中直接完成行情查询、账户查询、下单撤单等交易操作。

### 现有痛点

1. 仅有 API 文档，对 Agent 不友好
2. 纯 MCP 工具缺少交易流程约束（先查余额、最小下单量校验、dry-run）
3. 用户安装复杂，不清楚如何完成凭证配置、MCP 注册、skills 安装

### 目标用户

- 使用 AI 客户端的交易用户（Cursor/Claude/Windsurf/VSCode 等）
- 量化/自动化开发者（CLI 脚本调用者）
- 平台集成方（希望通过 MCP 暴露工具能力）

---

## 需求详述

### 功能需求 1：完整的 CLI 命令支持

**当前状态：**
- 仅支持 `pionex-ai-kit onboard` 和 `setup` 命令
- 无法直接通过 CLI 执行交易操作

**期望状态：**
- 提供 `pionex-trade-cli` 命令别名
- 支持以下子命令：
  - `market`: depth, trades, symbols, tickers, klines
  - `account`: balance
  - `orders`: new, get, open, all, fills, cancel, cancel-all
- 支持全局参数：`--profile`, `--modules`, `--base-url`, `--read-only`, `--dry-run`

**验收标准：**
- [ ] `pionex-trade-cli market depth BTC_USDT --limit 5` 返回订单簿数据
- [ ] `pionex-trade-cli account balance` 返回账户余额
- [ ] `pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run` 显示将执行的订单参数
- [ ] 所有命令支持 `--help` 显示使用说明

### 功能需求 2：MCP 工具集完整性

**当前状态：**
- 基础 MCP 工具已实现

**期望状态：**
- 确保所有工具覆盖 Market、Account、Orders 模块
- 提供系统能力探测工具 `system_get_capabilities`

**工具清单：**

**Market（无需认证）：**
- `pionex_market_get_depth` - 订单簿深度
- `pionex_market_get_trades` - 最近成交
- `pionex_market_get_symbol_info` - 交易对信息
- `pionex_market_get_tickers` - 行情快照
- `pionex_market_get_klines` - K线数据

**Account（需认证）：**
- `pionex_account_get_balance` - 账户余额

**Orders（需认证）：**
- `pionex_orders_new_order` - 下单
- `pionex_orders_get_order` - 查询订单
- `pionex_orders_get_order_by_client_order_id` - 按客户端订单号查询
- `pionex_orders_get_open_orders` - 查询挂单
- `pionex_orders_get_all_orders` - 查询所有订单
- `pionex_orders_get_fills` - 查询成交记录
- `pionex_orders_cancel_order` - 撤单
- `pionex_orders_cancel_all_orders` - 撤销所有挂单

**验收标准：**
- [ ] 所有工具可通过 MCP 客户端列出
- [ ] `system_get_capabilities` 正确返回认证状态和模块可用性
- [ ] `--read-only` 模式下写操作工具不可执行

### 功能需求 3：Skills 仓库

**当前状态：**
- 无 Skills 文档

**期望状态：**
- 创建独立的 `pionex-skills` 仓库
- 提供 3 个基础 Skill：
  - `pionex-market` - 市场数据查询
  - `pionex-portfolio` - 账户查询
  - `pionex-trade` - 交易操作（含风控流程）

**Skill 规范：**
- 每个 Skill 包含 `SKILL.md` 文件
- Frontmatter 包含：name, description, requires.bins, install 信息
- `pionex-trade` Skill 必须包含风控流程：
  - 下单前查余额
  - 最小下单量校验
  - 写操作前 dry-run + 用户确认
  - cancel-all 前预览影响范围

**验收标准：**
- [ ] `npx skills add pionex-official/pionex-skills` 可安装
- [ ] AI 客户端能识别 3 个 Skill
- [ ] 在对话中让 AI "用 5 USDT 买 BTC"，AI 按风控流程执行

### 功能需求 4：MCP 客户端自动配置

**当前状态：**
- `setup` 命令已支持多个客户端

**期望状态：**
- 确保以下客户端配置正确写入：
  - `cursor` - `~/.cursor/mcp.json`
  - `claude-desktop` - macOS/Windows/Linux 不同路径
  - `claude-code` - 调用 `claude mcp add` 命令
  - `windsurf` - `~/.codeium/windsurf/mcp_config.json`
  - `vscode` - 项目级 `.mcp.json`
  - `openclaw` - `~/.openclaw/workspace/config/mcporter.json`

**验收标准：**
- [ ] 每个客户端执行 `pionex-ai-kit setup` 后配置文件正确生成
- [ ] 重启客户端后 MCP 服务器可启动
- [ ] 工具列表可正常获取

---

## 非功能需求

### NFR-1：安全性

- 不在日志中输出明文 API Secret
- README 强调 API key 不入 chat，建议 IP 白名单
- 支持 `--read-only` 模式限制写操作

### NFR-2：兼容性

- Node.js >= 18
- macOS/Linux/Windows 均可运行（路径处理需跨平台）

### NFR-3：可维护性

- CLI 与 MCP 复用 `@pionex-ai/core` 代码
- 文档命令示例与真实 CLI 参数保持一致

### NFR-4：易用性

- 错误消息清晰，提供可操作的修复建议
- 支持 `--help` 查看命令用法
- `--dry-run` 可预览操作而不执行

---

## 非目标（Out of Scope）

- 本期不实现复杂策略引擎（如完整网格/DCA 生命周期管理）
- 本期不实现云端托管服务（仅本地进程）
- 本期不实现 UI 应用（仅 CLI + MCP + Skills 文档）
- 本期不实现跨交易所聚合

---

## 用户故事

### 故事 1：快速上手
**作为** 交易用户
**我希望** 5 分钟内完成安装并在 Cursor 中调用 Pionex 工具
**以便** 快速开始使用 AI 辅助交易

### 故事 2：安全交易
**作为** 交易用户
**我希望** 下单前 AI 先检查余额和最小下单约束
**以便** 避免无效订单和资金风险

### 故事 3：脚本化调用
**作为** 开发者
**我希望** 通过 `pionex-trade-cli` 脚本化调用 market/account/orders
**以便** 集成到自动化交易系统

### 故事 4：风险控制
**作为** 平台集成方
**我希望** 通过 MCP 调用同一套能力，并可用 `--read-only` 控制风险
**以便** 在生产环境中安全使用

---

## 验收标准汇总

### 安装与配置
- [ ] `npm install -g @pionex/pionex-ai-kit` 后 `pionex-ai-kit` 和 `pionex-trade-cli` 命令可用
- [ ] `pionex-ai-kit onboard` 可创建 `~/.pionex/config.toml`
- [ ] `pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor` 可写入客户端配置

### CLI 命令
- [ ] `pionex-trade-cli market tickers --symbol BTC_USDT` 返回行情数据
- [ ] `pionex-trade-cli account balance` 返回账户余额（需配置 API key）
- [ ] `pionex-trade-cli orders new ... --dry-run` 显示将执行的订单参数

### MCP 工具
- [ ] MCP 客户端可列出所有工具
- [ ] Market 工具可正常调用（无需认证）
- [ ] Account/Orders 工具在有认证时可调用
- [ ] `system_get_capabilities` 返回正确的状态

### Skills
- [ ] `npx skills add pionex-official/pionex-skills` 可安装
- [ ] AI 客户端可识别 `pionex-market`/`pionex-portfolio`/`pionex-trade`
- [ ] `pionex-trade` Skill 的风控流程可在对话中复现

---

## 里程碑

- **M1（1周）**: core + CLI 基础命令（market/account/orders）
- **M2（1周）**: MCP 工具集完整性 + setup 命令优化
- **M3（0.5周）**: Skills 三件套 + README
- **M4（0.5周）**: 测试、发布、验收

---

## 风险与缓解

### 风险 1：API 变更
- **影响**: CLI/MCP 工具失效
- **缓解**: 通过 core 层集中适配，CLI/MCP 不直接耦合 API

### 风险 2：文档与实现漂移
- **影响**: 用户按文档操作失败
- **缓解**: 将 README 示例加入 CI smoke test

### 风险 3：用户误操作
- **影响**: 意外下单或撤单
- **缓解**: 默认强调 `--dry-run`，支持 `--read-only`，Skills 包含二次确认流程

---

## 参考资料

- Pionex API 文档：https://pionex-doc.gitbook.io/api-zh-hans/
- MCP 规范：https://spec.modelcontextprotocol.io/
- Skills 规范：Claude Code Skills 标准格式
