# MCP 快速入门

Pionex Trade MCP Server 让 AI 客户端（Cursor、Claude Desktop、VS Code 等）可以直接调用 Pionex 交易所功能，进行市场数据查询、账户查询和订单管理。

### 前置要求

* Node.js >= 18

### 安装

#### 1. 安装 CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

#### 2. 配置 API 凭证

运行交互式向导并输入你的 Pionex API Key 和 Secret：

```bash
pionex-ai-kit onboard
```

凭证将保存到 `~/.pionex/config.toml`，支持多个配置文件。

> 你可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 创建 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> 如果你只需要市场数据（不需要交易或余额查询），可以跳过此步骤。

#### 3. 在你的 AI 客户端中注册 MCP Server

选择你正在使用的客户端并运行相应的命令：

```bash
# Cursor
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor

# Claude Desktop
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop

# Claude Code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code

# VS Code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode

# Windsurf
pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf

# OpenClaw
pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw
```

#### 4. 重启你的客户端

设置完成后，**重启你的 AI 客户端**以使 MCP Server 生效。

### 升级

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### 验证安装

在你的 AI 客户端中输入以下提示：

> "使用 Pionex 工具显示 BTC_USDT 的订单簿深度。"

如果代理成功返回 BTC_USDT 订单簿，则 MCP 安装正确。

### 下一步

* 查看 [MCP 用户指南](mcp-guides.md) 了解完整功能和详细配置
