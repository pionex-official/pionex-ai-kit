# 技术架构概览

本文档描述 Pionex AI Kit 的高层架构设计。

## 最后更新

**日期：** 2026-03-26

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                   AI Clients                            │
│  (Cursor, Claude Desktop, Windsurf, VS Code, etc.)     │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol (stdio)
                     ▼
┌─────────────────────────────────────────────────────────┐
│          @pionex/pionex-trade-mcp (MCP Server)          │
│  - 实现 MCP 协议（ListTools, CallTool）                  │
│  - 从 ~/.pionex/config.toml 读取凭证                     │
│  - 将 MCP 调用路由到 core 工具                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              @pionex-ai/core (核心库)                   │
│  - PionexRestClient (REST API 封装)                     │
│  - 工具系统 (market, account, orders, bot)              │
│  - 配置管理 (TOML 读写)                                  │
│  - JSON Schema 验证                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Pionex REST API                        │
│         https://api.pionex.com                          │
└─────────────────────────────────────────────────────────┘

                  并行路径：CLI

┌─────────────────────────────────────────────────────────┐
│         @pionex/pionex-ai-kit (CLI 工具)                │
│  - onboard 命令 → 写入 ~/.pionex/config.toml            │
│  - setup 命令 → 写入 MCP 客户端配置                      │
│  - 交易命令 (pionex-trade-cli) → 使用 core 工具         │
└────────────────────┬────────────────────────────────────┘
                     │
                     └──────→ 使用 @pionex-ai/core
```

## 核心设计决策

### 1. Monorepo 结构

**技术选型：** pnpm workspace + npm workspaces
**理由：**
- 三个包共享相同的构建工具链（tsup, TypeScript）
- `@pionex-ai/core` 是私有包，避免单独发布维护
- 简化本地开发和依赖管理

### 2. 三层架构

#### Layer 1: Core (`@pionex-ai/core`)
**职责：** 业务逻辑、API 客户端、工具定义
**独立性：** 不依赖 MCP SDK 或 CLI 框架

#### Layer 2a: MCP Server (`@pionex/pionex-trade-mcp`)
**职责：** MCP 协议适配器
**依赖：** `@modelcontextprotocol/sdk`, `@pionex-ai/core`

#### Layer 2b: CLI (`@pionex/pionex-ai-kit`)
**职责：** 用户交互、配置管理、直接交易命令
**依赖：** `@pionex-ai/core`

### 3. 凭证管理

**设计原则：** 本地优先，零信任客户端

**实现：**
- API 密钥存储在 `~/.pionex/config.toml`（用户主目录）
- MCP 客户端配置仅包含服务器启动命令（`npx @pionex/pionex-trade-mcp`）
- 凭证读取优先级：环境变量 > TOML 文件
- MCP 服务器在启动时读取凭证，不在进程间传递

**安全边界：**
```
┌────────────────────────────────────────┐
│  用户空间 (~/.pionex/config.toml)      │ ← 凭证存储
└──────────────┬─────────────────────────┘
               │
               ▼ (仅启动时读取)
┌────────────────────────────────────────┐
│  MCP Server 进程 (短生命周期)          │ ← 使用凭证
└──────────────┬─────────────────────────┘
               │
               ▼ (不包含凭证)
┌────────────────────────────────────────┐
│  MCP 客户端配置                        │ ← 安全
└────────────────────────────────────────┘
```

### 4. 模块系统

**设计：** 工具按功能域分组为模块
**模块列表：** market, account, orders, bot

**可配置性：**
- 每个模块可独立启用/禁用（通过配置）
- 无认证时，非 market 模块自动标记为 `requires_auth`
- `system_get_capabilities` 工具暴露模块状态供 Agent 规划

**扩展性：**
- 新增工具：在 `packages/core/src/tools/*.ts` 添加 `ToolSpec`
- 新增模块：创建新文件，在 `MODULES` 常量注册

### 5. 构建系统

**工具：** tsup (基于 esbuild)
**配置：** 各包独立 `tsconfig.json` + `package.json` scripts

**构建顺序：**
```bash
npm run build
  → build core (无依赖)
  → build cli (依赖 core)
  → build mcp (依赖 core)
```

**打包策略：**
- `@pionex-ai/core` 被 bundle 进 cli 和 mcp
- 发布包体积小（只包含 dist/）
- 运行时无需 node_modules（使用 `npx` 时自动下载）

## 技术栈

| 层级 | 技术 | 版本要求 |
|------|------|----------|
| 运行时 | Node.js | ≥18 |
| 语言 | TypeScript | ^5.0 |
| 构建 | tsup | ^8.0 |
| 包管理 | pnpm | (推荐，兼容 npm) |
| 协议 | MCP | SDK ^1.0 |
| 配置格式 | TOML | smol-toml ^1.3 |

## 依赖策略

### 生产依赖最小化原则

**MCP Server：** 仅 `@modelcontextprotocol/sdk`
**CLI：** 零外部依赖（运行时）
**Core：** `smol-toml`（轻量 TOML 解析器）

**理由：**
- 减少供应链风险
- 加快 `npx` 安装速度
- 避免依赖冲突

### 开发依赖共享

所有 devDependencies 在 root `package.json` 声明：
- `@types/node`, `typescript`, `tsup`
- 各包继承，无需重复声明

## 部署模型

### MCP Server
**分发：** npm (`@pionex/pionex-trade-mcp`)
**运行：** `npx @pionex/pionex-trade-mcp`（MCP 客户端通过 stdio 启动）
**生命周期：** 按需启动，AI 客户端关闭时自动退出

### CLI
**分发：** npm (`@pionex/pionex-ai-kit`)
**安装：** `npm install -g @pionex/pionex-ai-kit`
**运行：** 用户直接调用 `pionex-ai-kit` 或 `pionex-trade-cli`

## 可扩展性考虑

### 添加新 API 端点
1. 在 `packages/core/src/client/rest-client.ts` 添加方法（如需新端点类型）
2. 在对应 `packages/core/src/tools/*.ts` 添加 `ToolSpec`
3. 构建、测试、发布

### 添加新 MCP 客户端支持
1. 在 `packages/core/src/setup.ts` 添加客户端类型和配置写入逻辑
2. 更新 `SUPPORTED_CLIENTS` 常量
3. 文档更新（README.md）

### 添加新认证方式
1. 在 `packages/core/src/config.ts` 扩展 `loadConfig()`
2. 在 `PionexRestClient` 添加新签名逻辑
3. 向后兼容现有 TOML 配置

## 非功能性需求

### 性能
- REST 请求无连接池（短生命周期会话）
- 工具调用同步阻塞（MCP 协议限制）

### 安全
- 不在日志中打印 API 密钥或签名
- 错误消息不暴露完整请求参数

### 可维护性
- 工具定义在一处（`packages/core/src/tools/`）
- MCP 和 CLI 复用相同工具定义
- TypeScript 类型安全贯穿全栈
