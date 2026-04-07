# Requirements: CLI Commander Refactor

## Background

`packages/cli/src/index.ts` is a single 928-line file with entirely hand-rolled argument parsing
(`parseFlags`, `parseSetupArgs`, manual `if/else` chains). This makes it fragile, hard to extend,
and impossible for AI agents or users to discover capabilities through `--help` alone.

Related: [pionex-official/pionex-ai-kit#32](https://github.com/pionex-official/pionex-ai-kit/issues/32)
— "CLI should provide comprehensive help output for AI self-discovery"

## Goal

Replace the hand-rolled CLI with [commander](https://www.npmjs.com/package/commander) while being
**completely transparent to existing users** — no command renames, no flag renames, no behavior
changes.

## Functional Requirements

### FR-1: Zero breaking changes

All existing commands, flags, and positional arguments must continue to work exactly as before:

| Binary | Commands |
|--------|----------|
| `pionex-ai-kit` | `onboard`, `setup --mcp=... --client=...`, `-v/--version` |
| `pionex-trade-cli` | `market <cmd>`, `account balance`, `orders <cmd>`, `bot order_list / bot futures_grid <cmd> / bot spot_grid <cmd>`, `earn dual <cmd>` |

All existing flag names (both kebab-case `--bu-order-id` and camelCase `--buOrderId` aliases where
present) must be preserved.

### FR-2: Rich help output

Commander generates `--help` for every command automatically. All commands must have:
- Accurate description
- Every flag documented with type, default, and required/optional marker
- At least one usage example in the description or notes

### FR-3: `capabilities` discovery command (issue #32)

Add `pionex-trade-cli capabilities` that prints a structured JSON summary of all available
command groups and their commands, for AI agent self-discovery without reading man pages.

### FR-4: Consistent exit codes

- Exit 0 on success
- Exit 1 on any error (same as today)
- Commander's built-in `--help` and `--version` exit 0

## Non-functional Requirements

### NFR-1: File organisation

The current monolithic file must be split by domain:

```
packages/cli/src/
  index.ts           ← entry point (basename detection, ~20 lines)
  kit.ts             ← pionex-ai-kit program (onboard + setup)
  trade.ts           ← pionex-trade-cli program builder
  commands/
    market.ts
    account.ts
    orders.ts
    bot.ts
    earn.ts
```

### NFR-2: No new runtime behaviour

Do not add features beyond FR-2 and FR-3. The refactor must be a pure structural improvement.

## Acceptance Criteria

- [ ] All commands in the `printPionexHelp()` example list run without error
- [ ] `pionex-trade-cli market depth BTC_USDT --help` prints all flags
- [ ] `pionex-trade-cli capabilities` outputs valid JSON
- [ ] `pionex-ai-kit --help` prints onboard + setup docs
- [ ] `npm run build` passes
- [ ] No existing flag parsing is broken (spot-check: `--bu-order-id`, `--bu-order-data-json`, `--client-dual-ids`, `--close-sell-model`)
