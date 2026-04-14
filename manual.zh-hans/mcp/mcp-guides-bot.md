# 机器人工具

### 机器人订单（需要 API Key）

| 工具                                         | 描述                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `pionex_bot_order_list`                      | 列出机器人订单（支持过滤和分页，覆盖 futures_grid / spot_grid / smart_copy） |

### 合约网格（需要 API Key）

| 工具                                         | 描述                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `pionex_bot_futures_grid_get_order`          | 通过 buOrderId 获取合约网格机器人订单            |
| `pionex_bot_futures_grid_create`             | 创建合约网格机器人订单                      |
| `pionex_bot_futures_grid_adjust_params`      | 调整合约网格机器人参数（投资额/网格区间） |
| `pionex_bot_futures_grid_reduce`             | 减少合约网格机器人仓位                     |
| `pionex_bot_futures_grid_cancel`             | 取消并关闭合约网格机器人订单            |
| `pionex_bot_futures_grid_check_params`       | 下单前校验合约网格参数                  |

### 现货网格（需要 API Key）

| 工具                                         | 描述                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| `pionex_bot_spot_grid_get_order`             | 通过 buOrderId 获取现货网格机器人订单                    |
| `pionex_bot_spot_grid_get_ai_strategy`       | 获取交易对的 AI 推荐网格参数                             |
| `pionex_bot_spot_grid_create`                | 创建现货网格机器人订单                                   |
| `pionex_bot_spot_grid_adjust_params`         | 调整现货网格机器人区间或追加投资                         |
| `pionex_bot_spot_grid_invest_in`             | 向运行中的现货网格机器人追加计价货币投资                 |
| `pionex_bot_spot_grid_cancel`                | 取消并关闭现货网格机器人订单                             |
| `pionex_bot_spot_grid_profit`                | 从现货网格机器人提取累积的网格利润                       |
| `pionex_bot_spot_grid_check_params`          | 下单前校验现货网格参数                                   |

### 智能跟单（需要 API Key）

| 工具                                         | 描述                                                     |
| -------------------------------------------- | -------------------------------------------------------- |
| `pionex_bot_smart_copy_get_order`            | 通过 buOrderId 获取智能跟单机器人订单                    |
| `pionex_bot_smart_copy_create`               | 创建智能跟单机器人订单                                   |
| `pionex_bot_smart_copy_cancel`               | 取消并关闭智能跟单机器人订单                             |
| `pionex_bot_smart_copy_check_params`         | 下单前校验智能跟单参数                                   |
| `pionex_bot_signal_add_listener`             | 订阅信号源（跟单交易员）                                 |
