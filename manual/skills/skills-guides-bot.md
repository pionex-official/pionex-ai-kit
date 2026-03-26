# Bot Skills

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
