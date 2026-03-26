# 技术设计概览

本文档描述 Pionex AI Kit 的详细技术设计，包括关键模块、接口和代码组织。

## 最后更新

**日期：** 2026-03-26

## 核心模块设计

### 1. REST 客户端 (`packages/core/src/client/rest-client.ts`)

#### PionexRestClient 类

**职责：** 封装 Pionex REST API 调用，处理签名认证

**关键方法：**

```typescript
class PionexRestClient {
  constructor(config: { apiKey: string; secretKey: string; baseUrl: string })

  // 公开端点（无需认证）
  async publicGet(path: string, query?: QueryParams): Promise<RequestResult>

  // 私有端点（需认证 + 签名）
  async privatePost(path: string, params?: Record<string, unknown>): Promise<RequestResult>
}
```

**签名逻辑：**
1. 生成 13 位时间戳（毫秒）
2. 拼接：`${timestamp}${method}${path}${bodyString}`
3. HMAC-SHA256 签名，使用 `secret_key`
4. 添加 headers：`PIONEX-KEY`, `PIONEX-SIGNATURE`, `PIONEX-TIMESTAMP`

**错误处理：**
- HTTP 非 2xx → 抛出 `PionexApiError`
- 解析失败 → 抛出通用 Error
- 工具层捕获后转为 MCP `CallToolResult` 的 `isError` 格式

### 2. 工具系统 (`packages/core/src/tools/`)

#### ToolSpec 接口

**定义：** `packages/core/src/tools/types.ts`

```typescript
interface ToolSpec {
  name: string              // 工具名称，如 "pionex_market_get_depth"
  module: ModuleId          // 所属模块：market | account | orders | bot
  isWrite: boolean          // 是否为写操作
  description: string       // 工具描述（供 Agent 理解用途）
  inputSchema: object       // JSON Schema（输入参数）
  handler: ToolHandler      // 异步处理函数
}

type ToolHandler = (
  args: ToolArgs,
  context: ToolContext
) => Promise<unknown>

interface ToolContext {
  client: PionexRestClient
  config: PionexConfig
}
```

#### 工具注册

**文件结构：**
```
packages/core/src/tools/
  index.ts              → 注册表和构建器
  types.ts              → 类型定义
  market.ts             → Market 模块工具
  account.ts            → Account 模块工具
  orders.ts             → Orders 模块工具
  bot.ts                → Bot 模块工具
```

**注册流程：**
1. 每个模块文件导出 `register*Tools()` 函数，返回 `ToolSpec[]`
2. `tools/index.ts` 的 `allToolSpecs()` 合并所有模块
3. `buildTools(config)` 根据配置过滤可用工具：
   - 模块启用状态（`config.modules`）
   - 只读模式（`config.readOnly`）过滤 `isWrite: true` 工具

#### MCP 转换

**转换器：** `toMcpTool()` in `packages/core/src/tools/types.ts`

**映射：**
- `ToolSpec.name` → MCP `Tool.name`
- `ToolSpec.description` → MCP `Tool.description`
- `ToolSpec.inputSchema` → MCP `Tool.inputSchema`
- 添加 MCP `annotations`：`readOnlyHint`, `destructiveHint`, `idempotentHint`

### 3. 配置管理

#### TOML 配置 (`packages/core/src/config/toml.ts`)

**文件位置：** `~/.pionex/config.toml`

**结构：**
```toml
default_profile = "pionx-prod"

[profiles.pionx-prod]
api_key = "YOUR_API_KEY"
secret_key = "YOUR_SECRET_KEY"
base_url = "https://api.pionex.com"
```

**类型定义：**
```typescript
interface PionexProfile {
  api_key: string
  secret_key: string
  base_url: string
}

interface PionexTomlConfig {
  default_profile?: string
  profiles: Record<string, PionexProfile>
}
```

**API：**
- `readFullConfig()` → 读取完整 TOML
- `writeFullConfig(config)` → 写入完整 TOML
- `readTomlProfile(profileName?)` → 读取指定 profile（或 default）

#### 运行时配置 (`packages/core/src/config.ts`)

**类型：**
```typescript
interface PionexConfig {
  apiKey?: string           // 从 env 或 TOML
  secretKey?: string        // 从 env 或 TOML
  baseUrl: string           // 默认 https://api.pionex.com
  hasAuth: boolean          // 是否有完整凭证
  readOnly: boolean         // 是否只读模式（CLI --dry-run）
  modules: ModuleId[]       // 启用的模块列表
}
```

**加载优先级（`loadConfig()`）：**
1. `PIONEX_API_KEY` env → `apiKey`
2. `PIONEX_API_SECRET` env → `secretKey`
3. `PIONEX_BASE_URL` env → `baseUrl`
4. 如 env 缺失，回退到 TOML profile
5. `hasAuth = !!(apiKey && secretKey)`

### 4. MCP 服务器 (`packages/mcp/src/server.ts`)

#### 服务器初始化

**流程：**
```typescript
export function createMcpServer(config: PionexConfig): Server {
  const server = new Server({
    name: "pionex-trade-mcp",
    version: resolveServerVersion()
  }, { capabilities: { tools: {} } })

  const client = new PionexRestClient(...)
  const tools = buildTools(config)

  // 注册 MCP handlers
  server.setRequestHandler(ListToolsRequestSchema, ...)
  server.setRequestHandler(CallToolRequestSchema, ...)

  return server
}
```

**工具列表 Handler：**
- 返回 `tools.map(toMcpTool)` + `system_get_capabilities` 工具

**工具调用 Handler：**
```typescript
async (request) => {
  const { name, arguments: args } = request.params
  const tool = tools.find(t => t.name === name)

  try {
    const data = await tool.handler(args, { client, config })
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] }
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: errorMessage }] }
  }
}
```

#### 系统能力工具

**工具名：** `system_get_capabilities`
**用途：** 返回服务器状态和模块可用性，供 Agent 决策

**返回结构：**
```typescript
interface CapabilitySnapshot {
  readOnly: boolean
  hasAuth: boolean
  moduleAvailability: Record<ModuleId, {
    status: "enabled" | "disabled" | "requires_auth"
    reasonCode?: string
  }>
}
```

### 5. CLI (`packages/cli/src/index.ts`)

#### 命令路由

**入口：** `#!/usr/bin/env node`

**命令：**
- `onboard` → `cmdOnboard()` → 交互式配置向导
- `setup` → `cmdSetup(argv)` → 调用 `runSetup()` from core
- `help` → `printHelp()`
- 交易命令（market, orders, bot） → `cmdTrade(argv)`

#### onboard 命令

**流程：**
1. 提示用户输入 API Key 和 Secret
2. 读取或创建 `~/.pionex/config.toml`
3. 写入 profile（名称 `pionx-prod`）
4. 设置为 `default_profile`
5. 输出下一步操作提示（运行 `setup`）

#### setup 命令

**参数：** `--mcp=pionex-trade-mcp --client <client>`

**实现：** 调用 `runSetup()` from `packages/core/src/setup.ts`

**支持的客户端：**
| Client | 配置文件路径 |
|--------|--------------|
| cursor | `~/.cursor/mcp.json` |
| claude-desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| claude-code | 调用 `claude mcp add` 命令 |
| windsurf | `~/.codeium/windsurf/mcp_config.json` |
| vscode | `.mcp.json`（项目级） |
| openclaw | `~/.openclaw/workspace/config/mcporter.json` |

**写入内容（以 cursor 为例）：**
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

#### 交易命令

**格式：** `pionex-trade-cli <module> <command> [options]`

**实现：**
1. 解析命令行参数（`--symbol`, `--limit`, `--dry-run` 等）
2. 加载配置 → `loadConfig()`
3. 创建 `PionexRestClient`
4. 调用 `createToolRunner()` → `runner(toolName, args)`
5. 输出 JSON 结果或格式化表格

### 6. JSON Schema 验证 (`packages/core/src/schemas/`)

#### 合约网格参数验证

**文件：** `futures-grid-create.ts`

**用途：** 验证 `futures_grid_create` 工具的 `buOrderDataJson` 参数

**Schema 定义：**
```typescript
const ORDER_DATA_SCHEMA = {
  type: "object",
  properties: {
    top: { type: "string", description: "上限价格" },
    bottom: { type: "string", description: "下限价格" },
    row: { type: "integer", description: "网格数量" },
    grid_type: { enum: ["arithmetic", "geometric"] },
    trend: { enum: ["long", "short", "neutral"] },
    leverage: { type: "integer", minimum: 1, maximum: 125 },
    quoteInvestment: { type: "string", description: "报价币投资额" }
  },
  required: ["top", "bottom", "row", "grid_type", "trend"]
}
```

**验证函数：**
```typescript
parseAndValidateCreateFuturesGridBuOrderData(json: string): object
```

**错误处理：**
- JSON 解析失败 → 抛出错误
- Schema 验证失败 → 抛出详细错误消息
- CLI 使用 `--dry-run` 可测试参数正确性

## 数据流

### MCP 工具调用流程

```
AI Client (Cursor)
  │
  ├─ MCP: ListTools
  │   └→ MCP Server → buildTools(config) → [ToolSpec...]
  │       └→ map(toMcpTool) → [MCP Tool...]
  │           └→ return to Client
  │
  └─ MCP: CallTool("pionex_market_get_depth", {symbol: "BTC_USDT"})
      └→ MCP Server
          └→ find ToolSpec by name
              └→ tool.handler(args, {client, config})
                  └→ client.publicGet("/api/v1/market/depth", {symbol})
                      └→ fetch Pionex API
                          └→ return response.data
                              └→ wrap in MCP CallToolResult
                                  └→ return to Client
```

### CLI 交易命令流程

```
$ pionex-trade-cli market depth BTC_USDT --limit 5
  │
  └→ CLI entry (packages/cli/src/index.ts)
      └→ cmdTrade(argv)
          └→ loadConfig() → PionexConfig
              └→ new PionexRestClient(config)
                  └→ createToolRunner(client, config)
                      └→ runner("pionex_market_get_depth", {symbol, limit})
                          └→ find tool in registry
                              └→ tool.handler(args, context)
                                  └→ [同上 MCP 流程]
                                      └→ format + print to stdout
```

## 关键文件索引

| 功能 | 文件路径 |
|------|----------|
| REST 客户端 | `packages/core/src/client/rest-client.ts` |
| 工具注册表 | `packages/core/src/tools/index.ts` |
| Market 工具 | `packages/core/src/tools/market.ts` |
| Bot 工具 | `packages/core/src/tools/bot.ts` |
| TOML 配置 | `packages/core/src/config/toml.ts` |
| 运行时配置 | `packages/core/src/config.ts` |
| MCP 服务器 | `packages/mcp/src/server.ts` |
| MCP 入口 | `packages/mcp/src/index.ts` |
| CLI 入口 | `packages/cli/src/index.ts` |
| Setup 逻辑 | `packages/core/src/setup.ts` |
| Schema 验证 | `packages/core/src/schemas/futures-grid-create.ts` |

## 设计原则

1. **单一职责**：每个模块文件只负责一个功能域
2. **依赖倒置**：Core 不依赖 MCP SDK 或 CLI 框架
3. **配置优先**：所有行为可通过 `PionexConfig` 配置
4. **类型安全**：所有接口使用 TypeScript 类型
5. **错误透明**：API 错误直接暴露给调用方（不吞错）
6. **最小依赖**：生产依赖限制在必需项

## 扩展点

### 添加新工具
1. 在 `packages/core/src/tools/<module>.ts` 添加 `ToolSpec`
2. 实现 `handler` 函数调用 `client.publicGet` 或 `client.privatePost`
3. 运行 `npm run build`
4. 测试：CLI 或重启 MCP 服务器

### 添加新模块
1. 在 `packages/core/src/constants.ts` 的 `MODULES` 添加新模块 ID
2. 创建 `packages/core/src/tools/<new-module>.ts`
3. 在 `packages/core/src/tools/index.ts` 导入并注册
4. 更新文档（本文档 + README.md）

### 自定义签名逻辑
修改 `packages/core/src/client/rest-client.ts` 的 `privatePost()` 方法，保持接口不变。
