import { Command } from "commander";
import { toToolErrorPayload } from "@pionex-ai/core";
import { print, makeRunner, isDryRun } from "../helpers.js";

function buildDualCommand(): Command {
  const dual = new Command("dual").description("Dual Investment commands");

  dual
    .command("symbols")
    .description("List supported Dual Investment trading pairs")
    .option("--base <base>", "Filter by base asset (e.g. BTC)")
    .action(async (opts: { base?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_symbols", { base: opts.base });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("open_products")
    .description(
      "List open Dual Investment products\n" +
      "  BTC/ETH: --quote USDXO; others: --quote USDT\n" +
      "  Product ID format: {BASE}-{QUOTE}-{YYMMDD}-{STRIKE}-{C|P}-{CURRENCY}"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (USDXO for BTC/ETH, USDT for others)")
    .requiredOption("--type <type>", "Product type: DUAL_BASE | DUAL_CURRENCY")
    .option("--currency <currency>", "Settlement currency (e.g. USDT, USDC)")
    .action(async (opts: { base: string; quote: string; type: string; currency?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_open_products", { base: opts.base, quote: opts.quote, type: opts.type, currency: opts.currency });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("prices")
    .description("Get yield rates for products (call before invest — pass profit value unchanged)")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--quote <quote>", "Quote asset")
    .requiredOption("--product-ids <ids>", "Comma-separated product IDs")
    .action(async (opts: { base: string; quote: string; productIds: string }, cmd: Command) => {
      try {
        const productIds = opts.productIds.split(",").map((s) => s.trim());
        if (productIds.length === 0) throw new Error("--product-ids must not be empty");
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_prices", { base: opts.base, quote: opts.quote, productIds });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("index")
    .description("Get index price for a trading pair")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--quote <quote>", "Quote asset")
    .action(async (opts: { base: string; quote: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_index", { base: opts.base, quote: opts.quote });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("delivery_prices")
    .description("Get historical delivery prices")
    .requiredOption("--base <base>", "Base asset")
    .option("--quote <quote>", "Quote asset")
    .option("--start-time <ms>", "Start time in milliseconds", parseInt)
    .option("--end-time <ms>", "End time in milliseconds", parseInt)
    .action(async (opts: { base: string; quote?: string; startTime?: number; endTime?: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_delivery_prices", { base: opts.base, quote: opts.quote, startTime: opts.startTime, endTime: opts.endTime });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("balances")
    .description("Get Dual Investment balances (requires read auth)")
    .option("--merge", "Merge balances across currencies")
    .action(async (opts: { merge?: boolean }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_balances", { merge: opts.merge });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("get_invests")
    .description("Batch query Dual Investment orders (requires read auth)")
    .option("--base <base>", "Filter by base asset")
    .requiredOption("--client-dual-ids <ids>", "Comma-separated client dual IDs")
    .action(async (opts: { base?: string; clientDualIds: string }, cmd: Command) => {
      try {
        const clientDualIds = opts.clientDualIds.split(",").map((s) => s.trim());
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_get_invests", { base: opts.base, clientDualIds });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("records")
    .description("Get Dual Investment history (requires read auth)")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--end-time <ms>", "End time in milliseconds", parseInt)
    .option("--quote <quote>", "Quote asset")
    .option("--currency <currency>", "Settlement currency")
    .option("--filter <filter>", "Status filter")
    .option("--start-time <ms>", "Start time in milliseconds", parseInt)
    .option("--limit <n>", "Maximum records to return", parseInt)
    .action(async (opts: { base: string; endTime: number; quote?: string; currency?: string; filter?: string; startTime?: number; limit?: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_records", {
          base: opts.base,
          quote: opts.quote,
          currency: opts.currency,
          filter: opts.filter,
          startTime: opts.startTime,
          endTime: opts.endTime,
          limit: opts.limit,
        });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("invest")
    .description("Create a Dual Investment order (requires earn auth)")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--product-id <id>", "Product ID")
    .option("--client-dual-id <id>", "Client-assigned order ID")
    .option("--base-amount <amount>", "Base asset amount to invest")
    .option("--currency-amount <amount>", "Currency amount to invest")
    .requiredOption("--profit <rate>", "Yield rate from prices command (pass unchanged)")
    .action(async (opts: { base: string; productId: string; clientDualId?: string; baseAmount?: string; currencyAmount?: string; profit: string }, cmd: Command) => {
      try {
        const payload = {
          base: opts.base,
          productId: opts.productId,
          clientDualId: opts.clientDualId,
          baseAmount: opts.baseAmount,
          currencyAmount: opts.currencyAmount,
          profit: opts.profit,
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_earn_dual_invest", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_invest", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("revoke_invest")
    .description("Revoke a pending Dual Investment order (requires earn auth)")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--client-dual-id <id>", "Client dual order ID")
    .requiredOption("--product-id <id>", "Product ID")
    .action(async (opts: { base: string; clientDualId: string; productId: string }, cmd: Command) => {
      try {
        const payload = { base: opts.base, clientDualId: opts.clientDualId, productId: opts.productId };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_earn_dual_revoke_invest", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_revoke_invest", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  dual
    .command("collect")
    .description("Collect settled Dual Investment earnings (requires earn auth)")
    .requiredOption("--base <base>", "Base asset")
    .requiredOption("--client-dual-id <id>", "Client dual order ID")
    .requiredOption("--product-id <id>", "Product ID")
    .action(async (opts: { base: string; clientDualId: string; productId: string }, cmd: Command) => {
      try {
        const payload = { base: opts.base, clientDualId: opts.clientDualId, productId: opts.productId };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_earn_dual_collect", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_earn_dual_collect", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return dual;
}

export function buildEarnCommand(): Command {
  const earn = new Command("earn").description("Earn products (requires auth)");
  earn.addCommand(buildDualCommand());
  return earn;
}
