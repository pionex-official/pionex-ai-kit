# Technical Design — balances_full

## Iteration ID

`2026042900_balances_full`

## API

```
GET /api/v1/wallet/balancesFull
Auth: PIONEX-KEY / PIONEX-SIGNATURE (signedGet)
Query params (optional): appLang, sysLang
```

Response schema mirrors the OpenAPI spec provided in requirements.

## Files Changed

### 1. `packages/core/src/tools/account.ts`

Add a second `ToolSpec`:

```typescript
{
  name: "pionex_account_get_balance_full",
  module: "account",
  isWrite: false,
  description: "Query full account balance overview...",
  inputSchema: { type: "object", additionalProperties: false,
    properties: {
      appLang: { type: "string", description: "App language (overrides sysLang)" },
      sysLang: { type: "string", description: "System language fallback" }
    }
  },
  async handler(args, { client }) {
    return (await client.signedGet("/api/v1/balancesFull", args)).data;
  },
}
```

No new module or constant needed — reuses existing `account` module.

### 2. `packages/cli/src/commands/account.ts`

Add `balance_full` sub-command under the existing `account` command group.
Passes optional `--app-lang` / `--sys-lang` flags through to the tool.

### 3. `packages/cli/src/completion.ts`

`COMPLETION_TREE.account` extended from `["balance"]` to `["balance", "balance_full"]`.

### 4. `docs/tech-api-overview.yaml`

Add `GET /api/v1/wallet/balancesFull` path plus all new schemas under `components/schemas`.

### 5. `docs/requirements-overview.md` + `docs/tech-memory-overview.md`

Append iteration entry.

## No Changes Required

- `packages/core/src/constants.ts` — `account` module already exists
- `packages/core/src/tools/index.ts` — `registerAccountTools()` already included
- `packages/mcp/src/server.ts` — picks up new tool automatically
