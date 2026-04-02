# Earn Dual Skills

The `pionex-earn-dual` skill guides AI agents through Dual Investment operations on Pionex using `pionex-trade-cli earn dual` commands.

> **Note:** The `pionex-earn-dual` skill will be available in the `pionex-official/pionex-skills` repository. Install with:
> ```bash
> npx skills add pionex-official/pionex-skills
> ```

---

### What this skill covers

| Operation | Command | Auth |
|-----------|---------|------|
| Query supported pairs | `earn dual symbols` | No |
| Browse open products | `earn dual open-products` | No |
| Check yield rates | `earn dual prices` | No |
| Get index price | `earn dual index` | No |
| Historical delivery prices | `earn dual delivery-prices` | No |
| My balances | `earn dual balances` | Yes (`Enable reading`) |
| Query my orders | `earn dual get-invests` | Yes (`Enable reading`) |
| Investment history | `earn dual records` | Yes (`Enable reading`) |
| Create investment | `earn dual invest` | Yes (`Earn`) |
| Revoke investment | `earn dual revoke-invest` | Yes (`Earn`) |
| Collect earnings | `earn dual collect` | Yes (`Earn`) |

---

### Typical Workflow

#### Step 1 — Discover products

```bash
# What pairs are available?
pionex-trade-cli earn dual symbols --base BTC

# What UP products are open for BTC/USDT?
pionex-trade-cli earn dual open-products --base BTC --quote USDT --type UP
```

#### Step 2 — Check current yield rates

```bash
# Check yield for all BTC/USDT products
pionex-trade-cli earn dual prices --base BTC --quote USDT

# Check the real-time BTC index price
pionex-trade-cli earn dual index --base BTC --quote USDT
```

#### Step 3 — Check available balance

```bash
pionex-trade-cli earn dual balances
```

#### Step 4 — Invest (dry-run first)

```bash
# Preview
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDT-260402-70000-C-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0215 \
  --dry-run

# Execute
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDT-260402-70000-C-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0215
```

#### Step 5 — Collect settled earnings

```bash
pionex-trade-cli earn dual collect --base BTC --client-dual-id my-order-001
```

---

### Risk Controls

* Always check the current yield rate via `prices` before investing — the `profit` value must match.
* Use `--dry-run` before executing `invest`, `revoke-invest`, or `collect`.
* Verify available balance with `balances` before placing an investment.
* Check `open-products` to confirm the product has `expired: false` before investing.
