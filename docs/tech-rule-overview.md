# 技术规范

本文档定义 Pionex AI Kit 项目的代码规范、测试规范和开发流程。

## 最后更新

**日期：** 2026-03-26

## 代码规范

### 1. TypeScript 规范

#### 类型安全

**强制要求：**
- 所有公开 API 必须有显式类型注解
- 禁止使用 `any`，如确需动态类型使用 `unknown`
- 接口优先于 type alias（除非需要联合类型）

**示例：**
```typescript
// ✅ Good
interface ToolSpec {
  name: string
  handler: (args: ToolArgs, ctx: ToolContext) => Promise<unknown>
}

// ❌ Bad
function register(tool: any) { ... }
```

#### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 类 | PascalCase | `PionexRestClient` |
| 接口/类型 | PascalCase | `ToolSpec`, `PionexConfig` |
| 函数/变量 | camelCase | `buildTools`, `apiKey` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_BASE_URL`, `MODULES` |
| 文件 | kebab-case | `rest-client.ts`, `futures-grid-create.ts` |
| MCP 工具名 | snake_case | `pionex_market_get_depth` |

#### 模块导入

**规则：**
- ESM 导入必须包含 `.js` 后缀（即使源码是 `.ts`）
- 导入顺序：Node 内置 → 外部依赖 → 本地模块

**示例：**
```typescript
import { readFileSync } from "node:fs"              // Node 内置
import { Server } from "@modelcontextprotocol/sdk"  // 外部依赖
import { buildTools } from "./tools/index.js"       // 本地模块
```

### 2. 错误处理

#### 错误类型

**自定义错误类：**
```typescript
class PionexApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  )
}

class ConfigError extends Error {
  constructor(message: string)
}
```

**使用场景：**
- API 调用失败 → `PionexApiError`
- 配置文件缺失/格式错误 → `ConfigError`
- 参数验证失败 → `Error` (包含详细消息)

#### 错误传播

**原则：** 在合适的层级捕获，不吞错

**MCP Server：** 捕获所有错误，转换为 `CallToolResult` 的 `isError` 格式
```typescript
try {
  const data = await tool.handler(args, context)
  return { content: [{ type: "text", text: JSON.stringify(data) }] }
} catch (error) {
  return {
    isError: true,
    content: [{ type: "text", text: error.message }]
  }
}
```

**CLI：** 捕获顶层错误，输出到 stderr，退出码 1
```typescript
try {
  await cmdTrade(argv)
} catch (error) {
  process.stderr.write(`Error: ${error.message}\n`)
  process.exit(1)
}
```

**Core：** 不捕获错误，让调用方决定处理方式

### 3. 异步代码

**强制使用 async/await**
- 禁止裸露的 Promise chain（`.then().catch()`）
- 异常处理统一使用 `try/catch`

**示例：**
```typescript
// ✅ Good
async function fetchData() {
  try {
    const response = await client.publicGet("/api/v1/market/depth")
    return response.data
  } catch (error) {
    throw new PionexApiError(...)
  }
}

// ❌ Bad
function fetchData() {
  return client.publicGet("/api/v1/market/depth")
    .then(r => r.data)
    .catch(e => console.error(e))
}
```

### 4. 安全规范

#### 凭证处理

**禁止事项：**
- ❌ 在日志中打印 API key 或 secret
- ❌ 在错误消息中包含完整的认证 header
- ❌ 将凭证写入 MCP 客户端配置文件

**允许事项：**
- ✅ 在 `~/.pionex/config.toml` 存储凭证（用户主目录）
- ✅ 从环境变量读取凭证
- ✅ 在错误消息中提示"签名无效"（不暴露签名值）

#### API 请求

**签名逻辑必须：**
- 使用标准 HMAC-SHA256 算法
- 时间戳精度为 13 位毫秒
- Body 使用 `JSON.stringify()`（无额外空格）

**实现位置：** `packages/core/src/client/rest-client.ts`

### 5. 文档注释

**要求：**
- 所有公开 API（导出的函数/类/接口）必须有 JSDoc 注释
- 工具的 `description` 字段需清晰说明用途和参数

**示例：**
```typescript
/**
 * Create a function that can call any registered tool by name.
 *
 * @param client - REST client instance
 * @param config - Runtime configuration
 * @returns A function that executes tools by name
 */
export function createToolRunner(
  client: PionexRestClient,
  config: PionexConfig
): ToolRunner { ... }
```

## 测试规范

### 当前状态

**⚠️ 项目暂无自动化测试**

### 计划测试策略

#### 单元测试

**工具：** Vitest（推荐，与 tsup 生态一致）

**覆盖范围：**
- 签名算法（`PionexRestClient.privatePost`）
- 工具注册逻辑（`buildTools` 过滤规则）
- TOML 配置读写（`readFullConfig`, `writeFullConfig`）
- JSON Schema 验证（`parseAndValidateCreateFuturesGridBuOrderData`）

**Mock 策略：**
- Mock `fetch` 或整个 `PionexRestClient`
- 不依赖真实 API（避免限流、凭证问题）

#### 集成测试

**覆盖范围：**
- MCP 服务器启动和工具调用流程
- CLI 命令解析和工具执行
- 配置文件读写（临时目录）

**环境：**
- 使用测试凭证（或 Mock API 响应）
- 隔离真实配置文件（`~/.pionex/config.toml`）

#### 手动测试

**每次发布前检查：**
1. 安装测试：`npm install -g @pionex/pionex-ai-kit`
2. Onboard 流程：`pionex-ai-kit onboard`
3. Setup 流程：`pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor`
4. MCP 工具调用（在 Cursor 中测试至少一个工具）
5. CLI 命令：`pionex-trade-cli market depth BTC_USDT`

## 开发流程

### 1. 分支管理

**主分支：** `main`
- 生产就绪代码，每次合并对应一个发布

**功能分支：** `feature/<description>`
- 从 `main` 创建，完成后合并回 `main`

**紧急修复：** `hotfix/<issue>`
- 从 `main` 创建，修复后直接合并

### 2. Commit 规范

**格式：** `<type>: <description>`

**类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 代码重构（不改变行为）
- `chore`: 构建/工具配置变更

**示例：**
```
feat: add pionex_orders_get_fills_by_order_id tool
fix: correct signature algorithm for POST requests
docs: update README with new MCP client support
```

### 3. 发布流程

**步骤：**
1. 更新版本号（`packages/cli/package.json` 和 `packages/mcp/package.json`）
2. 更新 `CHANGELOG.md`（如有）
3. 运行 `npm run build` 确保构建成功
4. 发布 CLI：`cd packages/cli && npm publish --access public`
5. 发布 MCP：`cd packages/mcp && npm publish --access public`
6. 创建 Git tag：`git tag v0.2.35 && git push origin v0.2.35`
7. 测试：`npx @pionex/pionex-trade-mcp --help`

**版本号约定：**
- `0.x.y`：API 可能不稳定
- `1.x.y`：稳定版本，遵循 Semver
- 两个包版本号保持同步（简化用户理解）

### 4. 代码审查

**关注点：**
- 是否引入新的依赖？是否必要？
- 错误处理是否完整？
- 是否遵循命名和代码风格规范？
- 是否更新相关文档（README, TOOLS.md）？

**自审清单：**
- [ ] 运行 `npm run build` 成功
- [ ] 手动测试新功能（CLI 或 MCP）
- [ ] 检查 git diff 无调试代码
- [ ] 更新文档（如有 API 变更）

## 工具规范

### 添加新工具

**步骤：**
1. 在 `packages/core/src/tools/<module>.ts` 添加 `ToolSpec`
2. 定义 `inputSchema`（JSON Schema）
3. 实现 `handler` 函数
4. 导出到 `register*Tools()` 数组
5. 运行 `npm run build`
6. 更新 `specs/docs/TOOLS.md`

**工具命名：**
- 格式：`pionex_<module>_<action>_<resource>`
- 动词：`get`, `create`, `cancel`, `update`
- 保持一致性（参考现有工具）

**Description 编写：**
- 第一句说明用途（"Get order book depth..."）
- 第二句说明使用场景（"Use for spread, liquidity, or best bid/ask."）
- 简洁明了，避免技术术语（AI 需要理解）

**Input Schema：**
- 必填字段放在 `required` 数组
- 每个字段提供 `description`
- 使用标准 JSON Schema 类型（`string`, `integer`, `boolean`）

### 修改现有工具

**向后兼容原则：**
- 不要删除现有参数（标记为 deprecated）
- 新增参数必须是可选的（有默认值）
- 如需破坏性变更，增加新工具（如 `pionex_market_get_depth_v2`）

### 工具测试

**手动测试：**
1. CLI 测试：`pionex-trade-cli <module> <command> [options]`
2. MCP 测试：在 AI 客户端中调用
3. 错误情况测试：
   - 缺少必填参数
   - 参数类型错误
   - API 返回错误（如无效 symbol）

## 依赖管理

### 添加依赖

**评估标准：**
1. 是否真的需要？能否手写实现？
2. 包大小如何？（查看 bundlephobia.com）
3. 维护状态如何？（最近更新时间、GitHub stars）
4. 是否有安全漏洞？（`npm audit`）

**决策树：**
- 功能简单（<100 行） → 手写
- 工具库（lodash, dayjs） → 考虑替代（date-fns-tiny）
- 核心依赖（MCP SDK, TypeScript） → 接受

### 更新依赖

**频率：** 每月检查一次（或有安全漏洞时立即）

**命令：**
```bash
npm outdated                    # 查看过期依赖
npm update                      # 更新 minor/patch 版本
npm install <pkg>@latest       # 更新 major 版本
```

**测试：** 更新后运行 `npm run build` 和手动测试

## 性能规范

### REST 客户端

**原则：** 无连接池，每次请求独立
- **理由：** MCP 服务器短生命周期，无需优化连接复用
- **如需优化：** 考虑 HTTP/2 或引入连接池库

### 构建产物

**目标：** 最小化包体积
- 使用 tsup tree-shaking（自动移除未使用代码）
- 避免引入大型依赖（如 axios → 使用 fetch）

**当前大小：**
- `@pionex/pionex-ai-kit`: ~50KB (dist/)
- `@pionex/pionex-trade-mcp`: ~60KB (dist/)

## 兼容性

### Node.js 版本

**最低要求：** Node.js 18
- **理由：** 使用原生 `fetch` API
- **测试：** 每次发布前在 Node 18/20/22 测试

### MCP 客户端

**支持列表：**
- Cursor
- Claude Desktop
- Claude Code
- Windsurf
- VS Code
- OpenClaw

**测试策略：** 每次添加新客户端时在实际环境测试 setup 和工具调用

## 文档规范

### README.md

**必须包含：**
- 项目简介（一句话说明用途）
- 快速开始（安装、配置、使用）
- 功能列表（工具模块）
- 示例（截图或代码）

**更新时机：** 添加新功能或改变安装流程时

### CONTRIBUTING.md

**必须包含：**
- 开发环境搭建
- 构建命令
- 发布流程

### specs/docs/TOOLS.md

**必须包含：**
- 所有工具的列表和描述
- 示例 prompt（如何让 AI 调用工具）

**更新时机：** 每次添加或修改工具时

## 规范演进

### 提出新规范

**流程：**
1. 在迭代文档中记录问题和提议
2. 团队讨论达成共识
3. 更新本文档
4. 在新代码中执行

### 规范例外

**原则：** 规范服务于代码质量，不是教条
- 如有充分理由，可以违反规范（在代码注释中说明）
- 持续违反的规范需要修订（可能规范不合理）
