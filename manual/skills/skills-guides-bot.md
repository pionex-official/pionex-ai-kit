# Bot Skills

### Bot Order List

#### Command Reference

| Command | Type | Description |
| ------- | ---- | ----------- |
| `pionex-trade-cli bot order_list [--status running\|finished] [--base <BASE>] [--quote <QUOTE>] [--page-token <token>] [--bu-order-types <types>]` | Read | List bot orders across all types with optional filters and pagination |

#### Flags

| Flag | Description |
| ---- | ----------- |
| `--status` | `running` (default) or `finished` |
| `--base` | Base currency filter (e.g. `BTC`) |
| `--quote` | Quote currency filter (e.g. `USDT`) |
| `--page-token` | Pagination token from a previous response |
| `--bu-order-types` | Comma-separated bot types: `futures_grid`, `spot_grid`, `smart_copy`. Omit to return all types. |

#### MCP Tool

| Tool | Description |
| ---- | ----------- |
| `pionex_bot_order_list` | List bot orders with filters and pagination (supports futures_grid / spot_grid / smart_copy) |

#### Examples

```bash
# List all running bot orders
pionex-trade-cli bot order_list

# List only spot_grid orders
pionex-trade-cli bot order_list --bu-order-types spot_grid

# List finished BTC orders across all bot types
pionex-trade-cli bot order_list --status finished --base BTC

# Filter by multiple bot types
pionex-trade-cli bot order_list --bu-order-types futures_grid,spot_grid

# Paginate to next page
pionex-trade-cli bot order_list --page-token <token>
```

---

### pionex-bot: Futures Grid Bot

Futures grid bot creation and management. **Requires API credentials**.

#### Command Reference

| Command                                                                        | Type  | Description                                          |
| ------------------------------------------------------------------------------ | ----- | ---------------------------------------------------- |
| `pionex-trade-cli bot futures_grid get --bu-order-id <id>`                                  | Read  | Get a futures grid bot order by ID                   |
| `pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | Write | Create a futures grid bot order          |
| `pionex-trade-cli bot futures_grid adjust_params --body-json '<JSON>'`                      | Write | Adjust bot params (invest / grid range)              |
| `pionex-trade-cli bot futures_grid reduce --body-json '<JSON>'`                             | Write | Reduce bot positions                                 |
| `pionex-trade-cli bot futures_grid cancel --bu-order-id <id>`                               | Write | Cancel and close a bot order                         |

#### Create Parameters

**Required fields in `buOrderData`:**

* `top` / `bottom`: Grid upper / lower price
* `row`: Number of grid levels
* `grid_type`: `"arithmetic"` or `"geometric"`
* `trend`: `"long"`, `"short"`, or `"no_trend"`
* `leverage`: Leverage multiplier
* `quoteInvestment`: Investment amount in quote currency

#### Examples

```bash
# Create a long futures grid bot
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000", "bottom": "60000", "row": 50,
  "grid_type": "arithmetic", "trend": "long",
  "leverage": 5, "quoteInvestment": "1000"
}'

# Get bot status
pionex-trade-cli bot futures_grid get --bu-order-id 123456

# Add margin
pionex-trade-cli bot futures_grid adjust_params --body-json '{
  "buOrderId": "123456", "type": "invest_in",
  "extraMargin": true, "quoteInvestment": 500
}'

# Reduce positions
pionex-trade-cli bot futures_grid reduce --body-json '{"buOrderId": "123456", "reduceNum": 10}'

# Cancel bot
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456
```

#### Behavioral Constraints

1. **Explicit parameters**: Never guess grid range, leverage, or investment amount. If unclear, ask the user.
2. **Dry-run first**: For any write operation (create, adjust, reduce, cancel), prefer running with `--dry-run` first, showing the user what will happen, and only executing after confirmation.
3. **Balance check**: Before creating a bot, check the available balance. If funds are insufficient, inform the user and suggest adjusting the investment amount.
4. **Leverage awareness**: Always confirm leverage with the user. Never increase leverage without explicit agreement.
5. **Cancel preview**: Before canceling a bot, retrieve its current status and show it to the user for confirmation.
6. **No unilateral risk increase**: The agent will never increase investment, leverage, or grid range without the user's explicit agreement.

#### Bot Trading Flow Example

User: "Create a long BTC futures grid bot with 1000 USDT"

Agent execution flow:

1. Check balance: `pionex-trade-cli account balance` -> verify available USDT
2. Get symbol info: `pionex-trade-cli market symbols --symbols BTC_USDT --type PERP`
3. Get current price: `pionex-trade-cli market tickers --symbol BTC_USDT --type PERP`
4. Ask user for grid range, number of grids, and leverage (if not specified)
5. Dry-run preview: `pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
6. After user confirms, execute the actual create (remove `--dry-run`)

---

### pionex-bot: Spot Grid Bot

Spot grid bot creation and management. **Requires API credentials**.

#### Command Reference

| Command                                                                                                      | Type  | Description                                            |
| ------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------ |
| `pionex-trade-cli bot spot_grid get --bu-order-id <id>`                                                      | Read  | Get a spot grid bot order by ID                        |
| `pionex-trade-cli bot spot_grid get_ai_strategy --base <BASE> --quote <QUOTE>`                               | Read  | Get AI-recommended grid parameters for a trading pair  |
| `pionex-trade-cli bot spot_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'`          | Write | Create a spot grid bot order                           |
| `pionex-trade-cli bot spot_grid adjust_params --bu-order-id <id> [--top <p>] [--bottom <p>] [--row <n>] [--quote-invest <amt>]` | Write | Adjust bot range or add investment      |
| `pionex-trade-cli bot spot_grid invest_in --bu-order-id <id> --quote-invest <amount>`                        | Write | Add additional quote investment to a running bot       |
| `pionex-trade-cli bot spot_grid cancel --bu-order-id <id> [--close-sell-model NOT_SELL\|TO_QUOTE\|TO_USDT]`  | Write | Cancel and close a bot order                           |
| `pionex-trade-cli bot spot_grid profit --bu-order-id <id> --amount <amount>`                                 | Write | Extract accumulated grid profit                        |

#### Create Parameters

**Required fields in `buOrderData`:**

* `top` / `bottom`: Grid upper / lower price
* `row`: Number of grid levels (2–200)
* `gridType`: `"arithmetic"` or `"geometric"` (camelCase, unlike futures grid)
* `quoteTotalInvestment`: Investment amount in quote currency

**Key differences from Futures Grid:**
- No `leverage` or `trend` fields (spot, not futures)
- `gridType` is camelCase; futures grid uses `grid_type` (snake_case)
- `quoteTotalInvestment` for create (not `quoteInvestment`)
- `quoteInvest` for adjust/invest_in
- Default `closeSellModel` is `NOT_SELL` (futures default is `TO_QUOTE`)

#### Examples

```bash
# Get AI strategy recommendation
pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT

# Create a spot grid bot (dry-run first)
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000", "bottom": "90000", "row": 50,
  "gridType": "arithmetic", "quoteTotalInvestment": "100"
}' --dry-run

# Get bot status
pionex-trade-cli bot spot_grid get --bu-order-id 123456

# Add investment
pionex-trade-cli bot spot_grid invest_in --bu-order-id 123456 --quote-invest 50

# Adjust grid range
pionex-trade-cli bot spot_grid adjust_params --bu-order-id 123456 --top 120000 --bottom 85000

# Extract profit
pionex-trade-cli bot spot_grid profit --bu-order-id 123456 --amount 10

# Cancel bot
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456 --close-sell-model TO_QUOTE
```

#### Behavioral Constraints

1. **Explicit parameters**: Never guess grid range or investment amount. If unclear, ask the user.
2. **AI strategy first**: For new bots, offer to call `get_ai_strategy` to get recommended parameters before asking the user to specify manually.
3. **Dry-run first**: For any write operation (create, adjust, invest_in, cancel, profit), prefer running with `--dry-run` first and only executing after confirmation.
4. **Balance check**: Before creating a bot, check available quote balance.
5. **Cancel preview**: Before canceling a bot, retrieve its current status and show it to the user for confirmation.
6. **No unilateral risk increase**: Never increase investment or grid range without explicit user agreement.

#### Spot Grid Trading Flow Example

User: "Create a BTC spot grid bot with 100 USDT"

Agent execution flow:

1. Check balance: `pionex-trade-cli account balance` → verify available USDT
2. Get AI strategy: `pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT`
3. Get current price: `pionex-trade-cli market tickers --symbol BTC_USDT`
4. Present AI-recommended parameters; ask user to confirm or adjust
5. Dry-run preview: `pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run`
6. After user confirms, execute the actual create (remove `--dry-run`)
