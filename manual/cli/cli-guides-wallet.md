# Wallet Commands

### Wallet Commands (Auth Required)

#### wallet balance_full

Get a full account overview — spot (Bot Account) and futures (Trader Account) balances, per-coin prices, and total USDT/BTC valuations in one call.

```bash
pionex-trade-cli wallet balance_full [--app-lang <lang>] [--sys-lang <lang>]
```

| Option | Description |
| --- | --- |
| `--app-lang` | App language, e.g. `en` or `zh` (overrides `--sys-lang`) |
| `--sys-lang` | System language fallback |

**Examples:**

```bash
pionex-trade-cli wallet balance_full
pionex-trade-cli wallet balance_full --app-lang en
```
