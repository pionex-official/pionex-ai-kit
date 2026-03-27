# Pionex AI Kit

[![CI](https://img.shields.io/badge/CI-no%20status-lightgrey)](#)
[![coverage](https://img.shields.io/badge/codecov-unknown-lightgrey)](#)
[![npm: kit](https://img.shields.io/npm/v/@pionex/pionex-ai-kit?label=pionex-ai-kit)](https://www.npmjs.com/package/@pionex/pionex-ai-kit)
[![npm downloads: kit](https://img.shields.io/npm/dt/@pionex/pionex-ai-kit?label=kit+total+downloads)](https://www.npmjs.com/package/@pionex/pionex-ai-kit)
[![npm: mcp](https://img.shields.io/npm/v/@pionex/pionex-trade-mcp?label=pionex-trade-mcp)](https://www.npmjs.com/package/@pionex/pionex-trade-mcp)
[![npm downloads: mcp](https://img.shields.io/npm/dt/@pionex/pionex-trade-mcp?label=mcp+total+downloads)](https://www.npmjs.com/package/@pionex/pionex-trade-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) | 简体中文 | [繁體中文](README.zh-hant.md)

Pionex AI Kit —— AI 驱动的交易工具集，包含两个独立包：

| 包                           | 描述                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `@pionex/pionex-ai-kit`    | CLI 工具，用于账号引导和 MCP 客户端配置；运行 `pionex-ai-kit onboard` 写入 `~/.pionex/config.toml`（API key、secret、base URL）。 |
| `@pionex/pionex-trade-mcp` | MCP 服务器，从 `~/.pionex/config.toml` 读取凭证，将 Pionex 交易工具暴露给 Cursor、Claude Desktop 等 MCP 兼容客户端。              |

---

## 这是什么？

Pionex AI Kit 为你提供一整套连接 Pionex 的 AI Agent 基础设施，包括 MCP、Skills 和 CLI。支持 Cursor、Claude、OpenClaw、Windsurf、VSCode 等主流 AI Agent。

你只需在对话中描述想做什么，AI 会调用本地 MCP 服务器上的工具，在 Pionex 上执行相应的 API 调用，无需在 AI 和交易所界面之间来回切换。

- **本地优先**：以本地进程方式运行；API 密钥保存在环境变量或 `~/.pionex/config.toml` 中，不会出现在聊天记录里。
- **两个入口**：CLI 负责账号引导和配置，MCP 服务器负责工具调用。
- **原生 MCP**：兼容所有 MCP 标准客户端。

---

## 功能

### MCP

用于在 Pionex 上交易的 MCP 服务器。

| 包                                 | 模块                        | 工具                                                                                                                                                                                                                                                                                                                    | 鉴权 |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **@pionex/pionex-trade-mcp** | **Market**            | `pionex_market_get_depth`、`pionex_market_get_trades`、`pionex_market_get_symbol_info`、`pionex_market_get_tickers`、`pionex_market_get_book_tickers`、`pionex_market_get_klines`                                                                                                                            | 否   |
|                                    | **Account**           | `pionex_account_get_balance`                                                                                                                                                                                                                                                                                          | 是   |
|                                    | **Orders**            | `pionex_orders_new_order`、`pionex_orders_get_order`、`pionex_orders_get_order_by_client_order_id`、`pionex_orders_get_open_orders`、`pionex_orders_get_all_orders`、`pionex_orders_cancel_order`、`pionex_orders_get_fills`、`pionex_orders_get_fills_by_order_id`、`pionex_orders_cancel_all_orders` | 是   |
|                                    | **Bot / Futures Grid** | `pionex_bot_futures_grid_get_order`、`pionex_bot_futures_grid_create`、`pionex_bot_futures_grid_adjust_params`、`pionex_bot_futures_grid_reduce`、`pionex_bot_futures_grid_cancel`                                                                                                                            | 是   |

---

### Skills

| Skill                                                                                                        | 描述                                         | 鉴权 |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---- |
| [pionex-market](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-market/SKILL.md)       | 公开行情数据：盘口、行情、交易对、K 线、成交 | 否   |
| [pionex-portfolio](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-portfolio/SKILL.md) | 账户余额（现货）                             | 是   |
| [pionex-trade](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-trade/SKILL.md)         | 现货订单：下单、撤单、查询挂单、成交记录     | 是   |
| [pionex-bot](https://github.com/pionex-official/pionex-skills/blob/main/skills/pionex-bot/SKILL.md)             | 合约网格：查询、创建、调参、减仓、撤单       | 是   |

### CLI

**`pionex-trade-cli`** —— 通过命令行直接访问 Pionex 行情、账户、订单与合约网格机器人

---

## 快速开始

### **安装**

**前置要求：** Node.js ≥ 18

```bash
# 1. 安装 Kit
npm install -g @pionex/pionex-ai-kit

# 2. 配置 Pionex API 凭证（交互式向导）
pionex-ai-kit onboard

# 3. 将 MCP 服务器注册到你的 AI 客户端（选择你正在使用的）
# 此命令会为你的客户端写入相应的 MCP 配置，
# 使其可以通过 `npx @pionex/pionex-trade-mcp` 启动服务。

pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf
pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode
pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw

# 4. 安装 Skills
npx skills add pionex-official/pionex-skills
```

### 示例

#### MCP

**盘口深度**

在 AI 客户端中输入：*"Use the Pionex tools to show the order book depth for BTC_USDT."*

Agent 会调用 MCP 工具并展示买卖盘口。

<img src="examples/orderbook-btc-usdt.png" width="50%" />

**合约网格（BTC 做多网格）**

在 AI 客户端中输入：*"Use the Pionex tools to create a BTC long futures grid: invest 100 USDT, upper bound 100000, lower bound 50000, 30 grid rows, 3x leverage."*

Agent 应调用 `pionex_bot_futures_grid_create`，并传入对应的 `base`、`quote` 和 `buOrderData`。

<img src="examples/btc-bot-create.png" width="50%" />

#### Skills

**盘口深度**

在 AI 客户端中输入：*"Use the Pionex skills to show the order book depth 5 for BTC_USDT."*

Agent 会使用 Pionex market skill 并展示买卖盘口。

<img src="examples/orderbook-btc-usdt-skill.png" width="75%" />

**合约网格（BTC 做多网格）**

在 AI 客户端中输入：*"Use the Pionex bot skill to create a BTC long futures grid: 100 USDT margin, price range 50000–100000, 30 rows, 3x leverage."*

Agent 会按照 `pionex-bot` skill 的指引，通过 CLI 或 MCP 工具完成创建。

<img src="examples/btc-bot-create-skill.png" width="75%" />

---

#### CLI

**行情与订单**

```
# 盘口深度
pionex-trade-cli market depth BTC_USDT --limit 5

# 最近成交
pionex-trade-cli market trades BTC_USDT --limit 10

# 下一个市价买单（dry-run 模式）
pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run
```

**合约网格（BTC 做多网格）**

在 BTC/USDT 上创建做多合约网格：投入 100 USDT、上界 100000、下界 50000、30 格、3 倍杠杆（建议先 dry-run）：

```
pionex-trade-cli bot futures_grid create \
  --base BTC \
  --quote USDT \
  --bu-order-data-json '{"top":"100000","bottom":"50000","row":30,"grid_type":"arithmetic","trend":"long","leverage":3,"quoteInvestment":"100"}' \
  --dry-run
```

去掉 `--dry-run` 即可真实下单。

---

## 使用手册

- [`manual.zh-hans/`](manual.zh-hans/)

---

## 更新日志

- [`CHANGELOG.zh-hans.md`](CHANGELOG.zh-hans.md)

---

## 安全

- **切勿**将 `~/.pionex/config.toml` 提交到代码仓库，也不要在聊天中粘贴 API 密钥。
- 建议为 Agent 创建权限最小化的**专用 API 密钥**。
- 交易前先用小金额测试；可在 Pionex API 设置中启用 IP 白名单。

---

## 参与贡献

开发、构建和发布说明见 [`CONTRIBUTING.zh-hans.md`](CONTRIBUTING.zh-hans.md)。
