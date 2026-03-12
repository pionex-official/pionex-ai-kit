# pionex-mcp-server 快速入门指南

pionex-mcp-server 是一个 MCP（Model Context Protocol）服务器，将 [Pionex](https://www.pionex.com) 的 REST API 暴露给任何兼容 MCP 的客户端（Cursor、OpenClaw、Claude Desktop 等）。

## 功能特性

- **行情数据（公开）**：无需 API Key 即可获取盘口深度、最近成交等。
- **账户与订单（需认证）**：设置 `PIONEX_API_KEY` 和 `PIONEX_API_SECRET` 后，可查询余额、下单、查单、撤单。
- **一键配置向导**：通过 `npx pionex-mcp-server setup` 自动写入 Cursor / OpenClaw 的 MCP 配置。

---

## 前置条件

- **Node.js 18+**  
  用下面命令确认：

```bash
node --version
```

- 一个 **Pionex 账户**（仅私有/交易工具需要，公开行情无需账户）。

---

## 获取 Pionex API 密钥

1. 登录 [pionex.com](https://www.pionex.com)
2. 进入 **API 管理** 页面
3. 创建新的 API Key：
   - 只勾选你真正需要的权限（仅查询余额/订单时，建议只读权限）
4. 复制 **API Key** 和 **Secret**（Secret 只显示一次）
5. 如有需要，可以开启 IP 白名单以提高安全性

---

## 一键 Setup（推荐）

在终端中执行：

```bash
npx pionex-mcp-server setup
```

向导会依次询问：

- 使用的客户端：**Cursor** / **OpenClaw** / **Both**
- **PIONEX_API_KEY** 与 **PIONEX_API_SECRET**
- 可选的 **PIONEX_BASE_URL**（默认 `https://api.pionex.com`）

脚本会自动写入：

- Cursor：`~/.cursor/mcp.json`
- OpenClaw 主配置：`~/.openclaw/openclaw.json`
- OpenClaw mcporter 配置：`~/.openclaw/workspace/config/mcporter.json`

保存后，**重启 Cursor 或 OpenClaw** 即可使用 Pionex 的 MCP 工具。

---

## 手动配置 MCP（可选）

如需手动配置，可以直接运行服务器：

```bash
npx pionex-mcp-server
```

并在你的 MCP 配置中加入类似内容。

### Cursor（`~/.cursor/mcp.json`）

```json
{
  "mcpServers": {
    "pionex": {
      "command": "npx",
      "args": ["pionex-mcp-server"],
      "env": {
        "PIONEX_API_KEY": "你的-api-key",
        "PIONEX_API_SECRET": "你的-api-secret",
        "PIONEX_BASE_URL": "https://api.pionex.com"
      }
    }
  }
}
```

### OpenClaw（`~/.openclaw/openclaw.json` + `~/.openclaw/workspace/config/mcporter.json`）

```json
{
  "mcpServers": {
    "pionex": {
      "command": "npx",
      "args": ["pionex-mcp-server"],
      "env": {
        "PIONEX_API_KEY": "你的-api-key",
        "PIONEX_API_SECRET": "你的-api-secret",
        "PIONEX_BASE_URL": "https://api.pionex.com"
      }
    }
  }
}

同一段 `mcpServers.pionex` 配置可以同时用于：

- `~/.openclaw/openclaw.json`（OpenClaw 主配置）
- `~/.openclaw/workspace/config/mcporter.json`（让 mcporter 也能发现并管理 Pionex MCP 服务器）
```

---

## 常用环境变量

| 变量名              | 是否必填 | 默认值                     | 说明                     |
|---------------------|----------|----------------------------|--------------------------|
| `PIONEX_API_KEY`    | 否       | —                          | 访问私有/交易接口的 API Key |
| `PIONEX_API_SECRET` | 否       | —                          | 对请求签名用的 Secret     |
| `PIONEX_BASE_URL`   | 否       | `https://api.pionex.com`   | 覆盖默认 API 地址         |

示例：

```bash
export PIONEX_API_KEY="你的-key"
export PIONEX_API_SECRET="你的-secret"
export PIONEX_BASE_URL="https://api.pionex.com"
```

---

## 示例提问

当你的 Agent 已经加载了 `pionex` MCP 服务器后，可以尝试：

**行情类（无需 API Key）：**

```text
使用 Pionex 工具，获取 BTC_USDT 的盘口深度，限制 5 档。
使用 Pionex 工具，获取 ETH_USDT 最近 10 笔成交。
```

**账户与订单（需要 API Key）：**

```text
使用 Pionex 工具，查询我的现货账户余额。
使用 Pionex 工具，下一个限价买单：BTC_USDT，买入 0.01 BTC，价格 30000 USDT。
使用 Pionex 工具，查询 BTC_USDT 某个 orderId 的订单状态。
使用 Pionex 工具，撤销 BTC_USDT 某个 orderId 的订单。
```

---

## 安全提示

- 不要在代码中硬编码 API Key，也不要把密钥提交到 git 仓库。
- 如果只是看行情，可以不配置密钥，或只使用只读密钥。
- 进行真实交易时，建议：
  - 使用单独的交易专用 API Key，权限最小化
  - 视情况开启 IP 白名单
- 所有写操作（下单、撤单）都会真实作用在你的 Pionex 账户上，务必先在小金额下测试确认无误。

