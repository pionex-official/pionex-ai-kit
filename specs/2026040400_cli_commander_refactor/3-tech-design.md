# Tech Design: CLI Commander Refactor

## Dependency

Add to `packages/cli/package.json` `dependencies` (runtime, not devDependencies):

```json
"commander": "^12.0.0"
```

Commander v12 is ESM-compatible and actively maintained.

## Entry Point (`src/index.ts`)

Slim dispatcher — detects binary name and delegates to the appropriate program:

```typescript
#!/usr/bin/env node
import { basename } from "node:path";

const invokedAs = basename(process.argv[1] || "");

if (invokedAs.includes("pionex-ai-kit")) {
  const { buildKitProgram } = await import("./kit.js");
  buildKitProgram().parseAsync(process.argv);
} else {
  const { buildTradeProgram } = await import("./trade.js");
  buildTradeProgram().parseAsync(process.argv);
}
```

## `src/kit.ts` — pionex-ai-kit

```typescript
import { Command } from "commander";

export function buildKitProgram(): Command {
  const program = new Command("pionex-ai-kit")
    .version(version)
    .description("Pionex CLI: configure credentials and MCP client setup");

  program
    .command("onboard")
    .description("Interactive wizard to create ~/.pionex/config.toml")
    .action(() => cmdOnboard());

  program
    .command("setup")
    .description("Write MCP client config for a supported AI client")
    .option("--mcp <server>", "MCP server name (default: pionex-trade-mcp)")
    .requiredOption("--client <client>", `Client ID (${SUPPORTED_CLIENTS.join("|")})`)
    .action((opts) => cmdSetup(opts));

  return program;
}
```

Key: `program.parseAsync(process.argv)` — commander handles `-v`/`--version` and `help` natively.

## `src/trade.ts` — pionex-trade-cli

Top-level program with global options plus one sub-command per group:

```typescript
export function buildTradeProgram(): Command {
  const program = new Command("pionex-trade-cli")
    .version(version)
    .addHelpCommand(true)
    .description("Pionex trading CLI");

  // Global options (inherited by all subcommands via .passThroughOptions or explicit add)
  program
    .option("--profile <name>", "Profile in ~/.pionex/config.toml")
    .option("--modules <list>", "Comma-separated modules")
    .option("--base-url <url>", "Override API base URL")
    .option("--read-only", "Disable write operations")
    .option("--dry-run", "Print resolved request body without executing");

  program.addCommand(buildMarketCommand());
  program.addCommand(buildAccountCommand());
  program.addCommand(buildOrdersCommand());
  program.addCommand(buildBotCommand());
  program.addCommand(buildEarnCommand());
  program.addCommand(buildCapabilitiesCommand());

  return program;
}
```

### Global options propagation

Commander does not automatically inherit parent options in sub-commands.
Use a shared helper to extract config from the root program:

```typescript
function resolveConfig(cmd: Command) {
  const opts = cmd.optsWithGlobals(); // collects parent + own options
  return loadConfig({
    profile: opts.profile,
    modules: opts.modules,
    baseUrl: opts.baseUrl,
    readOnly: opts.readOnly ?? false,
  });
}
```

## `src/commands/market.ts`

```typescript
export function buildMarketCommand(): Command {
  const market = new Command("market").description("Market data (public, no auth required)");

  market
    .command("depth <symbol>")
    .description("Get order book depth for a symbol")
    .option("--limit <n>", "Number of levels", parseInt)
    .action(async (symbol, opts, cmd) => {
      const config = resolveConfig(cmd);
      const out = await runToolWith(config, "pionex_market_get_depth", { symbol, limit: opts.limit });
      print(out);
    });

  // ... trades, symbols, tickers, book_tickers, klines
  return market;
}
```

Note: `depth` uses a positional `<symbol>` (required) — matching the current CLI behaviour.
Other market commands use `--symbol` flags.

## `src/commands/bot.ts`

The bot group has a flat command (`order_list`) alongside two sub-groups (`futures_grid`, `spot_grid`).
Commander supports this as nested `Command` objects:

```typescript
export function buildBotCommand(): Command {
  const bot = new Command("bot").description("Bot management (requires auth)");

  // Flat command
  bot.command("order_list")
    .description("List bot orders")
    .option("--status <s>", "running|finished")
    .option("--base <base>")
    .option("--quote <quote>")
    .option("--page-token <token>")
    .option("--bu-order-types <list>", "Comma-separated types")
    .action(async (opts, cmd) => { ... });

  // Nested sub-groups
  const fg = new Command("futures_grid").description("Futures Grid bot sub-commands");
  fg.command("get").option("--bu-order-id <id>", "Bot order ID").required...
  fg.command("create")...
  // ...
  bot.addCommand(fg);

  const sg = new Command("spot_grid").description("Spot Grid bot sub-commands");
  // ...
  bot.addCommand(sg);

  return bot;
}
```

## `src/commands/earn.ts`

```typescript
export function buildEarnCommand(): Command {
  const earn = new Command("earn").description("Earn products (requires auth)");

  const dual = new Command("dual").description("Dual Investment");
  dual.command("symbols").option("--base <base>")...
  // all 11 dual commands
  earn.addCommand(dual);

  return earn;
}
```

## `capabilities` command (issue #32)

```typescript
function buildCapabilitiesCommand(): Command {
  return new Command("capabilities")
    .description("Print all available commands as JSON (for AI agent self-discovery)")
    .action(() => {
      const caps = {
        market: ["depth", "trades", "symbols", "tickers", "book_tickers", "klines"],
        account: ["balance"],
        orders: ["new", "get", "open", "all", "fills", "fills_by_order_id", "cancel", "cancel_all"],
        bot: {
          order_list: true,
          futures_grid: ["get", "create", "adjust_params", "reduce", "cancel"],
          spot_grid: ["get", "get_ai_strategy", "create", "adjust_params", "invest_in", "cancel", "profit"],
        },
        earn: {
          dual: ["symbols", "open_products", "prices", "index", "delivery_prices",
                 "balances", "get_invests", "records", "invest", "revoke_invest", "collect"],
        },
      };
      process.stdout.write(JSON.stringify(caps, null, 2) + "\n");
    });
}
```

## Error handling

Commander calls `process.exit(1)` on missing required options by default.
For command-level errors (API failures), keep the existing pattern:

```typescript
.action(async (...) => {
  try {
    // ...
  } catch (e) {
    process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
    process.exit(1);
  }
})
```

Commander's `.exitOverride()` is not needed — default exit behaviour is fine.

## camelCase flag aliases

Many flags have both kebab-case and camelCase variants in the current code
(e.g. `--bu-order-id` / `--buOrderId`). Commander automatically makes
`--bu-order-id` accessible as `opts.buOrderId`, so the camelCase aliases
are **no longer needed as separate flags** — they work automatically.

Any `--buOrderId` positional aliases in tests or docs should be noted as deprecated
but can still be handled by `.addOption(new Option('--buOrderId <id>').hideHelp())`.

## Build

No changes to `tsup` config needed. The split into multiple files is fine since `tsup`
bundles all imports. Update `tsup.config.ts` if entry point changes.

Check current tsup config:
