# 交易工具

### 市場工具（無需 API Key）

| 工具                            | 說明                                     |
| ------------------------------- | ----------------------------------------------- |
| `pionex_market_get_depth`       | 訂單簿深度（買賣盤）                    |
| `pionex_market_get_trades`      | 最近成交記錄                            |
| `pionex_market_get_symbol_info` | 交易對中繼資料（精度、最小數量等） |
| `pionex_market_get_tickers`     | 24 小時行情（開盤、收盤、最高、最低、成交量）     |
| `pionex_market_get_book_tickers` | 最優買賣價行情                         |
| `pionex_market_get_klines`      | OHLCV K 線資料                          |

### 訂單工具（需要 API Key）

| 工具                                         | 說明                         |
| -------------------------------------------- | ----------------------------------- |
| `pionex_orders_new_order`                    | 建立訂單（限價/市價）      |
| `pionex_orders_get_order`                    | 依訂單 ID 查詢訂單               |
| `pionex_orders_get_order_by_client_order_id` | 依自訂訂單 ID 查詢訂單        |
| `pionex_orders_get_open_orders`              | 列出未完成訂單                    |
| `pionex_orders_get_all_orders`               | 列出訂單歷史記錄                  |
| `pionex_orders_cancel_order`                 | 取消特定訂單             |
| `pionex_orders_cancel_all_orders`            | 取消某交易對的所有未完成訂單 |
| `pionex_orders_get_fills`                    | 按時間範圍查詢成交明細        |
| `pionex_orders_get_fills_by_order_id`        | 查詢特定訂單的成交明細        |
