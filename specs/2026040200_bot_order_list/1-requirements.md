# Requirements: Bot Futures Grid Order List

## Background

The bot module currently supports single-order lookup (`pionex_bot_futures_grid_get_order`), but has no way to list or paginate through all futures grid bot orders. Users need to be able to query running/finished orders in bulk, filter by symbol, and paginate through results.

## Source

- GitHub PR: https://github.com/pionex-official/pionex-open-api/pull/10/changes
- Upstream API: `GET /api/v1/bot/orders` (new endpoint)
- Branch context: `13-feature-request-add-endpoint-to-list-all-futures-grid-bot-orders`

## Requirements

### Functional

1. **New MCP tool** `pionex_bot_futures_grid_order_list` that calls `GET /api/v1/bot/orders`
2. **New CLI command** `pionex-trade-cli bot futures_grid list` wrapping the tool
3. **Pagination support** via `pageToken` / `nextPageToken` / `previousPageToken`
4. **Filter support**: status (running/finished), base, quote, buOrderTypes

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | string | No | `"running"` | `"running"` or `"finished"` |
| `base` | string | No | — | Base currency filter (e.g. `BTC`) |
| `quote` | string | No | — | Quote currency filter (e.g. `USDT`) |
| `pageToken` | string | No | — | Pagination cursor from previous response |
| `buOrderTypes` | array | No | `["futures_grid"]` | Order type filter |

### Response shape

```json
{
  "nextPageToken": "...",
  "previousPageToken": "...",
  "results": [
    {
      "buOrderType": "futures_grid",
      "buOrderId": "...",
      "userId": "...",
      "keyId": "...",
      "exchange": "...",
      "base": "BTC",
      "quote": "USDT",
      "status": "running",
      "createTime": 1700000000000,
      "closeTime": null,
      "copyFrom": null,
      "copyType": null,
      "strategyId": null,
      "note": null,
      "closeNote": null,
      "customizeName": null,
      "botName": "...",
      "groupId": null,
      "copyBotOrderId": null,
      "buOrderData": {}
    }
  ]
}
```

### Documentation

All three manual variants (en / zh-hans / zh-hant) must be updated:
- `manual/mcp/mcp-guides-bot.md`
- `manual/cli/cli-guides-bot.md`
- `manual.zh-hans/mcp/mcp-guides-bot.md`
- `manual.zh-hans/cli/cli-guides-bot.md`
- `manual.zh-hant/mcp/mcp-guides-bot.md`
- `manual.zh-hant/cli/cli-guides-bot.md`
- `README.md` tool table (bot section)
- `docs/` overview files

## Acceptance Criteria

1. `pionex_bot_futures_grid_order_list` tool is callable via MCP and returns paginated results
2. `pionex-trade-cli bot futures_grid list` works with all optional flags
3. Default `buOrderTypes` is `["futures_grid"]` (can be overridden)
4. All three language manuals updated
5. Build passes (`npm run build`)
