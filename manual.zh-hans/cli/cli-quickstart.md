# CLI 快速开始

Pionex AI Kit 提供两个 CLI 命令：

* **`pionex-ai-kit`** — 配置向导和 MCP 客户端设置
* **`pionex-trade-cli`** — 直接通过命令行访问 Pionex 市场数据、账户和订单操作

### 前置要求

* Node.js >= 18

### 安装

#### 1. 安装 CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

这将同时安装 `pionex-ai-kit` 和 `pionex-trade-cli` 命令。

#### 2. 配置 API 凭证

运行交互式向导：

```bash
pionex-ai-kit onboard
```

根据提示输入你的 Pionex API Key 和 Secret。凭证将保存到 `~/.pionex/config.toml`。

> 你可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 创建 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> 如果你只需要公开市场数据，可以跳过此步骤。

#### 3. 验证安装

```bash
# 测试市场数据（无需 API key）
pionex-trade-cli market tickers --symbol BTC_USDT

# 测试账户访问（需要 API key）
pionex-trade-cli account balance
```

### 升级

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### 快速示例

```bash
# 订单簿深度
pionex-trade-cli market depth BTC_USDT --limit 5

# 最近成交
pionex-trade-cli market trades BTC_USDT --limit 10

# 下市价买单（干运行）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

### 下一步

* 查看 [CLI 用户指南](cli-guides.md) 了解完整的命令参考
