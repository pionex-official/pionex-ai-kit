# Wallet Tools

### Wallet Tools (API Key Required)

| Tool                              | Description                                                          |
| --------------------------------- | -------------------------------------------------------------------- |
| `pionex_wallet_get_balance_full`  | Full account overview — spot + futures, coin prices, USDT/BTC totals |

---

### `pionex_wallet_get_balance_full`

Returns a comprehensive account overview including:
- Spot (Bot Account) balances by category
- Futures (Trader Account) balances, positions, and risk state
- Per-coin price info (USD/BTC price, 24h change, full name)
- Total USDT and BTC valuations across all accounts

**Input parameters (all optional):**

| Parameter  | Type   | Description                                        |
| ---------- | ------ | -------------------------------------------------- |
| `appLang`  | string | App language, e.g. `en` or `zh` (overrides sysLang) |
| `sysLang`  | string | System language fallback                           |

**Example prompts:**
> "Use the Pionex tools to show my full wallet overview."  
> "What's my total account value in USDT?"  
> "Show me my futures account balance and positions."
