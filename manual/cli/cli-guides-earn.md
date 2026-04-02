# Earn Dual Commands

Dual Investment (earn dual) lets you invest in structured products tied to cryptocurrency price targets. All commands follow the pattern `pionex-trade-cli earn dual <command>`.

> **Beta:** The Dual Investment API is currently in Beta. Contact [open@pionex.com](mailto:open@pionex.com) to request access.

**Product ID format:** `{BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}`, where `C` = DUAL_BASE and `P` = DUAL_CURRENCY.

---

### Public Commands (No API Key Required)

#### earn dual symbols

List all trading pairs supported by Dual Investment.

```bash
pionex-trade-cli earn dual symbols [--base <BASE>]
```

```bash
# All supported pairs
pionex-trade-cli earn dual symbols

# Filter by base currency
pionex-trade-cli earn dual symbols --base BTC
```

#### earn dual open-products

List currently open Dual Investment products for a specific pair and direction.

```bash
pionex-trade-cli earn dual open-products --base <BASE> --quote <QUOTE> --type <DUAL_BASE|DUAL_CURRENCY> [--currency <CURRENCY>]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--base` | Yes | Base currency (e.g. `BTC`) |
| `--quote` | Yes | Quote currency. For BTC/ETH use `USDXO`; for others use `USDT`. |
| `--type` | Yes | `DUAL_BASE` (invest in base currency) or `DUAL_CURRENCY` (invest in investment currency) |
| `--currency` | No | Investment currency filter. For BTC/ETH: `USDT` or `USDC`. For others: `USDT`. |

```bash
# BTC/ETH: use quote=USDXO
pionex-trade-cli earn dual open-products --base BTC --quote USDXO --type DUAL_BASE --currency USDT

# Other bases (XRP, etc.): use quote=USDT
pionex-trade-cli earn dual open-products --base XRP --quote USDT --type DUAL_BASE --currency USDT
```

#### earn dual prices

Get latest yield rates and investability status. All three flags are required.

> **Workflow:** Always call this before placing an order. Pass the returned `profit` value unchanged to `earn dual invest`.

```bash
pionex-trade-cli earn dual prices --base <BASE> --quote <QUOTE> --product-ids <id1,id2,...>
```

```bash
# BTC/USDXO pair
pionex-trade-cli earn dual prices --base BTC --quote USDXO --product-ids BTC-USDXO-260402-68000-P-USDT

# Multiple product IDs (comma-separated)
pionex-trade-cli earn dual prices --base ETH --quote USDXO --product-ids ETH-USDXO-260410-3000-C-USDT,ETH-USDXO-260410-2900-C-USDT

# Other base (USDT pair)
pionex-trade-cli earn dual prices --base LRC --quote USDT --product-ids LRC-USDT-260410-0.03-C-USDT,LRC-USDT-260410-0.02-C-USDT
```

#### earn dual index

Get real-time index price for an underlying asset. Both flags are required.

```bash
pionex-trade-cli earn dual index --base <BASE> --quote <QUOTE>
```

```bash
# BTC/USDXO
pionex-trade-cli earn dual index --base BTC --quote USDXO

# Other base
pionex-trade-cli earn dual index --base LRC --quote USDT
```

#### earn dual delivery-prices

Get historical settlement delivery prices. `--base` is required.

```bash
pionex-trade-cli earn dual delivery-prices --base <BASE> [--quote <QUOTE>] [--start-time <ms>] [--end-time <ms>]
```

```bash
# BTC/USDXO
pionex-trade-cli earn dual delivery-prices --base BTC --quote USDXO

# Other base
pionex-trade-cli earn dual delivery-prices --base XRP --quote USDT
```

---

### Authenticated Commands (API Key Required)

#### earn dual balances

Get your Dual Investment account balances. Requires `Enable reading` permission.

```bash
pionex-trade-cli earn dual balances [--merge]
```

`--merge`: when set, merges balances with the same coin across different base currencies.

#### earn dual records

Get your Dual Investment history. `--base` and `--end-time` are required. Requires `Enable reading` permission.

```bash
pionex-trade-cli earn dual records --base <BASE> --end-time <ms> [--quote <QUOTE>] [--currency <CURRENCY>] [--limit <N>] [--start-time <ms>]
```

```bash
pionex-trade-cli earn dual records --base BTC --quote USDXO --end-time 1775027817297 --limit 20
```

#### earn dual get-invests

Batch query investment orders by client order IDs. Requires `Enable reading` permission.

```bash
pionex-trade-cli earn dual get-invests [--base <BASE>] --client-dual-ids <id1,id2,...>
```

```bash
pionex-trade-cli earn dual get-invests --base BTC --client-dual-ids my-order-001,my-order-002
```

---

### Write Commands (`Earn` Permission Required)

All write commands support `--dry-run` to preview the request without executing.

#### earn dual invest

Create a new Dual Investment order.

```bash
pionex-trade-cli earn dual invest \
  --base <BASE> \
  --product-id <PRODUCT_ID> \
  [--client-dual-id <ID>] \
  (--base-amount <N> | --currency-amount <N>) \
  --profit <RATE> \
  [--dry-run]
```

| Flag | Required | Description |
|------|----------|-------------|
| `--base` | Yes | Base currency (e.g. `BTC`) |
| `--product-id` | Recommended | Product ID from `open-products` |
| `--client-dual-id` | Recommended | Your own order ID (idempotency key) |
| `--base-amount` | One of these | Investment amount in base currency |
| `--currency-amount` | One of these | Investment amount in investment currency |
| `--profit` | Yes | Current yield rate from `prices` (must be passed unchanged) |

**Example:**

```bash
# Step 1: Get current prices
pionex-trade-cli earn dual prices \
  --base BTC \
  --quote USDXO \
  --product-ids BTC-USDXO-260402-68000-P-USDT

# Step 2: Preview
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0039 \
  --dry-run

# Step 3: Submit
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0039
```

#### earn dual revoke-invest

Revoke a pending investment order (before it is matched). All three flags are required.

```bash
pionex-trade-cli earn dual revoke-invest \
  --base <BASE> \
  --product-id <PRODUCT_ID> \
  --client-dual-id <ID> \
  [--dry-run]
```

```bash
pionex-trade-cli earn dual revoke-invest \
  --base BTC \
  --product-id BTC-USDXO-260402-68000-P-USDT \
  --client-dual-id my-order-001
```

#### earn dual collect

Collect settled Dual Investment earnings into your spot account. All three flags are required.

```bash
pionex-trade-cli earn dual collect \
  --base <BASE> \
  --client-dual-id <ID> \
  --product-id <PRODUCT_ID> \
  [--dry-run]
```

```bash
pionex-trade-cli earn dual collect \
  --base BTC \
  --client-dual-id my-order-001 \
  --product-id BTC-USDXO-260402-68000-P-USDT
```
