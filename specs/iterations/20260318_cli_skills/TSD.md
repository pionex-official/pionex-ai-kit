# Pionex AI Kit & Skills 技术方案文档（TSD）

## 1. 文档目标

本文档给出实现 `pionex-ai-kit` 与 `pionex-skills` 的工程化技术方案，覆盖：

- 架构分层
- 模块职责
- 命令与接口规范
- 错误模型
- 测试与发布

目标是使新团队可基于此文档直接落地实现。

---

## 2. 总体架构

```text
Agent (Cursor/Claude)
  ├─ Skills (Markdown playbooks)
  │    └─ call local CLI: pionex-trade-cli ...
  └─ MCP Client
       └─ pionex-trade-mcp (stdio)
            └─ @pionex-ai/core
                 └─ Pionex REST API

Human / Script
  └─ pionex-trade-cli
       └─ @pionex-ai/core
            └─ Pionex REST API
```

关键原则：

1. **CLI 与 MCP 共享 core**（避免双实现）。
2. **Skills 仅约束流程，不承载业务执行代码**。
3. **凭证只在本地**（env / `~/.pionex/config.toml`）。

---

## 3. 仓库与包结构

## 3.1 `pionex-ai-kit`（monorepo）

```text
pionex-ai-kit/
  package.json (workspaces)
  packages/
    core/
      src/
        config/
          toml.ts
        client/
          rest-client.ts
          types.ts
        tools/
          market.ts
          account.ts
          orders.ts
          types.ts
          index.ts
        utils/
          errors.ts
        constants.ts
        config.ts
        setup.ts
        index.ts
    cli/
      src/index.ts
      package.json
    mcp/
      src/index.ts
      src/server.ts
      package.json
```

## 3.2 `pionex-skills`

```text
pionex-skills/
  README.md
  skills/
    pionex-market/SKILL.md
    pionex-portfolio/SKILL.md
    pionex-trade/SKILL.md
```

---

## 4. 核心数据模型

## 4.1 配置模型

```ts
interface PionexConfig {
  apiKey?: string;
  apiSecret?: string;
  hasAuth: boolean;
  baseUrl: string;
  modules: ModuleId[]; // market | account | orders
  readOnly: boolean;
}
```

配置优先级：

1. CLI 参数
2. 环境变量（`PIONEX_API_KEY`, `PIONEX_API_SECRET`, `PIONEX_BASE_URL`）
3. `~/.pionex/config.toml` profile

## 4.2 工具模型

```ts
interface ToolSpec {
  name: string;
  description: string;
  module: "market" | "account" | "orders";
  isWrite: boolean;
  inputSchema: JsonSchema;
  handler(args: Record<string, unknown>, ctx: ToolContext): Promise<unknown>;
}
```

---

## 5. `@pionex-ai/core` 设计

## 5.1 职责

- 配置读取与校验
- REST 请求签名与发送
- 统一错误模型
- 工具注册与执行
- MCP 映射转换（`toMcpTool`）

## 5.2 REST Client

### public endpoints

- `publicGet(path, query)`

### signed endpoints

- `signedGet(path, query)`
- `signedPost(path, body)`
- `signedDelete(path, body)`

签名规则：

- 按 Pionex API 要求构造 payload（method + path?query + body）
- HMAC-SHA256(apiSecret)
- Header：`PIONEX-KEY`, `PIONEX-SIGNATURE`, `Content-Type`

## 5.3 错误模型

```ts
class ConfigError extends Error { suggestion?: string }
class PionexApiError extends Error { status?: number; endpoint?: string; responseText?: string }
```

`toToolErrorPayload(error)` 输出结构化错误，供 CLI stderr 与 MCP `isError` 复用。

## 5.4 工具装配

- `registerMarketTools()`
- `registerAccountTools()`
- `registerOrdersTools()`

通过 `buildTools(config)` 实现：

- `modules` 过滤
- `readOnly` 过滤（移除写工具）

---

## 6. CLI 技术方案

## 6.1 包与 bin

包名：`@pionex/pionex-ai-kit`

bin：

- `pionex-ai-kit`（onboard/setup）
- `pionex-trade-cli`（交易命令）

## 6.2 命令路由

### `pionex-ai-kit`

- `onboard`
- `setup`
- `help`

### `pionex-trade-cli`

- `market depth|trades|symbols|tickers|klines`
- `account balance`
- `orders new|get|open|all|fills|cancel|cancel-all`

## 6.3 参数解析

支持：

- `--k v`
- `--k=v`
- 布尔 flag（无值）

全局参数：`--profile`, `--modules`, `--base-url`, `--read-only`, `--dry-run`。

## 6.4 dry-run 实现

仅对写命令（orders new/cancel/cancel-all）生效：

- 不调用 API
- 输出将执行的 tool + args JSON

---

## 7. MCP 技术方案

## 7.1 包与入口

包名：`@pionex/pionex-trade-mcp`

命令：`pionex-trade-mcp`

## 7.2 Server 处理流程

1. 解析 CLI 参数并加载 `PionexConfig`
2. `buildTools(config)` 得到当前会话可用工具
3. 注册 MCP handlers：
   - `ListToolsRequestSchema`
   - `CallToolRequestSchema`
4. `CallTool` 时分发到 `ToolSpec.handler`
5. 返回 `structuredContent` + 文本 JSON

## 7.3 附加系统工具

`system_get_capabilities` 返回：

- `readOnly`
- `hasAuth`
- `moduleAvailability`

用于 Agent 侧规划与降级处理。

## 7.4 返回结构

### 成功

```json
{
  "tool": "pionex_market_get_tickers",
  "ok": true,
  "data": { ... },
  "capabilities": { ... },
  "timestamp": "..."
}
```

### 失败

```json
{
  "tool": "pionex_orders_new_order",
  "error": true,
  "type": "PionexApiError",
  "message": "...",
  "status": 400,
  "capabilities": { ... }
}
```

---

## 8. Skills 技术方案

## 8.1 安装与发现

推荐安装：

```bash
npx skills add pionex-official/pionex-skills
```

目标目录通常为 `~/.agents/skills/`（或 Agent 自定义目录）。

## 8.2 SKILL.md 规范

每个 skill 的 frontmatter 必须包含：

- `name`
- `description`
- `metadata.agent.requires.bins: ["pionex-trade-cli"]`
- `metadata.agent.install`（`@pionex/pionex-ai-kit`）

## 8.3 三个基础 skill 的职责

### `pionex-market`

- 仅读行情命令
- 明确“无需鉴权”

### `pionex-portfolio`

- 账户余额查询
- 明确“需要鉴权”

### `pionex-trade`

- 下单/撤单/查询订单
- 强制风控流程：
  - 先查余额
  - 最小下单量纠错
  - dry-run + 确认
  - cancel-all 前预览

---

## 9. 客户端配置写入方案（setup）

`runSetup({ client })` 根据客户端写入配置：

- Cursor：`~/.cursor/mcp.json`
- Claude Desktop：`claude_desktop_config.json`
- Claude Code：执行 `claude mcp add ...`
- Windsurf / VSCode / Openclaw：按各自路径写入

MCP 启动命令统一为：

```json
{
  "command": "npx",
  "args": ["-y", "@pionex/pionex-trade-mcp"]
}
```

---

## 10. 安全设计

1. 密钥不写入 skills 与 README 示例。
2. `onboard` 只写本地 TOML，不回显 secret。
3. README 明确建议 IP 白名单。
4. `--read-only` 为生产安全兜底。

---

## 11. 测试方案

## 11.1 单元测试

- config 解析优先级
- parseFlags 行为
- tool schema 与 handler 参数校验
- error payload 序列化

## 11.2 集成测试

- `pionex-trade-cli market tickers --symbol BTC_USDT`
- `pionex-trade-mcp --modules market` + list_tools + call_tool

## 11.3 E2E 测试

1. 安装 CLI
2. onboard 写配置
3. setup 写 MCP 客户端配置
4. Agent 调用 market tool 成功
5. 安装 skills 并验证可被识别

---

## 12. 构建与发布

## 12.1 构建

```bash
npm run build
```

建议顺序：core -> cli -> mcp。

## 12.2 发布

- `packages/cli`: `npm publish`
- `packages/mcp`: `npm publish`

`core` 可作为 workspace 私有包并在构建时 bundle（`noExternal`），避免用户安装时拉取私有依赖。

---

## 13. 版本与兼容策略

- 语义化版本：SemVer。
- 命令/参数改动遵循向后兼容原则。
- 若必须 breaking change，需在 README 与 CHANGELOG 显式标注。

---

## 14. 实施计划（建议）

- Phase 1：core + market（公共接口）
- Phase 2：account/orders + CLI
- Phase 3：MCP server + setup
- Phase 4：skills 三件套 + 文档
- Phase 5：测试与发布

---

## 15. 交付验收清单

- [ ] `npm i -g @pionex/pionex-ai-kit` 后可用两个命令：`pionex-ai-kit`, `pionex-trade-cli`
- [ ] `pionex-ai-kit onboard` 可创建 `~/.pionex/config.toml`
- [ ] `pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor` 可写配置
- [ ] MCP tools 列表与 FR 一致
- [ ] `npx skills add pionex-official/pionex-skills` 后 skills 可识别
- [ ] `pionex-trade` skill 风控流程可在对话中复现

