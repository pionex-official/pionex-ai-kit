# Technical Design: Bot Futures Grid Order List

## Affected Files

| File | Change |
|---|---|
| `packages/core/src/tools/bot.ts` | Add `pionex_bot_futures_grid_order_list` tool |
| `packages/cli/src/index.ts` | Add `list` command under `bot futures_grid` |
| `manual/mcp/mcp-guides-bot.md` | Add tool to table |
| `manual/cli/cli-guides-bot.md` | Add `list` command docs |
| `manual.zh-hans/mcp/mcp-guides-bot.md` | Same, zh-hans |
| `manual.zh-hans/cli/cli-guides-bot.md` | Same, zh-hans |
| `manual.zh-hant/mcp/mcp-guides-bot.md` | Same, zh-hant |
| `manual.zh-hant/cli/cli-guides-bot.md` | Same, zh-hant |
| `docs/requirements-overview.md` | Add iteration entry |
| `docs/tech-memory-overview.md` | Add iteration entry |

## Tool Definition (`packages/core/src/tools/bot.ts`)

Insert before the closing `];` of `registerBotTools()`:

```typescript
{
  name: "pionex_bot_futures_grid_order_list",
  module: "bot",
  isWrite: false,
  description:
    "List futures grid bot orders with optional filters. " +
    "Supports pagination via pageToken. " +
    "status: 'running' (default) or 'canceled'. " +
    "Endpoint: GET /api/v1/bot/orders",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      status: {
        type: "string",
        enum: ["running", "canceled"],
        description: "Filter by order status. Default: 'running'.",
      },
      base: { type: "string", description: "Base currency filter (e.g. BTC)." },
      quote: { type: "string", description: "Quote currency filter (e.g. USDT)." },
      pageToken: { type: "string", description: "Pagination token from a previous response." },
      buOrderTypes: {
        type: "array",
        items: { type: "string" },
        description: "Order type filter. Default: ['futures_grid'].",
      },
    },
    required: [],
  },
  async handler(args, { client }) {
    const q: QueryParams = {};
    if (args.status != null) q.status = String(args.status);
    if (args.base != null) q.base = String(args.base);
    if (args.quote != null) q.quote = String(args.quote);
    if (args.pageToken != null) q.pageToken = String(args.pageToken);
    // buOrderTypes is an array — serialize as repeated key or comma-separated per Pionex convention
    const types =
      Array.isArray(args.buOrderTypes) && args.buOrderTypes.length > 0
        ? args.buOrderTypes
        : ["futures_grid"];
    q.buOrderTypes = types.join(",");
    return (await client.signedGet("/api/v1/bot/orders", q)).data;
  },
},
```

## CLI Handler (`packages/cli/src/index.ts`)

Insert after the `if (command === "get") { ... }` block inside `if (group === "bot")`:

```typescript
if (command === "list") {
  const status = typeof flags.status === "string" ? flags.status : undefined;
  const base = typeof flags.base === "string" ? flags.base : undefined;
  const quote = typeof flags.quote === "string" ? flags.quote : undefined;
  const pageToken =
    typeof flags["page-token"] === "string"
      ? (flags["page-token"] as string)
      : typeof flags.pageToken === "string"
        ? (flags.pageToken as string)
        : undefined;
  const buOrderTypesRaw =
    typeof flags["bu-order-types"] === "string"
      ? (flags["bu-order-types"] as string)
      : typeof flags.buOrderTypes === "string"
        ? (flags.buOrderTypes as string)
        : undefined;
  const buOrderTypes = buOrderTypesRaw
    ? buOrderTypesRaw.split(",").map((s) => s.trim())
    : undefined;
  const out = await runTool("pionex_bot_futures_grid_order_list", {
    status,
    base,
    quote,
    pageToken,
    buOrderTypes,
  });
  process.stdout.write(JSON.stringify(out.data, null, 2) + "\n");
  return;
}
```

Also update the error message at the end of `if (group === "bot")` block to include `list`:

```typescript
throw new Error(`Unknown futures_grid command: ${command}. Available: get, list, create, adjust_params, reduce, cancel`);
```

And update the help text in `printPionexHelp()`:

```
  pionex-trade-cli bot futures_grid list [--status running|canceled] [--base BTC] [--quote USDT] [--page-token <token>] [--bu-order-types futures_grid,grid_v5]
```

## buOrderTypes serialization note

The Pionex API accepts `buOrderTypes` as a repeated query parameter (e.g. `buOrderTypes=futures_grid&buOrderTypes=grid_v5`). However, `URLSearchParams.set()` only sets one value. If the API requires repeated params, use `append`. For now, we serialize as a single comma-separated value — if Pionex rejects it, switch to `append` per key in `buildQueryString`.

Actually, looking at the `buildQueryString` implementation:

```typescript
function buildQueryString(query?: QueryParams): string {
  ...
  const params = new URLSearchParams();
  for (const [k, v] of entries) params.set(k, String(v));
  return params.toString();
}
```

It converts every value to `String(v)` — so passing a comma-joined string like `"futures_grid,grid_v5"` is the safe approach until we know the API's exact expectation. This can be revisited if needed.
