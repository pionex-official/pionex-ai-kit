# Requirements: Bot Grid Check Params

**Iteration ID:** `2026040700_bot_grid_check_params`
**Date:** 2026-04-07
**Reference:** https://github.com/pionex-official/pionex-open-api/pull/13

## Background

Pionex Open API PR #13 adds two new endpoints for validating grid bot parameters before actually creating an order:

- `POST /api/v1/bot/orders/futuresGrid/checkParams`
- `POST /api/v1/bot/orders/spotGrid/checkParams`

These endpoints accept the same request body as the corresponding `create` endpoints, perform server-side validation (price precision, grid spacing, investment thresholds, liquidation risk, etc.), and return either a success or a structured error response. When the error type is `FailedWithData`, the response includes `min_investment`, `max_investment`, and `slippage` to guide the user toward valid inputs.

## Goals

Expose these two validation endpoints in the Pionex AI Kit so that AI agents and CLI users can:
1. Pre-validate parameters before committing to an order creation.
2. Receive actionable suggestions (e.g., the valid investment range) when parameters are out of range.

## Changes Before / After

| Before | After |
|--------|-------|
| No pre-validation API; only learn of errors after attempting `create` | Two dedicated `check_params` tools/commands that return server-side validation results |

## New Tools (MCP)

| Tool Name | Endpoint | Auth | isWrite |
|-----------|----------|------|---------|
| `pionex_bot_futures_grid_check_params` | `POST /api/v1/bot/orders/futuresGrid/checkParams` | Yes | `false` (no order created) |
| `pionex_bot_spot_grid_check_params` | `POST /api/v1/bot/orders/spotGrid/checkParams` | Yes | `false` (no order created) |

## New CLI Commands

| Command | Description |
|---------|-------------|
| `pionex-trade-cli bot futures_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | Validate futures grid params |
| `pionex-trade-cli bot spot_grid check_params --base <BASE> --quote <QUOTE> --bu-order-data-json '<JSON>'` | Validate spot grid params |

## Response Behavior

- **Success:** Returns server validation result (parameters are valid).
- **FailedWithData error:** The API returns an error payload that may include `min_investment`, `max_investment`, `slippage` — useful for displaying valid investment ranges to users.

## Acceptance Criteria

1. `pionex_bot_futures_grid_check_params` calls `POST /api/v1/bot/orders/futuresGrid/checkParams` with the same buOrderData validation as `futures_grid_create`
2. `pionex_bot_spot_grid_check_params` calls `POST /api/v1/bot/orders/spotGrid/checkParams` with the same buOrderData validation as `spot_grid_create`
3. Both tools work in read-only mode (isWrite = false)
4. CLI commands are added to both futures_grid and spot_grid subgroups
5. Completion tree updated with `check_params`
6. Manual docs updated in English, Simplified Chinese, and Traditional Chinese (CLI + MCP sections)
7. docs/ overview updated (requirements-overview.md, tech-design-overview.md)

## Out of Scope

- Skills guide updates (will be added separately by the user)
- No schema changes to existing buOrderData (reuse existing schemas)
