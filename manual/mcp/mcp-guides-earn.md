# Earn Dual Tools

Dual Investment tools (`earn_dual` module) expose the Pionex Dual Investment API as MCP tools.

> **Beta:** The Dual Investment API is currently in Beta. Contact [open@pionex.com](mailto:open@pionex.com) to request access.

---

### Public Tools (No API Key Required)

#### `pionex_earn_dual_symbols`

List all trading pairs supported by Dual Investment.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | No | Base currency filter (e.g. `BTC`). Omit to return all. |

#### `pionex_earn_dual_open_products`

List currently open products for a specific pair and direction.

Product ID format: `{BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}`, where `C` = DUAL_BASE, `P` = DUAL_CURRENCY.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency (e.g. `BTC`) |
| `quote` | Yes | Quote currency. For BTC/ETH use `USDXO`; for others use `USDT`. |
| `type` | Yes | `DUAL_BASE` (invest in base currency) or `DUAL_CURRENCY` (invest in investment currency) |
| `currency` | No | Investment currency filter. For BTC/ETH: `USDT` or `USDC`. For others: `USDT`. |

#### `pionex_earn_dual_prices`

Get latest yield rates and investability. All three parameters are required.

> **Workflow:** Always call this before placing an order. The `profit` value returned here must be passed unchanged to `pionex_earn_dual_invest`.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency (e.g. `BTC`, `ETH`, `LRC`) |
| `quote` | Yes | Quote currency. Use `USDXO` for BTC/ETH; use `USDT` for others. |
| `productIds` | Yes | Array of product IDs from `pionex_earn_dual_open_products`. |

#### `pionex_earn_dual_index`

Get real-time index price for an underlying asset. Both parameters are required.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency (e.g. `BTC`, `LRC`) |
| `quote` | Yes | Quote currency. Use `USDXO` for BTC/ETH; use `USDT` for others. |

#### `pionex_earn_dual_delivery_prices`

Get historical settlement delivery prices. `base` is required.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency (e.g. `BTC`, `XRP`) |
| `quote` | No | Quote currency filter. Use `USDXO` for BTC/ETH; use `USDT` for others. |
| `startTime` | No | Start timestamp in milliseconds |
| `endTime` | No | End timestamp in milliseconds |

---

### Authenticated Tools — Enable Reading Permission

#### `pionex_earn_dual_balances`

Get Dual Investment account balances.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `merge` | No | Merge same-coin balances across different base currencies |

#### `pionex_earn_dual_get_invests`

Batch query investment orders by client order IDs.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | No | Base currency |
| `clientDualIds` | No | Array of client-assigned order IDs |

#### `pionex_earn_dual_records`

Get paginated investment history. `base` and `endTime` are required.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency |
| `endTime` | Yes | End timestamp in milliseconds |
| `quote` | No | Quote currency filter |
| `currency` | No | Investment currency filter |
| `filter` | No | Status filter |
| `startTime` | No | Start timestamp in milliseconds |
| `limit` | No | Max records per page |

---

### Authenticated Tools — Earn Permission (Write)

#### `pionex_earn_dual_invest`

Create a new Dual Investment order.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency |
| `productId` | Recommended | Product ID from `pionex_earn_dual_open_products` |
| `clientDualId` | Recommended | Your idempotency key |
| `baseAmount` | One of | Investment in base currency |
| `currencyAmount` | One of | Investment in investment currency |
| `profit` | Yes | Current yield rate from `pionex_earn_dual_prices` (must be passed unchanged) |

#### `pionex_earn_dual_revoke_invest`

Revoke a pending investment order. All three parameters are required.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency |
| `productId` | Yes | Product ID of the order to revoke |
| `clientDualId` | Yes | Client-assigned order ID |

#### `pionex_earn_dual_collect`

Collect settled earnings into spot account. All three parameters are required.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `base` | Yes | Base currency |
| `clientDualId` | Yes | Client-assigned order ID |
| `productId` | Yes | Product ID |

---

### Example Prompts

```
"Use the Pionex tools to list all open BTC dual investment products for DUAL_BASE direction."
"Use the Pionex tools to get the current yield rate for BTC/USDXO dual investment product BTC-USDXO-260410-70000-C-USDT."
"Use the Pionex tools to show the real-time BTC/USDXO index price for dual investment."
"Use the Pionex tools to check my dual investment balance."
"Use the Pionex tools to invest 100 USDT in product BTC-USDXO-260402-68000-P-USDT with the current profit rate."
"Use the Pionex tools to revoke my pending dual investment order my-order-001."
"Use the Pionex tools to collect my settled dual investment earnings."
"Use the Pionex tools to show my dual investment history for BTC."
```
