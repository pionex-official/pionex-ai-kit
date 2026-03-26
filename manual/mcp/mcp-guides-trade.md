# Trade Tools

### Market Tools (No API Key Required)

| Tool                            | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `pionex_market_get_depth`       | Order book depth (bids/asks)                    |
| `pionex_market_get_trades`      | Recent trade history                            |
| `pionex_market_get_symbol_info` | Symbol metadata (precision, minimum size, etc.) |
| `pionex_market_get_tickers`     | 24h ticker (open, close, high, low, volume)     |
| `pionex_market_get_klines`      | OHLCV candlestick data                          |

### Account Tools (API Key Required)

| Tool                         | Description           |
| ---------------------------- | --------------------- |
| `pionex_account_get_balance` | Spot account balances |

### Order Tools (API Key Required)

| Tool                                         | Description                         |
| -------------------------------------------- | ----------------------------------- |
| `pionex_orders_new_order`                    | Create an order (limit/market)      |
| `pionex_orders_get_order`                    | Get order by order ID               |
| `pionex_orders_get_order_by_client_order_id` | Get order by client order ID        |
| `pionex_orders_get_open_orders`              | List open orders                    |
| `pionex_orders_get_all_orders`               | List order history                  |
| `pionex_orders_cancel_order`                 | Cancel a specific order             |
| `pionex_orders_cancel_all_orders`            | Cancel all open orders for a symbol |
| `pionex_orders_get_fills`                    | Query fill details                  |
