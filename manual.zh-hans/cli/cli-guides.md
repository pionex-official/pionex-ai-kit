# CLI 指南

### 概述

Pionex AI Kit 提供两个 CLI 命令：

| 命令                 | 用途                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `pionex-ai-kit`    | 配置向导（`onboard`）和 MCP 客户端注册（`setup`）                                          |
| `pionex-trade-cli` | 直接通过命令行访问 Pionex 市场数据、账户余额、现货订单和合约网格机器人                       |

两者都从同一个包安装：

```bash
npm install -g @pionex/pionex-ai-kit
```

---

### pionex-ai-kit

#### onboard — 配置凭证

```bash
pionex-ai-kit onboard
```

交互式向导，提示输入：

* **Pionex API Key**
* **Pionex API Secret**

凭证将写入 `~/.pionex/config.toml` 的默认配置文件。

> 你可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 创建 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

#### setup — 注册 MCP Server

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client <client>
```

为指定的 AI 客户端写入 MCP server 配置，以便它可以启动 `npx @pionex/pionex-trade-mcp`。不会将 API keys 写入客户端配置。

支持的 `--client` 值：

| 客户端                       | 配置文件                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| `cursor`                   | `~/.cursor/mcp.json`                                                    |
| `openclaw`                 | `~/.openclaw/workspace/config/mcporter.json`                            |
| `claude-desktop`           | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` |
| `claude-code` / `claude` | 运行 `claude mcp add`（不写入文件）                                      |
| `windsurf`                 | `~/.codeium/windsurf/mcp_config.json`                                   |
| `vscode`                   | 当前项目目录下的 `.mcp.json`                                            |

#### help

```bash
pionex-ai-kit help
```

---

### pionex-trade-cli

#### 用法

```
pionex-trade-cli <group> <command> [args] [--flags]
```

#### 全局标志

| 标志                 | 描述                                                            |
| -------------------- | --------------------------------------------------------------- |
| `--profile <name>` | 使用 `~/.pionex/config.toml` 中的特定配置文件                 |
| `--base-url <url>` | 覆盖 API 基础 URL                                               |
| `--read-only`      | 禁用写操作（下单/撤单）                                         |
| `--dry-run`        | 打印工具调用的有效负载而不执行（仅限写操作）                    |

#### 凭证优先级

1. **环境变量**（最高）：`PIONEX_API_KEY`、`PIONEX_API_SECRET`、`PIONEX_BASE_URL`
2. **`~/.pionex/config.toml`**：当未设置环境变量时回退

---

### 命令

* [交易命令](cli-guides-trade.md) — 市场数据、账户余额和现货订单操作
* [机器人命令](cli-guides-bot.md) — 合约网格机器人创建、管理和取消
* [双币理财命令](cli-guides-earn.md) — 双币理财：查询产品、申购、撤单、收益提取

---

### 输出格式

所有命令将 JSON 输出到标准输出。错误以 JSON 格式写入标准错误，包含错误负载。

**输出示例：**

```bash
$ pionex-trade-cli market tickers --symbol BTC_USDT
{
  "tickers": [
    {
      "symbol": "BTC_USDT",
      "open": "67000.00",
      "close": "67500.00",
      "high": "68000.00",
      "low": "66500.00",
      "volume": "1234.56"
    }
  ]
}
```

### 安全最佳实践

* **绝不**将 `~/.pionex/config.toml` 提交到版本控制或在聊天中粘贴 API keys
* 使用具有最小权限的**专用 API key**
* 使用 `--dry-run` 在执行前预览订单
* 仅需要数据时使用 `--read-only` 禁用所有写操作
* 在上线前使用小额交易测试
* 考虑在 Pionex API 设置中启用 IP 白名单
