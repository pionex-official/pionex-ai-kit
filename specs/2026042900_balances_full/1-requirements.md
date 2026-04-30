# Requirements — balances_full

## Iteration ID

`2026042900_balances_full`

## Background

Pionex backend added `GET /api/v1/balancesFull` — a comprehensive account overview
returning spot (Bot Account) and futures (Trader Account) balances in a single call,
together with per-coin price info and USDT/BTC total valuations.

This mirrors the same auth tier as the existing `GET /api/v1/account/balances` endpoint
(Bearer token, `multiple_openapi` authorization type downstream).

## Change Description

| Area | Before | After |
|------|--------|-------|
| Core tools | `account` module has only `pionex_account_get_balance` | Add `pionex_account_get_balance_full` |
| CLI | `account balance` only | Add `account balance_full` sub-command |
| MCP | `account` module exposes one tool | Exposes two tools |
| Docs | No balancesFull entry | README, tech docs, API overview updated |

## Acceptance Criteria

1. `pionex_account_get_balance_full` tool callable via MCP with no arguments
2. `pionex-trade-cli account balance_full` prints JSON response to stdout
3. Fish/bash tab completion includes `balance_full` under `account`
4. `docs/tech-api-overview.yaml` has `GET /api/v1/balancesFull` entry with full schema
5. Build passes (`npm run build`)
