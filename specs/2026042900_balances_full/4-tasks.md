# Tasks — balances_full

## Iteration ID

`2026042900_balances_full`

## Task List

- [ ] **Task 1** — Add `pionex_account_get_balance_full` ToolSpec to `packages/core/src/tools/account.ts`
  - Verification: TypeScript compiles without error

- [ ] **Task 2** — Add `balance_full` sub-command to `packages/cli/src/commands/account.ts`
  - Verification: `node packages/cli/dist/index.js account --help` shows `balance_full`

- [ ] **Task 3** — Update `COMPLETION_TREE.account` in `packages/cli/src/completion.ts`
  - Verification: `balance_full` appears in completion list

- [ ] **Task 4** — Run `npm run build` and verify no errors

- [ ] **Task 5** — Update `docs/tech-api-overview.yaml` with new endpoint + schemas

- [ ] **Task 6** — Update `docs/requirements-overview.md` and `docs/tech-memory-overview.md`
