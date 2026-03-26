# 技术设计文档：CLI & Skills 支持

## 设计目标

本文档给出实现 CLI 命令支持和 Skills 集成的详细技术设计，包括：
- 架构分层和模块职责
- 命令与接口规范
- 数据模型和错误处理
- 文件变更清单

---

## 总体架构

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

**设计原则：**
1. CLI 与 MCP 共享 `@pionex-ai/core` 代码（避免双重实现）
2. Skills 仅约束流程，不承载业务执行代码
3. 凭证只在本地（env 或 `~/.pionex/config.toml`）

---

## 数据模型

### 配置模型

```typescript
interface PionexConfig {
  apiKey?: string;
  secretKey?: string;
  hasAuth: boolean;
  baseUrl: string;
  modules: ModuleId[];  // "market" | "account" | "orders" | "bot"
  readOnly: boolean;
}
```

**配置优先级：**
1. CLI 参数（`--api-key`, `--secret-key`, `--read-only` 等）
2. 环境变量（`PIONEX_API_KEY`, `PIONEX_API_SECRET`, `PIONEX_BASE_URL`）
3. TOML 配置文件（`~/.pionex/config.toml` 的指定 profile）

### 工具模型

```typescript
interface ToolSpec {
  name: string;                   // 工具名称，如 "pionex_market_get_depth"
  description: string;            // 工具描述
  module: ModuleId;               // 所属模块
  isWrite: boolean;               // 是否为写操作
  inputSchema: JsonSchema;        // 输入参数 schema
  handler(args: ToolArgs, ctx: ToolContext): Promise<unknown>;
}

interface ToolContext {
  client: PionexRestClient;
  config: PionexConfig;
}
```

---

## 核心模块设计

### 1. `@pionex-ai/core` 职责

**职责范围：**
- 配置读取与校验（`config.ts`, `config/toml.ts`）
- REST 请求签名与发送（`client/rest-client.ts`）
- 统一错误模型（`utils/errors.ts`）
- 工具注册与执行（`tools/index.ts`）
- MCP 映射转换（`tools/types.ts` 的 `toMcpTool()`）

**关键文件：**
```
packages/core/src/
  config/
    toml.ts              # TOML 配置读写
  client/
    rest-client.ts       # REST API 封装
    types.ts             # 请求/响应类型
  tools/
    market.ts            # Market 模块工具
    account.ts           # Account 模块工具
    orders.ts            # Orders 模块工具
    bot.ts               # Bot 模块工具（如需）
    types.ts             # ToolSpec 和 toMcpTool()
    index.ts             # 工具注册表
  utils/
    errors.ts            # ConfigError, PionexApiError
  constants.ts           # MODULES, DEFAULT_BASE_URL
  config.ts              # loadConfig()
  setup.ts               # MCP 客户端配置写入
  index.ts               # 导出所有公开 API
```

### 2. REST Client 设计

**类定义：**

```typescript
class PionexRestClient {
  constructor(config: {
    apiKey: string;
    secretKey: string;
    baseUrl: string
  })

  // 公开端点（无需认证）
  async publicGet(path: string, query?: QueryParams): Promise<RequestResult>

  // 私有端点（需认证 + 签名）
  async privatePost(path: string, params?: Record<string, unknown>): Promise<RequestResult>
}

interface RequestResult {
  data: unknown;
  result: boolean;
  message?: string;
}
```

**签名算法：**
```
message = timestamp + method + path + body
signature = HMAC-SHA256(message, secretKey)
headers = {
  "PIONEX-KEY": apiKey,
  "PIONEX-SIGNATURE": signature,
  "PIONEX-TIMESTAMP": timestamp
}
```

- `timestamp`: 13 位毫秒时间戳
- `body`: JSON 字符串（`JSON.stringify()`）
- `path`: 包含 query string（如有）

### 3. 错误模型

```typescript
class ConfigError extends Error {
  constructor(message: string, public suggestion?: string) {}
}

class PionexApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {}
}

function toToolErrorPayload(error: Error): {
  type: string;
  message: string;
  suggestion?: string;
  status?: number;
} {}
```

**错误处理流程：**
- CLI: 捕获错误 → 输出到 stderr → `process.exit(1)`
- MCP: 捕获错误 → 转为 `CallToolResult` 的 `isError: true` 格式

### 4. 工具装配

**注册函数：**
```typescript
function registerMarketTools(): ToolSpec[]
function registerAccountTools(): ToolSpec[]
function registerOrdersTools(): ToolSpec[]
function registerBotTools(): ToolSpec[]
```

**构建函数：**
```typescript
function buildTools(config: PionexConfig): ToolSpec[] {
  const enabled = new Set(config.modules);
  const tools = allToolSpecs().filter(t => enabled.has(t.module));

  if (!config.readOnly) return tools;
  return tools.filter(t => !t.isWrite);
}
```

**工具执行器：**
```typescript
type ToolRunner = (toolName: string, args: ToolArgs) => Promise<ToolResult>

function createToolRunner(
  client: PionexRestClient,
  config: PionexConfig
): ToolRunner
```

---

## CLI 技术设计

### 1. 包与 Bin

**包名：** `@pionex/pionex-ai-kit`

**Bin 入口：**
```json
{
  "bin": {
    "pionex-ai-kit": "dist/index.js",
    "pionex-trade-cli": "dist/index.js"
  }
}
```

**入口逻辑：** 根据 `process.argv[1]` 的 basename 区分命令：
- `pionex-ai-kit` → onboard/setup/help
- `pionex-trade-cli` → market/account/orders/bot

### 2. 命令路由

#### `pionex-ai-kit` 命令

```typescript
function main() {
  const cmd = process.argv[2];

  switch(cmd) {
    case "onboard": return cmdOnboard();
    case "setup": return cmdSetup(process.argv.slice(3));
    case "help": return printHelp();
    default: return printHelp();
  }
}
```

#### `pionex-trade-cli` 命令

```typescript
function main() {
  const module = process.argv[2];  // market | account | orders | bot
  const command = process.argv[3];  // depth | balance | new | ...
  const args = parseArgs(process.argv.slice(4));

  return cmdTrade(module, command, args);
}
```

### 3. 参数解析

**支持格式：**
- `--key value`
- `--key=value`
- `--flag` (布尔，无值)

**全局参数：**
- `--profile <name>` - 使用指定 profile
- `--modules <m1,m2>` - 启用的模块列表
- `--base-url <url>` - API 基础 URL
- `--read-only` - 只读模式（过滤写工具）
- `--dry-run` - 预览模式（不执行 API 调用）

**实现：**
```typescript
function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      if (arg.includes("=")) {
        const [key, value] = arg.slice(2).split("=");
        result[key] = value;
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];

        if (next && !next.startsWith("--")) {
          result[key] = next;
          i++;
        } else {
          result[key] = true;
        }
      }
    }
  }

  return result;
}
```

### 4. Dry-run 实现

**仅对写操作生效：**
- `orders new`
- `orders cancel`
- `orders cancel-all`
- `bot futures_grid create/adjust/reduce/cancel`

**实现方式：**
```typescript
async function cmdTrade(module, command, args) {
  const config = loadConfig({ ...args, dryRun: args["dry-run"] });

  if (config.readOnly && isWriteCommand(module, command)) {
    // 输出将执行的工具和参数
    console.log(JSON.stringify({
      tool: getToolName(module, command),
      args: extractToolArgs(args)
    }, null, 2));
    return;
  }

  // 正常执行
  const runner = createToolRunner(client, config);
  const result = await runner(toolName, toolArgs);
  console.log(JSON.stringify(result.data, null, 2));
}
```

---

## MCP 技术设计

### 1. 包与入口

**包名：** `@pionex/pionex-trade-mcp`

**Bin 入口：**
```json
{
  "bin": {
    "pionex-trade-mcp": "dist/index.js"
  }
}
```

### 2. Server 处理流程

```typescript
export function createMcpServer(config: PionexConfig): Server {
  const server = new Server({
    name: "pionex-trade-mcp",
    version: resolveServerVersion()
  }, {
    capabilities: { tools: {} }
  });

  const client = new PionexRestClient({ ...config });
  const tools = buildTools(config);

  // 注册工具列表 handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...tools.map(toMcpTool),
      SYSTEM_CAPABILITIES_TOOL
    ]
  }));

  // 注册工具调用 handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "system_get_capabilities") {
      return handleCapabilities(config);
    }

    const tool = tools.find(t => t.name === name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${name}` }]
      };
    }

    try {
      const data = await tool.handler(args, { client, config });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      const payload = toToolErrorPayload(error);
      return {
        isError: true,
        content: [{
          type: "text",
          text: JSON.stringify(payload, null, 2)
        }]
      };
    }
  });

  return server;
}
```

### 3. 系统能力工具

**工具定义：**
```typescript
const SYSTEM_CAPABILITIES_TOOL: Tool = {
  name: "system_get_capabilities",
  description: "Return server capabilities and module availability",
  inputSchema: {
    type: "object",
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true
  }
};
```

**返回结构：**
```typescript
interface CapabilitySnapshot {
  readOnly: boolean;
  hasAuth: boolean;
  moduleAvailability: Record<ModuleId, {
    status: "enabled" | "disabled" | "requires_auth";
    reasonCode?: string;
  }>;
}
```

---

## Skills 技术设计

### 1. 仓库结构

```
pionex-skills/
  README.md
  skills/
    pionex-market/
      SKILL.md
    pionex-portfolio/
      SKILL.md
    pionex-trade/
      SKILL.md
```

### 2. SKILL.md 规范

**Frontmatter：**
```yaml
---
name: pionex-market
description: Query Pionex public market data (depth, trades, tickers, klines)
metadata:
  agent:
    requires:
      bins: ["pionex-trade-cli"]
    install:
      npm: "@pionex/pionex-ai-kit"
---
```

**内容结构：**
1. 触发条件（When to use this skill）
2. 前置条件（Prerequisites）
3. 命令参考（Commands）
4. 示例（Examples）
5. 错误处理（Error handling）

### 3. 三个 Skill 的职责

#### `pionex-market`
- **用途**: 查询公开市场数据
- **无需认证**: 明确说明
- **命令**:
  - `pionex-trade-cli market depth <symbol>`
  - `pionex-trade-cli market trades <symbol>`
  - `pionex-trade-cli market tickers`

#### `pionex-portfolio`
- **用途**: 查询账户信息
- **需要认证**: 明确说明
- **命令**:
  - `pionex-trade-cli account balance`

#### `pionex-trade`
- **用途**: 下单、撤单、查询订单
- **需要认证**: 明确说明
- **风控流程**:
  1. 先查询余额：`pionex-trade-cli account balance`
  2. 检查最小下单量（从 symbol info 获取）
  3. 使用 `--dry-run` 预览订单
  4. 等待用户确认
  5. 执行真实订单
  6. `cancel-all` 前预览将影响的订单数量

---

## MCP 客户端配置

### Setup 命令实现

**函数签名：**
```typescript
export function runSetup(options: SetupOptions): void

interface SetupOptions {
  client: ClientId;
  mcpServerName?: string;
}

type ClientId =
  | "cursor"
  | "claude-desktop"
  | "claude-code"
  | "windsurf"
  | "vscode"
  | "openclaw";
```

**配置路径映射：**
```typescript
const CONFIG_PATHS: Record<ClientId, string> = {
  "cursor": "~/.cursor/mcp.json",
  "claude-desktop": platform === "darwin"
    ? "~/Library/Application Support/Claude/claude_desktop_config.json"
    : "...",  // Windows/Linux
  "windsurf": "~/.codeium/windsurf/mcp_config.json",
  "vscode": ".mcp.json",  // 项目级
  "openclaw": "~/.openclaw/workspace/config/mcporter.json"
};
```

**MCP 配置格式：**
```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "@pionex/pionex-trade-mcp"]
    }
  }
}
```

**Claude Code 特殊处理：**
```typescript
if (client === "claude-code") {
  execSync("claude mcp add --scope user --transport stdio pionex-trade-mcp -- @pionex/pionex-trade-mcp");
  return;
}
```

---

## 文件变更清单

### 新增文件

**Core:**
- ✅ `packages/core/src/tools/bot.ts` - Bot 模块工具（如需）
- ✅ `packages/core/src/schemas/futures-grid-create.ts` - 合约网格参数验证

**CLI:**
- （无新增，修改现有 `packages/cli/src/index.ts`）

**MCP:**
- （无新增，修改现有 `packages/mcp/src/server.ts`）

**Skills:**
- `pionex-skills/README.md`
- `pionex-skills/skills/pionex-market/SKILL.md`
- `pionex-skills/skills/pionex-portfolio/SKILL.md`
- `pionex-skills/skills/pionex-trade/SKILL.md`

### 修改文件

**Core:**
- `packages/core/src/tools/index.ts` - 添加 bot 工具注册
- `packages/core/src/tools/market.ts` - 补充缺失的工具（如 klines）
- `packages/core/src/tools/orders.ts` - 补充缺失的工具（如 get_fills_by_order_id）
- `packages/core/src/constants.ts` - 添加 "bot" 到 MODULES

**CLI:**
- `packages/cli/src/index.ts` - 添加 `pionex-trade-cli` 命令路由

**MCP:**
- `packages/mcp/src/server.ts` - 确保所有工具正确注册

**文档:**
- `README.md` - 添加 CLI 命令示例
- `CONTRIBUTING.md` - 更新开发和发布流程
- `specs/docs/TOOLS.md` - 补充完整工具列表

---

## 测试策略

### 单元测试

- [ ] `parseArgs()` 参数解析正确性
- [ ] `buildTools()` 模块和 readOnly 过滤逻辑
- [ ] `toToolErrorPayload()` 错误格式转换
- [ ] `loadConfig()` 配置优先级

### 集成测试

- [ ] `pionex-trade-cli market depth BTC_USDT` 返回数据
- [ ] `pionex-trade-mcp --modules market` + MCP 调用
- [ ] `--dry-run` 模式不调用真实 API

### E2E 测试

- [ ] 完整安装流程：install → onboard → setup → 工具调用
- [ ] Skills 安装和识别
- [ ] 风控流程在对话中复现

---

## 实施步骤建议

1. **Phase 1**: 完善 core 工具（补充缺失工具）
2. **Phase 2**: 实现 CLI 命令路由和参数解析
3. **Phase 3**: 实现 dry-run 逻辑
4. **Phase 4**: 创建 Skills 仓库和 3 个 SKILL.md
5. **Phase 5**: 更新文档和示例
6. **Phase 6**: 测试和发布

---

## 技术决策记录

### 决策 1：CLI 与 MCP 共享 core

**背景**: 需要在 CLI 和 MCP 两个入口提供相同功能
**方案**: 创建 `@pionex-ai/core` 私有包，CLI 和 MCP 打包时 bundle 进去
**理由**: 避免重复实现，确保行为一致
**权衡**: 增加构建复杂度，但提升可维护性

### 决策 2：Skills 仅为文档

**背景**: 需要为 AI 提供交易流程指导
**方案**: Skills 只包含 SKILL.md 文档，不包含可执行代码
**理由**: 简化维护，避免与 CLI/MCP 版本不一致
**权衡**: AI 需要理解文档并正确调用 CLI

### 决策 3：手写参数解析

**背景**: CLI 需要解析命令行参数
**方案**: 手写简单的参数解析器，不引入 commander 等库
**理由**: 保持零依赖目标，参数简单够用
**权衡**: 不支持复杂参数（如数组、嵌套对象），但当前需求不需要

---

## 参考资料

- Pionex API 文档: https://pionex-doc.gitbook.io/api-zh-hans/
- MCP SDK 文档: https://github.com/modelcontextprotocol/sdk
- Claude Code Skills 规范: Claude Code 官方文档
