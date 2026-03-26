# 技术记忆与知识

本文档记录 Pionex AI Kit 开发过程中的重要决策、经验教训和技术知识。

## 最后更新

**日期：** 2026-03-26

## 项目初始化（2026-03 之前）

### 初始架构决策

**决策：Monorepo 结构**
- **背景：** 需要发布两个独立的 npm 包（CLI 和 MCP），同时共享核心代码
- **方案：** 使用 pnpm workspace 管理三个包（cli, mcp, core）
- **原因：** 避免循环依赖，简化本地开发，core 作为私有包避免额外维护成本
- **结果：** 架构清晰，构建流程简单

**决策：最小化依赖**
- **背景：** MCP 服务器通过 `npx` 启动，安装速度影响用户体验
- **方案：** 生产依赖仅包含 `@modelcontextprotocol/sdk` 和 `smol-toml`
- **原因：** 减少安装时间，降低供应链风险
- **结果：** 总依赖小于 5MB，安装速度快

**决策：凭证存储在 TOML 文件**
- **背景：** 需要持久化 API 密钥，避免每次输入
- **方案：** 使用 `~/.pionex/config.toml`，支持多 profile
- **原因：** 文本格式易于手动编辑，TOML 人类可读，避免 JSON 转义问题
- **结果：** 用户体验良好，支持多账户场景

### 工具系统设计

**决策：模块化工具注册**
- **背景：** 需要支持不同权限级别的工具（公开 vs 认证）
- **方案：** 按功能域分模块（market, account, orders, bot），每个工具标记 `module` 和 `isWrite`
- **原因：** 便于按需加载，支持只读模式，模块可独立开关
- **实现：** `buildTools(config)` 根据配置过滤工具
- **结果：** 灵活的权限控制，易于扩展

**决策：ToolSpec 作为统一接口**
- **背景：** CLI 和 MCP 都需要调用相同的 API 工具
- **方案：** 定义 `ToolSpec` 接口，包含 handler、inputSchema、description
- **原因：** 避免重复实现，保证行为一致
- **实现：** MCP 通过 `toMcpTool()` 转换，CLI 通过 `createToolRunner()` 调用
- **结果：** 代码复用率高，维护成本低

## 迭代 1：CLI & Skills 支持（2026-03-18）

**迭代目录：** `specs/iterations/20260318_cli_skills/`

### 关键变更

1. **添加 CLI 子命令支持**
   - **问题：** 原 CLI 仅支持 onboard 和 setup，无法直接执行交易命令
   - **方案：** 添加 `pionex-trade-cli` 别名，支持 `market`, `orders`, `bot` 子命令
   - **实现：** 复用 `createToolRunner()` from core，解析命令行参数映射到工具调用
   - **学习：** 命令行参数解析手写比引入 `commander` 库更轻量（零依赖目标）

2. **合约网格 Bot 工具**
   - **问题：** `buOrderDataJson` 参数复杂，易出错
   - **方案：** 引入 JSON Schema 验证（`packages/core/src/schemas/futures-grid-create.ts`）
   - **实现：** `parseAndValidateCreateFuturesGridBuOrderData()` 在调用 API 前验证
   - **学习：** 错误消息需要明确指出缺失字段和类型错误，提升调试体验

3. **Dry-run 模式**
   - **问题：** 写操作（下单、创建 Bot）需要测试但不真实执行
   - **方案：** 添加 `--dry-run` 标志，在 `config.readOnly` 时跳过 API 调用
   - **实现：** CLI 参数解析 → 传递到 `loadConfig()` → 影响 `buildTools()` 过滤
   - **学习：** 实际未完全实现（工具仍会调用 API），需要在工具 handler 内部增加 dry-run 逻辑

### 技术债务

**未实现的 Dry-run 逻辑**
- **现状：** `--dry-run` 标志会过滤掉 `isWrite: true` 的工具，但没有真正的"模拟执行"
- **影响：** 用户无法预览写操作的参数是否正确
- **待改进：** 在工具 handler 内检查 `config.readOnly`，返回模拟结果而非调用 API

**命令行参数解析**
- **现状：** 手写解析逻辑，支持 `--key=value` 和 `--key value` 两种格式
- **影响：** 代码冗长，难以支持复杂参数（如数组、嵌套对象）
- **待改进：** 如需复杂参数，考虑引入轻量 CLI 框架（如 `mri` ~500B）

## 迭代 2：Fills by Order ID & Book Tickers（最近更新）

**Commit：** `cfd18cc` (2026-03-26 前)

### 关键变更

1. **添加 `pionex_orders_get_fills_by_order_id` 工具**
   - **需求：** 查询指定订单的成交记录（而非全部成交）
   - **实现：** 新增 tool in `packages/core/src/tools/orders.ts`
   - **API：** `GET /api/v1/trade/fills` with `orderId` 参数

2. **添加 `pionex_market_get_book_tickers` 工具**
   - **需求：** 批量获取所有交易对的最优买卖价
   - **实现：** 新增 tool in `packages/core/src/tools/market.ts`
   - **API：** `GET /api/v1/market/bookTickers`

### 学习

**工具命名约定**
- 格式：`pionex_<module>_<action>_<resource>`
- 例：`pionex_orders_get_fills_by_order_id`
- 原因：避免与其他 MCP 服务器命名冲突，保持一致性

## 通用技术知识

### Pionex API 签名机制

**签名算法：**
```
message = timestamp + method + path + body
signature = HMAC-SHA256(message, secret_key)
```

**关键点：**
- `timestamp` 为 13 位毫秒时间戳
- `body` 为 JSON 字符串（无空格）
- `path` 包含 query string（如有）
- Headers: `PIONEX-KEY`, `PIONEX-SIGNATURE`, `PIONEX-TIMESTAMP`

**常见错误：**
- 时间戳错误（客户端时间不同步） → 提示检查系统时间
- Body 格式错误（多余空格、字段顺序） → 使用 `JSON.stringify` 标准化

### MCP 协议集成

**Stdio 通信**
- MCP 服务器通过 stdin/stdout 与客户端通信
- 客户端启动服务器进程，发送 JSON-RPC 请求
- 服务器响应 JSON-RPC 结果

**工具调用流程**
1. 客户端：`ListTools` → 获取可用工具
2. AI 根据描述选择工具
3. 客户端：`CallTool(name, arguments)` → 执行工具
4. 服务器：返回 `CallToolResult` (成功或错误)

**注解（Annotations）**
- `readOnlyHint`: 工具是否只读（影响 AI 决策）
- `destructiveHint`: 工具是否有破坏性操作
- `idempotentHint`: 重复调用是否幂等

**实现位置：** `packages/core/src/tools/types.ts` 的 `toMcpTool()`

### TypeScript 模块系统

**ESM vs CJS**
- 本项目：纯 ESM（`"type": "module"` in package.json）
- 影响：必须使用 `.js` 后缀 import，即使源码是 `.ts`
- 原因：Node.js ESM loader 要求明确扩展名

**tsup 构建**
- 单文件 bundle：`entry: ["src/index.ts"]`, `format: ["esm"]`
- 类型定义：自动生成 `.d.ts` 文件
- Shebang 保留：CLI 需要 `#!/usr/bin/env node`

### pnpm Workspace

**依赖管理**
- Root `package.json` 包含共享 devDependencies
- 子包通过 `"@pionex-ai/core": "*"` 引用本地包
- `pnpm install` 自动 link 本地依赖

**构建顺序**
- 手动控制：`npm run build --workspace=@pionex-ai/core && ...`
- 原因：pnpm 不自动处理构建依赖顺序

## 经验教训

### 1. 发布流程

**问题：** 初期忘记同步更新两个包的版本号
**解决：** 建立检查清单：
1. 更新 `packages/cli/package.json` 版本
2. 更新 `packages/mcp/package.json` 版本
3. 运行 `npm run build`
4. 从各子目录发布 `npm publish`
5. 测试 `npx @pionex/pionex-trade-mcp --help`

### 2. 凭证泄漏风险

**问题：** 用户可能在聊天中粘贴 config.toml 内容求助
**解决：** 在 onboard 命令输出安全提示（中英文）
**额外措施：** 考虑在 MCP 工具描述中强调"不要在聊天中分享 API key"

### 3. 错误消息质量

**问题：** 早期版本 API 错误直接抛出，用户看到原始 HTTP 响应
**解决：** 在 `PionexRestClient` 封装 `PionexApiError`，提取 `result.message`
**改进空间：** 根据错误码提供可操作的修复建议（如 "Invalid signature" → "检查系统时间"）

### 4. MCP 客户端兼容性

**问题：** 不同客户端配置文件格式不同（JSON vs JSONC）
**解决：** `setup.ts` 针对每个客户端单独处理：
- Cursor：纯 JSON
- Claude Desktop：JSONC（支持注释）
- VS Code：项目级 `.mcp.json`

**学习：** 不要假设所有客户端行为一致，实际测试每个客户端

## 待解决问题

### 1. 测试覆盖率

**现状：** 无自动化测试
**影响：** 重构时容易引入 bug，依赖手动测试
**计划：** 添加单元测试（工具 handler、签名逻辑）和集成测试（MCP 调用流程）

### 2. 日志系统

**现状：** 仅在错误时输出到 stderr
**影响：** 调试困难，无法追踪 API 调用历史
**计划：** 添加可选的 debug 日志（环境变量 `DEBUG=pionex:*`）

### 3. 限流处理

**现状：** 无限流检测，用户可能触发 API 限流
**影响：** API 返回 429 错误，用户不知如何应对
**计划：** 检测 429 响应，返回友好提示 + 重试建议

## 参考资源

### 内部文档
- `CONTRIBUTING.md` — 开发和发布流程
- `specs/docs/TOOLS.md` — 工具使用说明（面向用户）
- `specs/iterations/*/PRD.md` — 各迭代需求文档

### 外部资源
- [Pionex API 文档](https://pionex-doc.gitbook.io/api-zh-hans/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [tsup 文档](https://tsup.egoist.dev/)

## 知识沉淀建议

**新增工具时记录：**
1. API 端点和参数说明
2. 常见错误码和处理方式
3. 工具描述的写作原则（如何让 AI 更好理解用途）

**遇到 Bug 时记录：**
1. 问题表现和复现步骤
2. 根本原因分析
3. 修复方案和替代方案
4. 如何避免类似问题（代码规范或检查清单）
