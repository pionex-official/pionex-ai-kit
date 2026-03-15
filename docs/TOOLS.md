# Pionex MCP 工具列表

当前 `@pionex/pionex-trade-mcp` 暴露给 Agent 的工具如下。Agent 主要依靠每个工具的 **description** 和 **name** 决定何时调用哪个工具；参数通过 **inputSchema** 约束。

---

## 1. 行情（无需 API Key）

| 工具名 | 说明 |
|--------|------|
| `pionex.market.get_depth` | 获取指定交易对的盘口深度（买卖档位）。用于查盘口、价差、流动性。 |
| `pionex.market.get_trades` | 获取指定交易对最近成交记录。用于查最新价、成交量。 |
| `pionex.market.get_symbol_info` | 获取交易对元信息（精度、最小下单量、价格限制等）。下单前建议先查以避开 TRADE_AMOUNT_FILTER_DENIED 等错误。 |
| `pionex.market.get_tickers` | 获取 24 小时 ticker（开高低收、成交量、成交额、笔数）。可选 symbol 或 type（SPOT/PERP）。 |
| `pionex.market.get_klines` | 获取 K 线（OHLCV）。用于图表或历史价格/成交量；需 symbol、interval（1M/5M/15M/30M/60M/4H/8H/12H/1D）。 |

---

## 2. 账户（需 API Key）

| 工具名 | 说明 |
|--------|------|
| `pionex.account.get_balance` | 查询当前账户各币种余额。需在 ~/.pionex/config.toml 或 env 中配置 PIONEX_API_KEY / PIONEX_API_SECRET。 |

---

## 3. 订单（需 API Key）

| 工具名 | 说明 |
|--------|------|
| `pionex.orders.new_order` | 下单（限价/市价、买/卖）。限价需 symbol, side, type=LIMIT, price, size；市价买需 amount，市价卖需 size。 |
| `pionex.orders.get_order` | 按 orderId 查询单个订单状态。 |
| `pionex.orders.get_order_by_client_order_id` | 按客户端自定义订单号查询订单。 |
| `pionex.orders.get_open_orders` | 查询指定交易对下当前未成交订单列表。 |
| `pionex.orders.get_all_orders` | 查询指定交易对的历史订单（含已成交/已撤销），可带 limit 分页。 |
| `pionex.orders.cancel_order` | 撤销指定 orderId 的订单。 |
| `pionex.orders.get_fills` | 查询指定交易对在时间范围内的成交明细（fills），需 API Key，最多返回 100 条。 |
| `pionex.orders.cancel_all_orders` | 撤销指定交易对下所有未成交订单。 |

---

## Description 与 Agent 识别

- MCP 协议里每个 tool 有 **name**、**description**、**inputSchema**。客户端（Cursor / Claude 等）会把 `tools/list` 返回的 name + description + 参数说明发给大模型。
- **Description** 是给模型看的“何时用这个工具”的提示；写得太简略（例如只有工具名）时，模型可能不知道在“查余额”“查盘口”“下单”时该选哪个。
- 建议每个工具都有一句 **一句话说明**（做什么、典型用法），例如：“Query spot account balances for all currencies. Requires API credentials.” 这样 Agent 更容易在用户说“帮我查下余额”时选中 `pionex.account.get_balance`。

当前代码里已为上述工具补全了 description（见各 `server.tool(..., description, { schema }, handler)`）。若你希望更短或更长的文案，可说明偏好再改。
