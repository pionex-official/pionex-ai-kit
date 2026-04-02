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
