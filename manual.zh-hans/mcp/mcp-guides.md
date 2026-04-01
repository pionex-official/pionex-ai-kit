# MCP 指南

### 概述

`@pionex/pionex-trade-mcp` 是一个 MCP（Model Context Protocol）Server，它将 Pionex 交易所功能以标准化工具的形式暴露给 AI 客户端。支持市场数据查询、账户余额查询、订单管理和合约网格机器人操作。

#### 设计原则

* **本地优先**：MCP Server 作为本地进程运行。API 密钥存储在环境变量或 `~/.pionex/config.toml` 中，永远不会出现在聊天记录中。
* **MCP 原生**：兼容任何符合 MCP 标准的客户端。
* **凭证安全**：客户端配置仅存储服务器启动命令——不会在其中写入 API 密钥。

### 安装

```bash
npm install -g @pionex/pionex-ai-kit
```

你可以选择：

* 依赖 `npx @pionex/pionex-trade-mcp` 在服务器启动时按需获取最新版本
* 手动运行 `npm install -g @pionex/pionex-trade-mcp` 来固定特定的全局版本

### 凭证配置

#### 交互式向导

```bash
pionex-ai-kit onboard
```

向导将提示输入：

* **Pionex API Key**
* **Pionex API Secret**
* **配置文件名称**（默认：`default`）

配置将写入 `~/.pionex/config.toml`。支持多个配置文件——设置 `default_profile` 来选择活动的配置文件。

> 你可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 创建 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

#### 凭证优先级

当 MCP Server 启动时，凭证按以下顺序解析：

1. **环境变量**（最高优先级）：
   * `PIONEX_API_KEY`
   * `PIONEX_API_SECRET`
   * `PIONEX_BASE_URL`
   * 这些可以来自你的 shell（`export ...`）或 MCP 客户端配置（`env` 字段）
2. **`~/.pionex/config.toml`**：仅在相应的环境变量缺失时作为备用

### 注册 MCP Server

#### 自动设置（推荐）

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client-name>
```

**注册后重启你的客户端**。

支持的客户端：

| `--client`                   | 写入的配置文件                                                       |
| ---------------------------- | ------------------------------------------------------------------------- |
| `cursor`                   | `~/.cursor/mcp.json`                                                    |
| `openclaw`                 | `~/.openclaw/workspace/config/mcporter.json`                            |
| `claude-desktop`           | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
| `claude-code` / `claude` | 不写入文件；运行 `claude mcp add` 命令                          |
| `windsurf`                 | `~/.codeium/windsurf/mcp_config.json`                                   |
| `vscode`                   | 当前项目目录中的 `.mcp.json`                            |

#### 手动设置

如果你不想使用 `setup` 命令，可以手动向客户端配置添加服务器条目。

**Cursor**（`~/.cursor/mcp.json`）：

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

**Claude Desktop**、**VS Code** 和其他客户端使用相同格式——只需保持 `"command"` 和 `"args"` 一致。凭证从 `~/.pionex/config.toml` 读取，因此**不需要在配置中放置** API 密钥。

### 工具参考

* [交易工具](mcp-guides-trade.md) — 市场数据、账户余额和现货订单操作
* [机器人工具](mcp-guides-bot.md) — 合约网格机器人创建、管理和取消
* [双币理财工具](mcp-guides-earn.md) — 双币理财：查询产品、申购、撤单、收益提取

### 示例提示

#### 市场查询（无需 API Key）

* "使用 Pionex 工具显示 BTC_USDT 的订单簿深度。"
* "使用 Pionex 工具获取 ETH_USDT 的最近 10 笔交易。"
* "获取 BTC_USDT 和 ADA_USDT 的交易对信息。"

#### 账户和订单操作（需要 API Key）

* "使用 Pionex 工具列出我的现货余额。"
* "使用 Pionex 工具在 BTC_USDT 上以 30000 USDT 的价格下限价买单，数量为 0.01 BTC。"
* "使用 Pionex 工具获取订单 `<orderId>` 在 BTC_USDT 上的状态。"
* "使用 Pionex 工具取消 BTC_USDT 的订单 `<orderId>`。"

#### 机器人操作（需要 API Key）

* "使用 Pionex 工具为 BTC_USDT 创建一个做多合约网格机器人，价格区间 60000–80000，50 个网格，5 倍杠杆，投资 1000 USDT。"
* "使用 Pionex 工具获取我的合约网格机器人 `<buOrderId>` 的状态。"
* "使用 Pionex 工具向我的合约网格机器人 `<buOrderId>` 添加 500 USDT 保证金。"
* "使用 Pionex 工具从我的合约网格机器人 `<buOrderId>` 减少 10 个仓位。"
* "使用 Pionex 工具取消我的合约网格机器人 `<buOrderId>`。"

### 安全最佳实践

* **永远不要**将 `~/.pionex/config.toml` 提交到版本控制系统或在聊天中粘贴 API 密钥
* 为代理使用具有最小权限的**专用 API 密钥**
* 在实盘交易之前先用小额测试
* 考虑在你的 Pionex API 设置中启用 IP 白名单
