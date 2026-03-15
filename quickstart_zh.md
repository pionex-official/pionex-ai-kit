# Pionex AI Kit — 快速入门

将 [Pionex](https://www.pionex.com) REST API 通过 MCP（Model Context Protocol）暴露给 Cursor、OpenClaw、Claude Desktop、Windsurf、VS Code 等客户端。凭证统一存放在 **~/.pionex/config.toml**；客户端配置里只保存如何启动 MCP 服务（不写密钥）。

## 功能概览

- **行情数据（公开）**：盘口深度、最近成交、交易对信息等，无需 API Key。
- **账户与订单（需认证）**：在 `~/.pionex/config.toml` 中配置后，可查询余额、下单、查单、撤单。
- **双包流程**：**@pionex/pionex-ai-kit** 负责配置向导；**@pionex/pionex-trade-mcp** 提供 MCP 服务并支持一键写入各客户端配置。

---

## 前置条件

- **Node.js 18+**

  ```bash
  node --version
  ```

- **Pionex 账户**（仅私有/交易类工具需要；公开行情可不配置密钥）。

---

## 获取 Pionex API 密钥

1. 登录 [pionex.com](https://www.pionex.com)
2. 进入 **API 管理** 页面
3. 创建新 API Key，按需勾选权限（仅查余额/订单时可只开只读）
4. 复制 **API Key** 和 **Secret**（Secret 仅显示一次）
5. 可选：开启 IP 白名单提高安全性

---

## 1. 安装

```bash
npm install -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

---

## 2. 配置凭证

运行配置向导（会写入 **~/.pionex/config.toml**）：

```bash
pionex-ai-kit onboard
```

按提示输入：

- **Pionex API Key**
- **Pionex API Secret**
- **Profile 名称**（默认：`default`）

---

## 3. 在客户端中注册 MCP 服务

让 Cursor / Claude Desktop 等客户端能启动 MCP 服务（密钥不会写入客户端配置）：

```bash
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
```

支持的客户端：

| 选项 | 写入的配置文件 |
|------|----------------|
| `--client cursor` | `~/.cursor/mcp.json` |
| `--client claude-desktop` | Claude Desktop 配置（路径因系统而异） |
| `--client windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| `--client vscode` | 当前目录下的 `.mcp.json` |

完成后 **重启 Cursor 或对应客户端**。

---

## 手动配置（不用向导）

若不想用 `pionex-ai-kit onboard`，可手动创建 **~/.pionex/config.toml**：

```toml
default_profile = "default"

[profiles.default]
api_key = "你的-api-key"
secret_key = "你的-api-secret"
base_url = "https://api.pionex.com"
```

若不想用 `pionex-ai-kit setup`，可手动在 MCP 配置里添加服务。服务从 `~/.pionex/config.toml` 读凭证，**无需**在客户端配置里写 `env` 密钥。

**Cursor**（`~/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "pionex-trade-mcp"]
    }
  }
}
```

---

## 环境变量（可选）

运行 MCP 服务时可以用环境变量覆盖 TOML 中的配置。环境变量可以来自：

- 你的 shell（例如 `export PIONEX_API_KEY=...`）  
- MCP 客户端的配置文件（如 Cursor 的 `mcp.json`、Claude Desktop 的 `claude_desktop_config.json` 里 `mcpServers.pionex-trade-mcp.env` 字段）

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `PIONEX_API_KEY` | 否 | — | 私有接口 API Key |
| `PIONEX_API_SECRET` | 否 | — | 签名用 Secret |
| `PIONEX_BASE_URL` | 否 | `https://api.pionex.com` | API 基础地址 |

启动顺序下的优先级：

1. **环境变量**（来自 shell 或 MCP 客户端配置）  
2. **`~/.pionex/config.toml` 中的当前 profile** —— 仅在对应环境变量缺失时才作为兜底

---

## 示例提问

MCP 连接成功后可在对话中尝试：

**行情（无需 API Key）：**

- 「用 Pionex 工具查一下 BTC_USDT 的盘口深度。」
- 「用 Pionex 工具获取 ETH_USDT 最近 10 笔成交。」
- 「获取 BTC_USDT 的 symbol 信息。」

**账户与订单（需 API Key）：**

- 「用 Pionex 工具列出我的现货余额。」
- 「用 Pionex 工具下一个限价买单：BTC_USDT，0.01 BTC，价格 30000 USDT。」
- 「用 Pionex 工具查询 BTC_USDT 订单 &lt;orderId&gt; 的状态。」
- 「用 Pionex 工具撤销 BTC_USDT 订单 &lt;orderId&gt;。」

---

## 与 mcporter（OpenClaw）一起使用

通过 **mcporter** 调用 Pionex 工具时，请用**顶层参数**传递，与工具 schema 一致：

- ✅ 正确示例：

  ```bash
  mcporter call pionex pionex.orders.new_order \
    symbol="ADA_USDT" side="BUY" type="MARKET" amount="5"
  ```

- ❌ 错误示例（把参数包在 `schema` 里可能导致解析问题）：

  ```bash
  mcporter call 'pionex.pionex.orders.new_order(schema:{...})'
  ```

部分工具对 `schema:{...}` 有兼容处理，但新集成建议一律用顶层参数。

---

## 安全提示

- 不要将 API Key 写进代码或把 `~/.pionex/config.toml` 提交到 git。
- 仅看行情可不配密钥或使用只读密钥。
- 实盘交易建议使用单独、权限最小的 API Key，并视情况开启 IP 白名单。
