# Requirements: Bot Spot Grid

## Background

The Pionex OpenAPI PR #7 adds spot grid bot endpoints to `openapi_bot.yaml`. This iteration exposes those endpoints as MCP tools under the `bot` module.

## Scope

Add 7 MCP tools for spot grid bot operations, all under `module: "bot"` with `pionex_bot_spot_grid_*` naming (all underscores).

## Tools

| Tool Name | Method | Endpoint | Write |
|-----------|--------|----------|-------|
| `pionex_bot_spot_grid_get_order` | GET | `/api/v1/bot/orders/spotGrid/order` | No |
| `pionex_bot_spot_grid_get_ai_strategy` | GET | `/api/v1/bot/orders/spotGrid/aiStrategy` | No |
| `pionex_bot_spot_grid_create` | POST | `/api/v1/bot/orders/spotGrid/create` | Yes |
| `pionex_bot_spot_grid_adjust_params` | POST | `/api/v1/bot/orders/spotGrid/adjustParams` | Yes |
| `pionex_bot_spot_grid_invest_in` | POST | `/api/v1/bot/orders/spotGrid/investIn` | Yes |
| `pionex_bot_spot_grid_cancel` | POST | `/api/v1/bot/orders/spotGrid/cancel` | Yes |
| `pionex_bot_spot_grid_profit` | POST | `/api/v1/bot/orders/spotGrid/profit` | Yes |

## Acceptance Criteria

- All 7 tools appear in the bot module tool list
- Tool names use underscores only (no hyphens)
- `create` validates `buOrderData` with strict schema (unknown keys rejected)
- Write tools respect `config.readOnly` guard
- Build passes without TypeScript errors
