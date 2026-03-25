# Pionex MCP Tools

English below · 中文在后半部分。

`@pionex/pionex-trade-mcp` exposes a small, focused set of tools to agents.  
Agents mostly rely on each tool’s **name**, **description**, and **input schema** to decide what to call.

---

## 1. Market (no API key required)

**All tools below read‑only public data. Safe to enable even without credentials.**

| Tool | Description |
|------|-------------|
| `pionex_market_get_depth` | Get orderbook depth (bids/asks) for a symbol. Use for spread, liquidity, and best bid/ask. |
| `pionex_market_get_trades` | Get recent trades for a symbol. Use for latest price and recent volume. |
| `pionex_market_get_symbol_info` | Get symbol metadata (precision, min size, price limits). Call before placing orders to avoid filter errors. |
| `pionex_market_get_tickers` | Get 24‑hour tickers (open, high, low, close, volume, amount, count). Optional symbol or type (SPOT/PERP). |
| `pionex_market_get_klines` | Get OHLCV candles for a symbol. Use for charts and historical price/volume. Intervals: `1M` `5M` `15M` `30M` `60M` `4H` `8H` `12H` `1D`. |

**Example prompts**

- “Use the Pionex tools to show the order book depth for BTC_USDT.”
- “Get the last 20 trades for ETH_USDT.”
- “Fetch symbol info for BTC_USDT and ADA_USDT before placing an order.”
- “Get 1‑hour candles for BTC_USDT for the last 24 hours.”

---

## 2. Account (API key required)

| Tool | Description |
|------|-------------|
| `pionex_account_get_balance` | Query spot account balances for all currencies. Requires API key/secret in `~/.pionex/config.toml` or env. |

**Example prompts**

- “Use the Pionex tools to list my spot balances.”
- “Show my BTC and USDT balances on Pionex.”

---

## 3. Orders (API key required)

| Tool | Description |
|------|-------------|
| `pionex_orders_new_order` | Place a spot order. LIMIT: `symbol`, `side`, `type="LIMIT"`, `price`, `size`. MARKET BUY: `symbol`, `side="BUY"`, `type="MARKET"`, `amount`. MARKET SELL: `symbol`, `side="SELL"`, `type="MARKET"`, `size`. |
| `pionex_orders_get_order` | Get a single order by `orderId`. |
| `pionex_orders_get_order_by_client_order_id` | Get a single order by `clientOrderId`. |
| `pionex_orders_get_open_orders` | List open (unfilled) orders for a symbol. |
| `pionex_orders_get_all_orders` | List order history for a symbol (filled + cancelled). Optional `limit`. |
| `pionex_orders_cancel_order` | Cancel a single open order by `orderId`. |
| `pionex_orders_get_fills` | Get fills (executed trades) for a symbol in a time range. Up to 100 latest fills. |
| `pionex_orders_cancel_all_orders` | Cancel all open orders for a symbol. |

**Example prompts**

- “Place a limit buy order for 0.01 BTC at 30000 USDT on BTC_USDT.”
- “List my open orders on BTC_USDT.”
- “Get the status of order `<orderId>` on BTC_USDT.”
- “Cancel order `<orderId>` on BTC_USDT.”
- “Show my recent fills on BTC_USDT in the last 24 hours.”
- “Cancel all open orders on BTC_USDT.”

---

## 4. Bot / Futures Grid (API key required)

| Tool | Description |
|------|-------------|
| `pionex_bot_futures_grid_get_order` | Get one futures grid bot order by `buOrderId`. Optional `lang`. |
| `pionex_bot_futures_grid_create` | Create a futures grid bot order. Requires `base`, `quote`, and `buOrderData`. Strict OpenAPI validation for `buOrderData`: only required/optional keys are accepted; unknown keys rejected. |
| `pionex_bot_futures_grid_adjust_params` | Adjust futures grid params. Requires `buOrderId`, `type`, and `extraMargin` (plus fields depending on `type`). |
| `pionex_bot_futures_grid_reduce` | Reduce futures grid position. Requires `buOrderId` and `reduceNum`. Optional: `slippage`, `condition`, `conditionDirection`. |
| `pionex_bot_futures_grid_cancel` | Cancel and close a futures grid bot order. Requires `buOrderId`. Optional: `closeNote`, `closeSellModel`, `immediate`, `closeSlippage`. |

**`pionex_bot_futures_grid_create` — key rules**
- `buOrderData` required keys: `top`, `bottom`, `row`, `grid_type`, `trend`, `leverage`, `quoteInvestment`
- `buOrderData` optional keys: `extraMargin`, `condition`, `conditionDirection`, `lossStopType`, `lossStop`, `lossStopDelay`, `profitStopType`, `profitStop`, `profitStopDelay`, `lossStopHigh`, `shareRatio`, `investCoin`, `investmentFrom`, `uiInvestCoin`, `lossStopLimitPrice`, `lossStopLimitHighPrice`, `profitStopLimitPrice`, `slippage`, `bonusId`, `uiExtraData`, `movingIndicatorType`, `movingIndicatorInterval`, `movingIndicatorParam`, `movingTrailingUpParam`, `cateType`, `movingTop`, `movingBottom`, `enableFollowClosed`
- `buOrderData` must only contain those keys (`additionalProperties: false` + runtime check). Unknown keys cause an error.
- `openPrice` / `keyId` are not part of the create schema; if you include them in `buOrderData`, they are ignored.

**Example prompts**
- “Create a BTC_USDT futures grid using these parameters (top/bottom/row/etc.).”
- “Adjust my futures grid bot with type `invest_in`.”
- “Reduce the futures grid position by `reduceNum`.”

---

## How descriptions help agents

- MCP tools have **name**, **description**, and **inputSchema**. Clients (Cursor, Claude, etc.) pass this metadata to the LLM.
- The **description** is what the model sees when deciding whether to call `get_balance` vs `get_depth` vs `new_order`.
- Clear, action‑oriented descriptions (what the tool does, typical usage, and whether it needs auth) make agents much more reliable.

Current code already sets descriptions for all tools in `server.tool(name, description, { schema }, handler)`.  
If you change semantics or add new tools, update this file and the descriptions together.

---

# Pionex MCP 工具列表（中文）

下面是 `@pionex/pionex-trade-mcp` 当前向 Agent 暴露的工具。  
Agent 主要依靠每个工具的 **name**、**description** 和 **inputSchema** 决定何时调用哪个工具。

---

## 1. 行情（无需 API Key）

**以下工具只读取公共行情数据，启用不会带来资金风险。**

| 工具名 | 说明 |
|--------|------|
| `pionex_market_get_depth` | 获取指定交易对的盘口深度（买卖档位）。用于查看盘口、价差和流动性。 |
| `pionex_market_get_trades` | 获取指定交易对最近成交记录。用于查看最新价和近期成交量。 |
| `pionex_market_get_symbol_info` | 获取交易对元信息（精度、最小下单量、价格限制等）。下单前建议先查，避免触发下单金额/数量过滤错误。 |
| `pionex_market_get_tickers` | 获取 24 小时 ticker（开高低收、成交量、成交额、笔数）。可选 `symbol` 或 `type`（SPOT/PERP）。 |
| `pionex_market_get_klines` | 获取 K 线（OHLCV）。用于图表或历史价格/成交量分析；需 `symbol`、`interval`（1M/5M/15M/30M/60M/4H/8H/12H/1D）。 |

**示例提示词**

- 「用 Pionex 工具获取 BTC_USDT 的盘口深度。」
- 「用 Pionex 工具拉取 ETH_USDT 最近 20 笔成交。」
- 「在帮我下单前，先查一下 BTC_USDT 和 ADA_USDT 的 symbol 信息。」
- 「获取 BTC_USDT 最近 24 小时的 1 小时 K 线。」

---

## 2. 账户（需 API Key）

| 工具名 | 说明 |
|--------|------|
| `pionex_account_get_balance` | 查询当前账户各币种余额。需在 `~/.pionex/config.toml` 或 env 中配置 `PIONEX_API_KEY` / `PIONEX_API_SECRET`。 |

**示例提示词**

- 「用 Pionex 工具列出我所有现货账户余额。」
- 「帮我看一下我在 Pionex 上的 BTC 和 USDT 余额。」

---

## 3. 订单（需 API Key）

| 工具名 | 说明 |
|--------|------|
| `pionex_orders_new_order` | 下单（限价/市价、买/卖）。限价需 `symbol`, `side`, `type="LIMIT"`, `price`, `size`；市价买需 `amount`，市价卖需 `size`。 |
| `pionex_orders_get_order` | 按 `orderId` 查询单个订单状态。 |
| `pionex_orders_get_order_by_client_order_id` | 按客户端自定义订单号 `clientOrderId` 查询订单。 |
| `pionex_orders_get_open_orders` | 查询指定交易对下当前未成交订单列表。 |
| `pionex_orders_get_all_orders` | 查询指定交易对的历史订单（含已成交/已撤销），可用 `limit` 控制返回条数。 |
| `pionex_orders_cancel_order` | 撤销指定 `orderId` 的订单。 |
| `pionex_orders_get_fills` | 查询指定交易对在时间范围内的成交明细（fills），最多返回 100 条。 |
| `pionex_orders_cancel_all_orders` | 撤销指定交易对下所有未成交订单。 |

**示例提示词**

- 「帮我在 BTC_USDT 上挂一个 30000 USDT 的 0.01 BTC 限价买单。」
|- 「用 Pionex 工具列出我在 BTC_USDT 上所有未成交订单。」
- 「查询一下订单 `<orderId>` 的最新状态。」
- 「帮我撤掉 BTC_USDT 上的订单 `<orderId>`。」
- 「获取我最近 24 小时在 BTC_USDT 上的成交明细。」
- 「撤销 BTC_USDT 上所有未成交的订单。」

---

## 4. Bot / Futures 网格机器人（需 API Key）

| 工具名 | 说明 |
|--------|------|
| `pionex_bot_futures_grid_get_order` | 根据 `buOrderId` 获取一个 futures grid 机器人订单。可选 `lang`。 |
| `pionex_bot_futures_grid_create` | 创建 futures 网格机器人订单。需要 `base`、`quote`、`buOrderData`。对 `buOrderData` 做严格 OpenAPI 校验：只接受必填/可选 key，未知 key 会直接报错。 |
| `pionex_bot_futures_grid_adjust_params` | 调整 futures 网格机器人参数。需要 `buOrderId`、`type` 和 `extraMargin`（以及按 `type` 不同的附加字段）。 |
| `pionex_bot_futures_grid_reduce` | 减仓 futures 网格机器人仓位。需要 `buOrderId` 和 `reduceNum`。可选：`slippage`、`condition`、`conditionDirection`。 |
| `pionex_bot_futures_grid_cancel` | 撤销并关闭 futures 网格机器人订单。需要 `buOrderId`。可选：`closeNote`、`closeSellModel`、`immediate`、`closeSlippage`。 |

**`pionex_bot_futures_grid_create` — 关键校验规则**
- `buOrderData` 必填 key：`top`、`bottom`、`row`、`grid_type`、`trend`、`leverage`、`quoteInvestment`
- `buOrderData` 可选 key：`extraMargin`、`condition`、`conditionDirection`、`lossStopType`、`lossStop`、`lossStopDelay`、`profitStopType`、`profitStop`、`profitStopDelay`、`lossStopHigh`、`shareRatio`、`investCoin`、`investmentFrom`、`uiInvestCoin`、`lossStopLimitPrice`、`lossStopLimitHighPrice`、`profitStopLimitPrice`、`slippage`、`bonusId`、`uiExtraData`、`movingIndicatorType`、`movingIndicatorInterval`、`movingIndicatorParam`、`movingTrailingUpParam`、`cateType`、`movingTop`、`movingBottom`、`enableFollowClosed`
- `buOrderData` 只允许以上这些 key（`additionalProperties: false` + 运行时校验）。未知 key 会报错。
- `openPrice` / `keyId` 不属于创建 schema；如果你把它们放进 `buOrderData`，它们会被忽略。

**示例提示词**
- “用这些参数创建一组 BTC_USDT futures 网格机器人（top/bottom/row 等）。”
- “把我的 futures grid 用 `invest_in` 类型进行调整。”
- “按给定的 `reduceNum` 减仓。”

---

## Description 与 Agent 识别

- MCP 协议里每个 tool 有 **name**、**description**、**inputSchema**。客户端（Cursor / Claude 等）会把 `tools/list` 返回的这些信息交给大模型。
- **Description** 是给模型看的「在什么场景下用这个工具」的提示；如果写得太短（比如只有工具名），模型在「查余额 / 查盘口 / 下单」等场景下就不容易选对工具。
- 建议每个工具都有一句清晰的一句话说明（做什么、典型用法、是否需要鉴权），例如：  
  「Query spot account balances for all currencies. Requires API credentials.」

当前代码中所有工具都已经设置了 description（见 `server.tool(..., description, { schema }, handler)`）。  
如果你调整了语义或新加/删除工具，请同步更新本文件，保持文档与实现一致。

