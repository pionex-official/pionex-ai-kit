# Bot Tools

### Bot Orders (API Key Required)

| Tool                                         | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `pionex_bot_order_list`                      | List bot orders with filters and pagination (supports futures_grid / spot_grid / smart_copy) |

### Futures Grid (API Key Required)

| Tool                                         | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `pionex_bot_futures_grid_get_order`          | Get a futures grid bot order by buOrderId            |
| `pionex_bot_futures_grid_create`             | Create a futures grid bot order                      |
| `pionex_bot_futures_grid_adjust_params`      | Adjust futures grid bot params (invest / grid range) |
| `pionex_bot_futures_grid_reduce`             | Reduce futures grid bot position                     |
| `pionex_bot_futures_grid_cancel`             | Cancel and close a futures grid bot order            |
| `pionex_bot_futures_grid_check_params`       | Validate futures grid parameters before creating an order |

### Spot Grid (API Key Required)

| Tool                                         | Description                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| `pionex_bot_spot_grid_get_order`             | Get a spot grid bot order by buOrderId                       |
| `pionex_bot_spot_grid_get_ai_strategy`       | Get AI-recommended grid parameters for a trading pair        |
| `pionex_bot_spot_grid_create`                | Create a spot grid bot order                                 |
| `pionex_bot_spot_grid_adjust_params`         | Adjust spot grid bot range or add investment                 |
| `pionex_bot_spot_grid_invest_in`             | Add additional quote investment to a running spot grid bot   |
| `pionex_bot_spot_grid_cancel`                | Cancel and close a spot grid bot order                       |
| `pionex_bot_spot_grid_profit`                | Extract accumulated grid profit from a spot grid bot         |
| `pionex_bot_spot_grid_check_params`          | Validate spot grid parameters before creating an order       |

### Smart Copy (API Key Required)

| Tool                                         | Description                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| `pionex_bot_smart_copy_get_order`            | Get a smart copy bot order by buOrderId                      |
| `pionex_bot_smart_copy_create`               | Create a smart copy bot order                                |
| `pionex_bot_smart_copy_cancel`               | Cancel and close a smart copy bot order                      |
| `pionex_bot_smart_copy_check_params`         | Validate smart copy parameters before creating an order      |

### Signal (API Key Required)

| Tool                                         | Description                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| `pionex_bot_signal_listener`                 | Push a trading signal to the Pionex signal platform          |
