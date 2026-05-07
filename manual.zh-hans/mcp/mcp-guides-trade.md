# 交易工具

### 市场工具（无需 API Key）

| 工具                            | 描述                                     |
| ------------------------------- | ----------------------------------------------- |
| `pionex_market_get_depth`       | 订单簿深度（买单/卖单）                    |
| `pionex_market_get_trades`      | 最近的交易历史                            |
| `pionex_market_get_symbol_info` | 交易对元数据（精度、最小数量等） |
| `pionex_market_get_tickers`     | 24 小时行情（开盘、收盘、最高、最低、成交量）     |
| `pionex_market_get_book_tickers` | 最优买卖价行情                           |
| `pionex_market_get_klines`      | OHLCV K 线数据                          |

### 订单工具（需要 API Key）

| 工具                                         | 描述                         |
| -------------------------------------------- | ----------------------------------- |
| `pionex_orders_new_order`                    | 创建订单（限价/市价）      |
| `pionex_orders_get_order`                    | 通过订单 ID 获取订单               |
| `pionex_orders_get_order_by_client_order_id` | 通过客户端订单 ID 获取订单        |
| `pionex_orders_get_open_orders`              | 列出开放订单                    |
| `pionex_orders_get_all_orders`               | 列出订单历史                  |
| `pionex_orders_cancel_order`                 | 取消特定订单             |
| `pionex_orders_cancel_all_orders`            | 取消交易对的所有开放订单 |
| `pionex_orders_get_fills`                    | 按时间范围查询成交明细        |
| `pionex_orders_get_fills_by_order_id`        | 查询特定订单的成交明细        |
