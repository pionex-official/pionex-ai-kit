# @pionex/pionex-trade-mcp

MCP server for Pionex. Reads credentials from **~/.pionex/config.toml** (no env vars needed in client config).

## Claude Desktop — One-Click Install

For Claude Desktop, a `.mcpb` one-click installer is available. Download `pionex-mcp.mcpb` from the [GitHub Releases page](https://github.com/pionex-official/pionex-ai-kit/releases/latest) and double-click to install.

## Install & Setup (npm — Cursor, Windsurf, VS Code, etc.)

1. Create config (if not done yet):  
   `pionex-ai-kit onboard` (from **@pionex/pionex-ai-kit**).

2. Register with your AI client using the CLI:
   ```bash
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode
   pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw
   ```
   Supported: `cursor`, `claude-desktop`, `windsurf`, `vscode`, `claude-code`, `openclaw`.

3. Restart Cursor (or your client).

Credentials are read from `~/.pionex/config.toml` when the server starts; the client config (e.g. `~/.cursor/mcp.json`) only needs a command such as:

```json
{
  "mcpServers": {
    "pionex-trade-mcp": {
      "command": "npx",
      "args": ["-y", "@pionex/pionex-trade-mcp"]
    }
  }
}
```

## Tools

- **Market** (no auth): `pionex_market_get_depth`, `pionex_market_get_trades`, `pionex_market_get_symbol_info`, `pionex_market_get_tickers`, `pionex_market_get_book_tickers`, `pionex_market_get_klines`
- **Wallet** (auth): `pionex_wallet_get_balance`
- **Orders** (auth): `pionex_orders_new_order`, `pionex_orders_get_order`, `pionex_orders_get_order_by_client_order_id`, `pionex_orders_get_open_orders`, `pionex_orders_get_all_orders`, `pionex_orders_cancel_order`, `pionex_orders_get_fills`, `pionex_orders_get_fills_by_order_id`, `pionex_orders_cancel_all_orders`
- **Bot / Futures Grid** (auth): `pionex_bot_futures_grid_get_order`, `pionex_bot_futures_grid_create`, `pionex_bot_futures_grid_adjust_params`, `pionex_bot_futures_grid_reduce`, `pionex_bot_futures_grid_cancel`
- **Bot / Spot Grid** (auth): `pionex_bot_spot_grid_get_order`, `pionex_bot_spot_grid_get_ai_strategy`, `pionex_bot_spot_grid_create`, `pionex_bot_spot_grid_adjust_params`, `pionex_bot_spot_grid_invest_in`, `pionex_bot_spot_grid_cancel`, `pionex_bot_spot_grid_profit`

### `pionex_bot_futures_grid_create` (strict OpenAPI)

Source: [openapi_bot.yaml](https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml) — `CreateFuturesGridRequest` / `CreateFuturesGridOrderData`.

Implementation (JSON Schema + runtime validation): `@pionex-ai/core` → `schemas/futures-grid-create.ts` (exported as `createFuturesGridCreateToolInputSchema`, `parseAndValidateCreateFuturesGridBuOrderData`).

**Tool arguments = `CreateFuturesGridRequest` (+ internal `__dryRun` optional)**

| Field | Required | OpenAPI |
|-------|----------|---------|
| `base` | yes | yes |
| `quote` | yes | yes |
| `buOrderData` | yes | yes |
| `copyFrom` | no | no |
| `copyType` | no | no |
| `copyBotOrderId` | no | no |
| `__dryRun` | no | internal (CLI): preview body without POST |

**`buOrderData` = `CreateFuturesGridOrderData` — only these keys allowed** (`additionalProperties: false` in schema; unknown keys rejected at runtime).

**Required in `buOrderData`:** `top`, `bottom`, `row`, `grid_type`, `trend`, `leverage`, `quoteInvestment`

**Optional in `buOrderData` (if present, types must match YAML):**  
`extraMargin`, `condition`, `conditionDirection`, `lossStopType`, `lossStop`, `lossStopDelay`, `profitStopType`, `profitStop`, `profitStopDelay`, `lossStopHigh`, `shareRatio`, `investCoin`, `investmentFrom`, `uiInvestCoin`, `lossStopLimitPrice`, `lossStopLimitHighPrice`, `profitStopLimitPrice`, `slippage`, `bonusId`, `uiExtraData`, `movingIndicatorType`, `movingIndicatorInterval`, `movingIndicatorParam`, `movingTrailingUpParam`, `cateType`, `movingTop`, `movingBottom`, `enableFollowClosed`


**Handler:** `base` is normalized to `*.PERP` when the futures suffix is missing.

Docs: [Futures Grid API](https://www.pionex.com/docs/api-docs/bot-api/futures-grid)
