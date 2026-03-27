# Skills 快速入门

Pionex Skills 是面向 AI 智能体的高级行为手册，使其能够通过 `pionex-trade-cli` 命令行安全地执行市场数据查询、余额查询和现货交易操作。

### 前置条件

* Node.js >= 18

### 安装

#### 1. 安装 CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

此命令会同时安装 `pionex-trade-cli` 和 `pionex-ai-kit` 命令。

#### 2. 配置 API 凭证

```bash
pionex-ai-kit onboard
```

根据提示输入您的 Pionex API Key 和 Secret。凭证将保存到 `~/.pionex/config.toml`。

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 创建 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> 如果您只需要市场数据，可以跳过此步骤。

#### 3. 安装 Skills

```bash
npx skills add pionex-official/pionex-skills
```

#### 4. 验证安装

```bash
# 测试市场数据（无需 API key）
pionex-trade-cli market tickers --symbol BTC_USDT

# 测试账户查询（需要 API key）
pionex-trade-cli account balance
```

### 升级

```bash
npm update -g @pionex/pionex-ai-kit @pionex/pionex-trade-mcp
```

### 验证 Skills 是否正常工作

在您的 AI 客户端中输入以下提示：

> "使用 Pionex skills 显示 BTC_USDT 的订单簿深度 5 档。"

如果智能体成功调用 `pionex-trade-cli` 并返回订单簿数据，说明 Skills 安装正确。

### 下一步

* 查看 [Skills 用户指南](skills-guides.md) 了解完整的功能特性和使用细节
