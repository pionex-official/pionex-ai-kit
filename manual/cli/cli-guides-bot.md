# Bot Commands

### Bot Order List (Auth Required)

#### bot order_list

List bot orders across all bot types, with optional filters and pagination.

```bash
pionex-trade-cli bot order_list [--status running|finished] [--base <BASE>] [--quote <QUOTE>] [--page-token <token>] [--bu-order-types <types>]
```

| Flag | Description |
| --- | --- |
| `--status` | `running` (default) or `finished` |
| `--base` | Base currency filter (e.g. `BTC`) |
| `--quote` | Quote currency filter (e.g. `USDT`) |
| `--page-token` | Pagination token from a previous response |
| `--bu-order-types` | Comma-separated bot types: `futures_grid`, `spot_grid`, `smart_copy`. Omit to return all types. |

**Examples:**

```bash
# List all running bot orders
pionex-trade-cli bot order_list

# List only futures_grid orders
pionex-trade-cli bot order_list --bu-order-types futures_grid

# List finished BTC spot_grid orders
pionex-trade-cli bot order_list --status finished --base BTC --bu-order-types spot_grid

# Paginate to next page
pionex-trade-cli bot order_list --page-token <token>
```

### Futures Grid (Auth Required)

#### bot futures_grid get

Get a futures grid bot order by ID.

```bash
pionex-trade-cli bot futures_grid get --bu-order-id <id> [--lang <language>]
```

```bash
pionex-trade-cli bot futures_grid get --bu-order-id 123456
```

#### bot futures_grid create

Create a futures grid bot order.

```bash
pionex-trade-cli bot futures_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--dry-run]
```

* `--base`: Base currency (e.g. `BTC`); automatically normalized to `<BASE>.PERP` if suffix is missing
* `--quote`: Quote currency (e.g. `USDT`)
* `--bu-order-data-json`: JSON string containing grid order parameters

**Required fields in `buOrderData`:**

| Field             | Type   | Description                                      |
| ----------------- | ------ | ------------------------------------------------ |
| `top`             | string | Grid upper price                                 |
| `bottom`          | string | Grid lower price                                 |
| `row`             | number | Number of grid levels                            |
| `grid_type`       | string | `"arithmetic"` or `"geometric"`                  |
| `trend`           | string | `"long"`, `"short"`, or `"no_trend"`             |
| `leverage`        | number | Leverage multiplier                              |
| `quoteInvestment` | string | Investment amount in quote currency              |

**Examples:**

```bash
# Create a long futures grid bot for BTC_USDT
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000",
  "bottom": "60000",
  "row": 50,
  "grid_type": "arithmetic",
  "trend": "long",
  "leverage": 5,
  "quoteInvestment": "1000"
}'

# Dry-run (preview only)
pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"80000","bottom":"60000","row":50,"grid_type":"arithmetic","trend":"long","leverage":5,"quoteInvestment":"1000"}' --dry-run
```

#### bot futures_grid adjust_params

Adjust futures grid bot parameters (add investment, modify grid range, etc.).

```bash
pionex-trade-cli bot futures_grid adjust_params --body-json '<JSON>' [--dry-run]
```

**Required fields:**

| Field         | Type    | Description                                                |
| ------------- | ------- | ---------------------------------------------------------- |
| `buOrderId`   | string  | Futures grid bot order ID                                  |
| `type`        | string  | `"invest_in"`, `"adjust_params"`, or `"invest_in_trigger"` |
| `extraMargin` | boolean | Extra margin flag                                          |

**Example:**

```bash
# Add 500 USDT margin to an existing bot
pionex-trade-cli bot futures_grid adjust_params --body-json '{
  "buOrderId": "123456",
  "type": "invest_in",
  "extraMargin": true,
  "quoteInvestment": 500
}'
```

#### bot futures_grid reduce

Reduce futures grid bot positions.

```bash
pionex-trade-cli bot futures_grid reduce --body-json '<JSON>' [--dry-run]
```

| Field       | Type   | Description                                |
| ----------- | ------ | ------------------------------------------ |
| `buOrderId` | string | Futures grid bot order ID                  |
| `reduceNum` | number | Number of positions to reduce (positive integer) |

```bash
pionex-trade-cli bot futures_grid reduce --body-json '{"buOrderId": "123456", "reduceNum": 10}'
```

#### bot futures_grid check_params

Validate futures grid parameters before creating an order. Returns the server-side validation result. When parameters are out of range, a `FailedWithData` error response includes `min_investment`, `max_investment`, and `slippage`.

```bash
pionex-trade-cli bot futures_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'
```

Uses the same `buOrderData` fields as `futures_grid create`.

```bash
pionex-trade-cli bot futures_grid check_params --base BTC --quote USDT --bu-order-data-json '{
  "top": "80000",
  "bottom": "60000",
  "row": 50,
  "grid_type": "arithmetic",
  "trend": "long",
  "leverage": 5,
  "quoteInvestment": "1000"
}'
```

#### bot futures_grid cancel

Cancel and close a futures grid bot order.

```bash
pionex-trade-cli bot futures_grid cancel --bu-order-id <id> [--close-sell-model TO_QUOTE|TO_USDT] [--immediate] [--dry-run]
```

```bash
# Cancel a bot and convert position to USDT
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456 --close-sell-model TO_USDT

# Cancel immediately
pionex-trade-cli bot futures_grid cancel --bu-order-id 123456 --immediate
```

### Spot Grid (Auth Required)

#### bot spot_grid get

Get a spot grid bot order by ID.

```bash
pionex-trade-cli bot spot_grid get --bu-order-id <id>
```

```bash
pionex-trade-cli bot spot_grid get --bu-order-id 123456
```

#### bot spot_grid get_ai_strategy

Get AI-recommended grid parameters for a trading pair.

```bash
pionex-trade-cli bot spot_grid get_ai_strategy --base <BASE> --quote <QUOTE>
```

```bash
pionex-trade-cli bot spot_grid get_ai_strategy --base BTC --quote USDT
```

#### bot spot_grid create

Create a spot grid bot order.

```bash
pionex-trade-cli bot spot_grid create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--note <text>] [--dry-run]
```

* `--base`: Base currency (e.g. `BTC`)
* `--quote`: Quote currency (e.g. `USDT`)
* `--bu-order-data-json`: JSON string containing grid order parameters

**Required fields in `buOrderData`:**

| Field                  | Type    | Description                             |
| ---------------------- | ------- | --------------------------------------- |
| `top`                  | string  | Grid upper price                        |
| `bottom`               | string  | Grid lower price                        |
| `row`                  | integer | Number of grid levels (2–200)           |
| `gridType`             | string  | `"arithmetic"` or `"geometric"`         |
| `quoteTotalInvestment` | string  | Investment amount in quote currency     |

**Optional fields:** `lossStopType`, `lossStop`, `lossStopDelay`, `profitStopType`, `profitStop`, `profitStopDelay`, `condition`, `conditionDirection`, `slippage`, `closeSellModel`

**Examples:**

```bash
# Create a BTC/USDT spot grid
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000",
  "bottom": "90000",
  "row": 50,
  "gridType": "arithmetic",
  "quoteTotalInvestment": "100"
}'

# Dry-run (preview only)
pionex-trade-cli bot spot_grid create --base BTC --quote USDT --bu-order-data-json '{"top":"110000","bottom":"90000","row":50,"gridType":"arithmetic","quoteTotalInvestment":"100"}' --dry-run
```

#### bot spot_grid adjust_params

Adjust spot grid bot range or add investment.

```bash
pionex-trade-cli bot spot_grid adjust_params --bu-order-id <id> [--top <price>] [--bottom <price>] [--row <n>] [--quote-invest <amount>]
```

| Flag              | Description                              |
| ----------------- | ---------------------------------------- |
| `--bu-order-id`   | Required; spot grid bot order ID         |
| `--top`           | New grid upper price                     |
| `--bottom`        | New grid lower price                     |
| `--row`           | New number of grid levels                |
| `--quote-invest`  | Additional quote investment amount       |

```bash
# Add 50 USDT to a running bot
pionex-trade-cli bot spot_grid adjust_params --bu-order-id 123456 --quote-invest 50
```

#### bot spot_grid invest_in

Add additional quote investment to a running spot grid bot.

```bash
pionex-trade-cli bot spot_grid invest_in --bu-order-id <id> --quote-invest <amount>
```

```bash
pionex-trade-cli bot spot_grid invest_in --bu-order-id 123456 --quote-invest 100
```

#### bot spot_grid check_params

Validate spot grid parameters before creating an order. Returns the server-side validation result. When parameters are out of range, a `FailedWithData` error response includes `min_investment`, `max_investment`, and `slippage`.

```bash
pionex-trade-cli bot spot_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'
```

Uses the same `buOrderData` fields as `spot_grid create`.

```bash
pionex-trade-cli bot spot_grid check_params --base BTC --quote USDT --bu-order-data-json '{
  "top": "110000",
  "bottom": "90000",
  "row": 50,
  "gridType": "arithmetic",
  "quoteTotalInvestment": "100"
}'
```

#### bot spot_grid cancel

Cancel and close a spot grid bot order.

```bash
pionex-trade-cli bot spot_grid cancel --bu-order-id <id> [--close-sell-model NOT_SELL|TO_QUOTE|TO_USDT] [--slippage <value>] [--dry-run]
```

```bash
# Cancel and sell base to quote
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456 --close-sell-model TO_QUOTE

# Cancel and keep base (default: NOT_SELL)
pionex-trade-cli bot spot_grid cancel --bu-order-id 123456
```

#### bot spot_grid profit

Extract accumulated grid profit from a spot grid bot.

```bash
pionex-trade-cli bot spot_grid profit --bu-order-id <id> --amount <amount>
```

```bash
pionex-trade-cli bot spot_grid profit --bu-order-id 123456 --amount 10
```

### Smart Copy (Auth Required)

#### bot smart_copy get

Get a smart copy bot order by ID.

```bash
pionex-trade-cli bot smart_copy get --bu-order-id <id>
```

```bash
pionex-trade-cli bot smart_copy get --bu-order-id 123456
```

#### bot smart_copy create

Create a smart copy bot order.

```bash
pionex-trade-cli bot smart_copy create --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>' [--copy-from <id>] [--note <text>] [--dry-run]
```

* `--base`: Base currency (e.g. `BTC`)
* `--quote`: Quote currency (e.g. `USDT`)
* `--bu-order-data-json`: JSON with `quote_total_investment` and `portfolio` array
* `--copy-from`: Source bot order ID to copy settings from

**Required fields in `bu_order_data`:**

| Field                    | Type   | Description                              |
| ------------------------ | ------ | ---------------------------------------- |
| `quote_total_investment` | string | Total investment in quote currency       |
| `portfolio`              | array  | List of signal sources to copy           |

**Each `portfolio` item:**

| Field         | Type    | Description                                          |
| ------------- | ------- | ---------------------------------------------------- |
| `base`        | string  | Base currency for this signal (e.g. `BTC`)           |
| `signal_type` | string  | Signal provider UUID                                 |
| `leverage`    | integer | Leverage multiplier                                  |
| `percent`     | string  | Allocation fraction of total investment (e.g. `"1"` = 100%) |

**Examples:**

```bash
# Create a smart copy bot (dry-run first)
pionex-trade-cli bot smart_copy create --base BTC --quote USDT \
  --bu-order-data-json '{"quote_total_investment":"100","portfolio":[{"base":"BTC","signal_type":"<uuid>","leverage":2,"percent":"1"}]}' \
  --dry-run

# Create the bot (after confirmation)
pionex-trade-cli bot smart_copy create --base BTC --quote USDT \
  --bu-order-data-json '{"quote_total_investment":"100","portfolio":[{"base":"BTC","signal_type":"<uuid>","leverage":2,"percent":"1"}]}'
```

#### bot smart_copy check_params

Validate smart copy parameters before creating an order. Pass `--quote-investment 0` to get the allowed range only. Returns `max_investment`, `max_leverage`, and `available_limit`.

```bash
pionex-trade-cli bot smart_copy check_params --base <BASE> --quote <QUOTE> --leverage <n> --quote-investment <amount> [--signal-type <uuid>]
```

| Flag                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `--base`             | Required; base currency (e.g. `BTC`)                    |
| `--quote`            | Required; quote currency (e.g. `USDT`)                  |
| `--leverage`         | Required; leverage multiplier (e.g. `2`)                |
| `--quote-investment` | Required; investment amount; use `0` to get range only  |
| `--signal-type`      | Optional; signal provider UUID to scope the check       |

```bash
# Get allowed range only
pionex-trade-cli bot smart_copy check_params --base BTC --quote USDT --leverage 2 --quote-investment 0

# Validate specific investment with signal type
pionex-trade-cli bot smart_copy check_params --base BTC --quote USDT --leverage 5 \
  --quote-investment 100 --signal-type <uuid>
```

#### bot smart_copy cancel

Cancel and close a smart copy bot order.

```bash
pionex-trade-cli bot smart_copy cancel --bu-order-id <id> [--close-note <note>] [--convert-into-earn-coin] [--dry-run]
```

| Flag                      | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `--bu-order-id`           | Required; smart copy bot order ID               |
| `--close-note`            | Optional close note                             |
| `--convert-into-earn-coin`| Convert remaining funds into earn coin          |

```bash
# Cancel a smart copy bot
pionex-trade-cli bot smart_copy cancel --bu-order-id 123456

# Cancel and convert funds to earn coin
pionex-trade-cli bot smart_copy cancel --bu-order-id 123456 --convert-into-earn-coin
```

### Signal (Auth Required)

#### bot signal add_listener

Push a trading signal to the Pionex signal platform (for signal providers). The platform forwards the signal to all smart copy bots subscribed to the given `--signal-type`.

```bash
pionex-trade-cli bot signal add_listener --signal-type <uuid> --signal-param <json> \
  --base <BASE> --quote <QUOTE> --time <iso> --price <price> \
  --action <buy|sell> --position-size <size> --contracts <n>
```

| Flag               | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `--signal-type`    | Required; signal provider UUID                                    |
| `--signal-param`   | Required; signal parameters as a JSON string (e.g. `'{}'`)       |
| `--base`           | Required; base currency (e.g. `BTC`)                             |
| `--quote`          | Required; quote currency (e.g. `USDT`)                           |
| `--time`           | Required; signal timestamp in RFC 3339 (e.g. `2024-01-01T12:00:00Z`) |
| `--price`          | Required; current price at time of signal (e.g. `85000`)         |
| `--action`         | Required; `buy` to open a position, `sell` to close              |
| `--position-size`  | Required; target position size as a fraction (e.g. `1` = 100%)   |
| `--contracts`      | Required; number of contracts                                     |

```bash
# Push a buy signal
pionex-trade-cli bot signal add_listener --signal-type <uuid> --signal-param '{}' \
  --base BTC --quote USDT --time 2024-01-01T12:00:00Z --price 85000 \
  --action buy --position-size 1 --contracts 1

# Push a sell signal
pionex-trade-cli bot signal add_listener --signal-type <uuid> --signal-param '{}' \
  --base BTC --quote USDT --time 2024-01-01T13:00:00Z --price 86000 \
  --action sell --position-size 0 --contracts 0
```
