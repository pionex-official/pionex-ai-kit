# Skills 指南

### 概述

Pionex Skills 是高级行为手册，告诉 AI 智能体如何安全有效地使用 `pionex-trade-cli` 命令行工具进行加密货币交易操作。

与 MCP（定义工具接口）不同，Skills 还编码了**风险控制和行为约束**——例如在下单前检查余额、遵守最小订单量、使用试运行预览等。

### 安装

```bash
# 安装 CLI
npm install -g @pionex/pionex-ai-kit

# 配置凭证（在 https://www.pionex.com/my-account/api 创建 API Key）
pionex-ai-kit onboard

# 安装 Skills
npx skills add pionex-official/pionex-skills
```

> 您可以在 [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api) 创建 API Key。
>
> [API Key 指南](https://www.pionex.com/docs/api-docs/references/api-key-guide)

### Skill 列表

| Skill                      | 描述                                                                | 是否需要 API Key |
| -------------------------- | ------------------------------------------------------------------ | --------------- |
| **pionex-market**    | 公开市场数据：订单簿深度、行情、交易对信息、K线、成交记录                  | 否               |
| **pionex-portfolio** | 账户余额（现货）                                                     | 是               |
| **pionex-trade**     | 现货订单：下单、撤单、查询未完成订单、成交记录                          | 是               |
| **pionex-bot**        | 合约网格机器人：创建、调整、减仓、取消、查询                           | 是               |
| **pionex-earn-dual** | 双向理财：查询产品与收益率、申购、撤单、提取收益                        | 部分             |

### Skill 路由

智能体会根据用户意图自动选择合适的 skill：

* 市场数据、价格、订单簿、K线 -> **pionex-market**
* 余额、可用资金 -> **pionex-portfolio**
* 下单/撤单、订单状态 -> **pionex-trade**
* 合约网格机器人创建/调整/减仓/取消/查询 -> **pionex-bot**
* 双向理财查询/申购/撤单/收益提取 -> **pionex-earn-dual**

---

### Skills

* [Trade Skills](skills-guides-trade.md) — 市场数据、账户余额和现货订单操作
* [Bot Skills](skills-guides-bot.md) — 合约网格机器人的创建、管理和取消
* [Earn Dual Skills](skills-guides-earn.md) — 双向理财：查询产品、申购、撤单、收益提取

---

### 跨 Skill 协作

下单通常需要多个 skills 协同工作：

```bash
# 1. 查询当前价格和24h波动范围（pionex-market）
pionex-trade-cli market tickers --symbol BTC_USDT

# 2. 查询交易对规则：最小下单量、精度（pionex-market）
pionex-trade-cli market symbols --symbols BTC_USDT

# 3. 查询可用余额（pionex-portfolio）
pionex-trade-cli account balance

# 4. 下单（pionex-trade）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type LIMIT --price 50000 --size 0.01
```

### 安全最佳实践

* **永远不要**将 `~/.pionex/config.toml` 提交到版本控制或在聊天中粘贴 API keys
* 为智能体使用**专用 API key**，且权限最小化
* 在正式交易前先用小额测试
* 考虑在 Pionex API 设置中启用 IP 白名单
