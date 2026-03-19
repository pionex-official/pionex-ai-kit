# Pionex AI Kit & Skills 需求文档（PRD）

## 1. 文档目标

本文档定义两个从 0 到 1 的项目需求：

- `pionex-ai-kit`：面向终端用户与 AI 客户端的交易工具包（CLI + MCP）。
- `pionex-skills`：面向 Agent 的技能文档仓库（SKILL.md 集合），指导 Agent 安全调用本地 CLI / MCP。

目标是让研发团队仅依赖本文档即可实现可发布版本，并具备可验收标准。

---

## 2. 背景与问题

### 2.1 业务背景

Pionex 用户希望在 Cursor/Claude 等 AI 客户端中直接完成行情查询、账户查询、下单撤单等交易操作。

### 2.2 现有痛点

- 仅有 API 文档，对 Agent 不友好。
- 纯 MCP 工具缺少交易流程约束（先查余额、最小下单量校验、dry-run）。
- 用户安装复杂，不清楚如何完成凭证配置、MCP 注册、skills 安装。

### 2.3 目标用户

- 使用 AI 客户端的交易用户（Cursor/Claude/Windsurf/VSCode 等）。
- 量化/自动化开发者（CLI 脚本调用者）。
- 平台集成方（希望通过 MCP 暴露工具能力）。

---

## 3. 产品范围

## 3.1 项目 A：`pionex-ai-kit`

应提供以下能力：

1. **CLI 命令（两个入口）**
   - `pionex-ai-kit`：用于 onboarding/setup。
   - `pionex-trade-cli`：用于 market/account/orders 操作。

2. **MCP Server**
   - 命令：`pionex-trade-mcp`。
   - 通过 stdio 提供工具调用。
   - 支持模块过滤与只读模式。

3. **凭证管理**
   - 统一使用 `~/.pionex/config.toml`。
   - 支持 profile 概念与默认 profile。

4. **一键注册 MCP 客户端**
   - `pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>` 自动写配置。

5. **安全默认值**
   - 鼓励本地密钥存储，不写入聊天内容。
   - 支持 `--read-only`。
   - 写操作支持 `--dry-run`（CLI 层）。

## 3.2 项目 B：`pionex-skills`

应提供以下能力：

1. **标准 Skill 包结构**（每个 skill 一个目录 + `SKILL.md`）。
2. **至少三个基础技能**
   - `pionex-market`
   - `pionex-portfolio`
   - `pionex-trade`
3. **明确触发条件与路由边界**（避免错路由）。
4. **将交易风控流程写入技能文档**
   - 下单前检查余额
   - 最小下单量/最小名义价值处理
   - 写操作前 dry-run + 用户确认
5. **与 CLI 命令保持一致**（命令名、参数名、示例必须可执行）。

---

## 4. 非目标（Out of Scope）

- 本期不实现复杂策略引擎（如完整网格/DCA 生命周期管理）。
- 本期不实现云端托管服务（仅本地进程）。
- 本期不实现 UI 应用（仅 CLI + MCP + Skills 文档）。
- 本期不实现跨交易所聚合。

---

## 5. 关键用户故事

1. 作为交易用户，我希望 5 分钟内完成安装并在 Cursor 中调用 Pionex 工具。
2. 作为交易用户，我希望下单前 AI 先检查余额和最小下单约束，而不是直接报错。
3. 作为开发者，我希望通过 `pionex-trade-cli` 脚本化调用 market/account/orders。
4. 作为平台集成方，我希望通过 MCP 调用同一套能力，并可用 `--read-only` 控制风险。

---

## 6. 功能需求（FR）

## 6.1 `pionex-ai-kit` CLI 功能

### FR-CLI-001 onboarding

- 命令：`pionex-ai-kit onboard`
- 交互采集：API Key、API Secret、profile（可默认）。
- 写入：`~/.pionex/config.toml`。

### FR-CLI-002 setup

- 命令：`pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>`。
- 支持 client：`cursor`, `claude-desktop`, `claude-code`, `windsurf`, `vscode`, `openclaw`。
- 自动写入对应客户端配置。

### FR-CLI-003 trade commands

命令入口：`pionex-trade-cli`

- `market`：`depth`, `trades`, `symbols`, `tickers`, `klines`
- `account`：`balance`
- `orders`：`new`, `get`, `open`, `all`, `fills`, `cancel`, `cancel-all`

全局参数：`--profile`, `--modules`, `--base-url`, `--read-only`, `--dry-run`。

### FR-CLI-004 错误输出

- 统一 JSON 错误结构：`type`, `message`, `suggestion?`, `status?`。
- 错误码可映射为可读建议（如鉴权失败、余额不足、参数错误）。

## 6.2 MCP 功能

### FR-MCP-001 启动与配置

- 命令：`pionex-trade-mcp [--modules ...] [--profile ...] [--read-only]`。
- stdio 模式兼容 MCP 客户端。

### FR-MCP-002 工具列表（最小集合）

- Market:
  - `pionex_market_get_depth`
  - `pionex_market_get_trades`
  - `pionex_market_get_symbol_info`
  - `pionex_market_get_tickers`
  - `pionex_market_get_klines`
- Account:
  - `pionex_account_get_balance`
- Orders:
  - `pionex_orders_new_order`
  - `pionex_orders_get_order`
  - `pionex_orders_get_order_by_client_order_id`
  - `pionex_orders_get_open_orders`
  - `pionex_orders_get_all_orders`
  - `pionex_orders_get_fills`
  - `pionex_orders_cancel_order`
  - `pionex_orders_cancel_all_orders`

### FR-MCP-003 能力探测

- 提供 `system_get_capabilities` 返回：
  - `hasAuth`
  - `readOnly`
  - `moduleAvailability`

### FR-MCP-004 写操作限制

- `--read-only` 模式下，所有写工具不可执行。

## 6.3 Skills 功能

### FR-SKILL-001 结构规范

- 仓库结构：
  - `skills/pionex-market/SKILL.md`
  - `skills/pionex-portfolio/SKILL.md`
  - `skills/pionex-trade/SKILL.md`

### FR-SKILL-002 frontmatter 规范

每个 skill 需包含：

- `name`
- `description`
- `metadata.agent.requires.bins: ["pionex-trade-cli"]`
- `metadata.agent.install`（npm 包 `@pionex/pionex-ai-kit`）

### FR-SKILL-003 风控流程

`pionex-trade` 必须包含：

- 余额不足处理流程
- 最小下单量处理流程
- 写操作前 `--dry-run` + 二次确认
- cancel-all 前预览影响范围

### FR-SKILL-004 安装说明

README 应明确支持：

- `npx skills add pionex-official/pionex-skills`
- 说明 skills 通常安装到 `~/.agents/skills/`（或 agent 配置目录）

---

## 7. 非功能需求（NFR）

### NFR-001 安全

- 不在日志中输出明文 API Secret。
- README 强调 API key 不入 chat，建议 IP 白名单。

### NFR-002 兼容性

- Node.js >= 18。
- macOS/Linux/Windows 均可运行（路径处理需跨平台）。

### NFR-003 可维护性

- core 复用：CLI 与 MCP 共用一套业务实现。
- 文档命令示例与真实 CLI 参数保持一致。

### NFR-004 可测试性

- 单元测试覆盖参数解析与错误映射。
- e2e 最小链路：onboard -> setup -> MCP list_tools -> market tool call。

---

## 8. 信息架构与交付物

## 8.1 代码交付

- monorepo（workspaces）：
  - `packages/core`
  - `packages/cli`
  - `packages/mcp`

## 8.2 文档交付

- `README.md`（中英文可分文件）
- `CONTRIBUTING.md`
- `PUBLISH_AND_INSTALL.md`
- `pionex-skills/README.md`
- 三个技能 `SKILL.md`

---

## 9. 验收标准（Acceptance Criteria）

### AC-001 安装后命令可用

执行：

```bash
npm install -g @pionex/pionex-ai-kit
```

预期：

- `pionex-ai-kit --help` 可运行
- `pionex-trade-cli --help` 可运行

### AC-002 MCP 可注册并启动

执行：

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
```

预期：

- 客户端配置写入成功
- MCP 启动后可 `list_tools`

### AC-003 Market 工具可调用

执行（CLI 或 MCP 二选一均可）：

```bash
pionex-trade-cli market tickers --symbol BTC_USDT
```

预期：返回 ticker 数据。

### AC-004 Skills 可安装并被识别

执行：

```bash
npx skills add pionex-official/pionex-skills
```

预期：

- skills 出现在本地 skills 目录
- agent 可识别 `pionex-market`/`pionex-trade`/`pionex-portfolio`

### AC-005 风控流程可复现

在 agent 对话中让其“用 5 USDT 买 BTC”，预期 agent 按 `pionex-trade` skill 执行：

- 查 symbol 规则
- 提示最小名义价值
- 先 dry-run 再确认

---

## 10. 里程碑建议

- M1（1 周）：core + market/account/orders 最小 CLI
- M2（1 周）：MCP 封装 + setup 命令
- M3（0.5 周）：skills 三件套 + README
- M4（0.5 周）：测试、发布、验收

---

## 11. 风险与缓解

- API 变更风险：通过 core 层集中适配，CLI/MCP 不直接耦合。
- 文档与实现漂移：将 README 示例加入 CI smoke test。
- 用户误操作风险：默认强调 `--dry-run`，支持 `--read-only`。

---

## 12. 发布要求

- 发布包：
  - `@pionex/pionex-ai-kit`
  - `@pionex/pionex-trade-mcp`
- `pionex-skills` 作为 GitHub 仓库发布（不要求 npm 包）。

