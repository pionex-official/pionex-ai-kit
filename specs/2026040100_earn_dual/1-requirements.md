# Requirements — Earn Dual Investment

**Iteration:** `2026040100_earn_dual`
**Date:** 2026-04-01
**Status:** Planning

## Background

Pionex provides a Dual Investment (双向理财) product that allows users to invest in structured products tied to cryptocurrency price targets. This iteration adds Dual Investment support to both the MCP server and CLI.

## Change: Before → After

| Dimension | Before | After |
|-----------|--------|-------|
| MCP tools | No earn/dual tools | 11 dual investment tools |
| CLI groups | `market`, `account`, `orders`, `bot` | + `earn dual` sub-group |
| Modules | `market`, `account`, `orders`, `bot` | + `earn_dual` |
| REST client | `signedGet`, `signedPost`, `signedDelete` | + `signedDeleteQuery` (query-only DELETE) |

## API Reference

Source: `/Users/liyifan/project/mcp/pionex-open-api/openapi_earn_dual.yaml`
Base URL: `https://api.pionex.com`

### Public Endpoints (no auth)

| Operation | Endpoint |
|-----------|----------|
| List supported pairs | `GET /api/v1/earn/dual/symbols` |
| List open products | `GET /api/v1/earn/dual/openProducts` |
| Get product prices | `GET /api/v1/earn/dual/prices` |
| Get index price | `GET /api/v1/earn/dual/index` |
| Get delivery prices | `GET /api/v1/earn/dual/deliveryPrices` |

### Authenticated Endpoints (View permission)

| Operation | Endpoint |
|-----------|----------|
| Get user balances | `GET /api/v1/earn/dual/balances` |
| Batch query orders | `POST /api/v1/earn/dual/invests` |
| Get investment history | `GET /api/v1/earn/dual/records` |

### Authenticated Endpoints (Earn permission — write)

| Operation | Endpoint |
|-----------|----------|
| Create investment order | `POST /api/v1/earn/dual/invest` |
| Revoke investment order | `DELETE /api/v1/earn/dual/invest` (query params) |
| Collect settled earnings | `POST /api/v1/earn/dual/collect` |

## CLI Command Design

```
pionex-trade-cli earn dual symbols [--base BTC]
pionex-trade-cli earn dual open-products --base BTC --quote USDT --type UP|DOWN [--currency USDT]
pionex-trade-cli earn dual prices [--base BTC --quote USDT] [--product-ids id1,id2]
pionex-trade-cli earn dual index [--base BTC --quote USDT]
pionex-trade-cli earn dual delivery-prices [--base BTC --quote USDT] [--start-time ms] [--end-time ms]
pionex-trade-cli earn dual balances [--merge]
pionex-trade-cli earn dual records --base BTC [--quote USDT] [--currency USDT] [--limit 20] [--start-time ms] [--end-time ms]
pionex-trade-cli earn dual get-invests --base BTC --client-dual-ids id1,id2
pionex-trade-cli earn dual invest --base BTC --product-id <id> [--client-dual-id <id>] (--base-amount <n> | --currency-amount <n>) --profit <n>
pionex-trade-cli earn dual revoke-invest [--base BTC] [--client-dual-id <id>] [--product-id <id>] [--dry-run]
pionex-trade-cli earn dual collect [--base BTC] [--client-dual-id <id>] [--product-id <id>] [--dry-run]
```

## Acceptance Criteria

1. All 11 MCP tools are registered and callable via MCP clients
2. All 11 CLI commands work correctly
3. Write operations (`invest`, `revoke-invest`, `collect`) support `--dry-run`
4. `earn_dual` module can be enabled/disabled via `--modules` flag
5. Public tools work without API credentials; auth tools fail gracefully with clear error
6. Build succeeds: `npm run build`
