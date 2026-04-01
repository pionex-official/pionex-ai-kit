# Technical Design — Earn Dual Investment

**Iteration:** `2026040100_earn_dual`

## Architecture Overview

Follow the existing three-layer pattern: Core tools → MCP server auto-picks them up → CLI routes to them.

The `earn dual` group in CLI mirrors how `bot futures_grid` works:
- `positionals[0]` = `"earn"`
- `positionals[1]` = `"dual"` (sub-route)
- `positionals[2]` = command

## Files to Change

### 1. `packages/core/src/constants.ts`

Add `earn_dual` to the module registry:

```typescript
export const MODULES = ["market", "account", "orders", "bot", "earn_dual"] as const;
export type ModuleId = (typeof MODULES)[number];

export const DEFAULT_MODULES: ModuleId[] = ["market", "account", "orders", "bot", "earn_dual"];
```

### 2. `packages/core/src/client/rest-client.ts`

Add `signedDeleteQuery` method for DELETE endpoints that pass params in query string (not body):

```typescript
public async signedDeleteQuery<TData = unknown>(path: string, query: QueryParams = {}): Promise<RequestResult<TData>> {
  const { url, headers } = buildSignedRequest(this.config, "DELETE", path, query, null);
  const endpoint = `${path}?${buildQueryString({ ...query, timestamp: "..." })}`;
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const txt = await readTextSafe(res);
    throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path, responseText: txt });
  }
  const data = (await res.json()) as TData;
  return { endpoint: path, requestTime: new Date().toISOString(), data };
}
```

Why: `DELETE /api/v1/earn/dual/invest` uses query params (not body), unlike the existing `signedDelete` which puts params in the request body.

### 3. `packages/core/src/tools/earn-dual.ts` (new file)

11 tools in module `earn_dual`:

| Tool name | Method | Endpoint | isWrite | Auth |
|-----------|--------|----------|---------|------|
| `pionex_earn_dual_symbols` | publicGet | `/api/v1/earn/dual/symbols` | false | No |
| `pionex_earn_dual_open_products` | publicGet | `/api/v1/earn/dual/openProducts` | false | No |
| `pionex_earn_dual_prices` | publicGet | `/api/v1/earn/dual/prices` | false | No |
| `pionex_earn_dual_index` | publicGet | `/api/v1/earn/dual/index` | false | No |
| `pionex_earn_dual_delivery_prices` | publicGet | `/api/v1/earn/dual/deliveryPrices` | false | No |
| `pionex_earn_dual_balances` | signedGet | `/api/v1/earn/dual/balances` | false | View |
| `pionex_earn_dual_get_invests` | signedPost | `/api/v1/earn/dual/invests` | false | View |
| `pionex_earn_dual_records` | signedGet | `/api/v1/earn/dual/records` | false | View |
| `pionex_earn_dual_invest` | signedPost | `/api/v1/earn/dual/invest` | **true** | Earn |
| `pionex_earn_dual_revoke_invest` | signedDeleteQuery | `/api/v1/earn/dual/invest` | **true** | Earn |
| `pionex_earn_dual_collect` | signedPost | `/api/v1/earn/dual/collect` | **true** | Earn |

Tool structure example:

```typescript
import type { ToolSpec } from "./types.js";

export function registerEarnDualTools(): ToolSpec[] {
  return [
    {
      name: "pionex_earn_dual_symbols",
      module: "earn_dual",
      isWrite: false,
      description: "List all trading pairs supported by Dual Investment, optionally filtered by base currency.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          base: { type: "string", description: "Base currency filter (e.g. BTC, ETH). Omit to return all." },
        },
      },
      async handler(args, { client }) {
        const base = args.base as string | undefined;
        return (await client.publicGet("/api/v1/earn/dual/symbols", base ? { base } : {})).data;
      },
    },
    // ... (10 more tools)
  ];
}
```

### 4. `packages/core/src/tools/index.ts`

Register the new module:

```typescript
import { registerEarnDualTools } from "./earn-dual.js";

function allToolSpecs(): ToolSpec[] {
  return [
    ...registerMarketTools(),
    ...registerAccountTools(),
    ...registerOrdersTools(),
    ...registerBotTools(),
    ...registerEarnDualTools(),   // <-- add
  ];
}
```

### 5. `packages/cli/src/index.ts`

Two changes:

**a) Update `printPionexHelp()`** — add `earn` to Groups and examples:

```
  earn     Dual Investment (earn dual <command>)
```

Examples:
```
  pionex-trade-cli earn dual symbols --base BTC
  pionex-trade-cli earn dual open-products --base BTC --quote USDT --type UP
  pionex-trade-cli earn dual prices --base BTC --quote USDT
  pionex-trade-cli earn dual invest --base BTC --product-id BTC-USDT-... --currency-amount 100 --profit 0.0215
  pionex-trade-cli earn dual revoke-invest --base BTC --client-dual-id my-order-001
  pionex-trade-cli earn dual collect --base BTC --client-dual-id my-order-001
```

**b) Add `earn` group handler in `runPionexCommand()`**:

The structure mirrors the `bot` group pattern — `earn dual <command>`:

```typescript
if (group === "earn") {
  const earnRoute = positionals[1];
  if (!earnRoute || earnRoute !== "dual") {
    throw new Error(`Missing or unknown earn route: ${earnRoute ?? "(none)"}. Use: pionex-trade-cli earn dual <command>`);
  }
  if (!command) {
    throw new Error("Missing earn dual command. Example: pionex-trade-cli earn dual symbols");
  }
  // command handlers...
}
```

Command routing in `earn dual`:

| CLI command | Tool called | Notes |
|-------------|-------------|-------|
| `symbols` | `pionex_earn_dual_symbols` | `--base` optional |
| `open-products` | `pionex_earn_dual_open_products` | `--base`, `--quote`, `--type` required |
| `prices` | `pionex_earn_dual_prices` | `--base`+`--quote` OR `--product-ids` |
| `index` | `pionex_earn_dual_index` | `--base`, `--quote` optional |
| `delivery-prices` | `pionex_earn_dual_delivery_prices` | `--base`, `--quote` optional; `--start-time`, `--end-time` ms |
| `balances` | `pionex_earn_dual_balances` | `--merge` boolean optional |
| `get-invests` | `pionex_earn_dual_get_invests` | `--base`, `--client-dual-ids` comma-separated |
| `records` | `pionex_earn_dual_records` | `--base` required; others optional |
| `invest` | `pionex_earn_dual_invest` | `--base`, `--product-id`, `--profit` required; `--base-amount` OR `--currency-amount` |
| `revoke-invest` | `pionex_earn_dual_revoke_invest` | `--dry-run` supported |
| `collect` | `pionex_earn_dual_collect` | `--dry-run` supported |

## Key Design Decisions

1. **Module name `earn_dual`** (underscore, not hyphen): consistent with `MODULES` array which uses snake_case.

2. **`signedDeleteQuery` vs modifying `signedDelete`**: Adding a new method avoids breaking existing bot `signedDelete` callers and makes the intent explicit at the call site.

3. **`--product-ids` as comma-separated string**: CLI parses it into an array before passing to the tool. MCP tools accept the array directly.

4. **`--client-dual-ids` for `get-invests`**: comma-separated, parsed to string array.

5. **Write operations return early on `--dry-run`**: print `{ tool, args }` JSON and exit, consistent with existing orders/bot pattern.
