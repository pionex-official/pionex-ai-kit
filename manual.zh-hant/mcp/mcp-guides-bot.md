# 機器人工具

### 機器人訂單（需要 API Key）

| 工具                                         | 說明                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `pionex_bot_order_list`                      | 列出機器人訂單（支援過濾與分頁，涵蓋 futures_grid / spot_grid / smart_copy） |

### 合約網格（需要 API Key）

| 工具                                         | 說明                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `pionex_bot_futures_grid_get_order`          | 依 buOrderId 查詢合約網格機器人訂單            |
| `pionex_bot_futures_grid_create`             | 建立合約網格機器人訂單                      |
| `pionex_bot_futures_grid_adjust_params`      | 調整合約網格機器人參數（追加投入/網格範圍） |
| `pionex_bot_futures_grid_reduce`             | 減少合約網格機器人倉位                     |
| `pionex_bot_futures_grid_cancel`             | 取消並關閉合約網格機器人訂單            |
