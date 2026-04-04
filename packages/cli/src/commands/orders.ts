import { Command } from "commander";
import { toToolErrorPayload } from "@pionex-ai/core";
import { print, makeRunner, isDryRun } from "../helpers.js";

export function buildOrdersCommand(): Command {
  const orders = new Command("orders").description("Spot orders (requires auth)");

  orders
    .command("new")
    .description("Place a new spot order")
    .requiredOption("--symbol <symbol>", "Trading pair (e.g. BTC_USDT)")
    .requiredOption("--side <side>", "BUY or SELL")
    .requiredOption("--type <type>", "Order type (MARKET, LIMIT, etc.)")
    .option("--client-order-id <id>", "Client-assigned order ID")
    .option("--size <size>", "Base asset quantity")
    .option("--price <price>", "Limit price")
    .option("--amount <amount>", "Quote asset amount (for market buy)")
    .option("--IOC", "Immediate-or-cancel flag")
    .action(async (opts: { symbol: string; side: string; type: string; clientOrderId?: string; size?: string; price?: string; amount?: string; IOC?: boolean }, cmd: Command) => {
      try {
        const payload = {
          symbol: opts.symbol,
          side: opts.side,
          type: opts.type,
          clientOrderId: opts.clientOrderId,
          size: opts.size,
          price: opts.price,
          amount: opts.amount,
          IOC: opts.IOC,
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_orders_new_order", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_new_order", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("get")
    .description("Get an order by ID")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .requiredOption("--order-id <id>", "Order ID", parseInt)
    .action(async (opts: { symbol: string; orderId: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_get_order", { symbol: opts.symbol, orderId: opts.orderId });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("open")
    .description("Get open orders for a symbol")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .action(async (opts: { symbol: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_get_open_orders", { symbol: opts.symbol });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("all")
    .description("Get all orders for a symbol")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .option("--limit <n>", "Maximum number of orders to return", parseInt)
    .action(async (opts: { symbol: string; limit?: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_get_all_orders", { symbol: opts.symbol, limit: opts.limit });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("fills")
    .description("Get fill records for a symbol")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .option("--start-time <ms>", "Start time in milliseconds", parseInt)
    .option("--end-time <ms>", "End time in milliseconds", parseInt)
    .action(async (opts: { symbol: string; startTime?: number; endTime?: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_get_fills", { symbol: opts.symbol, startTime: opts.startTime, endTime: opts.endTime });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("fills_by_order_id")
    .description("Get fill records for a specific order")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .requiredOption("--order-id <id>", "Order ID", parseInt)
    .action(async (opts: { symbol: string; orderId: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_get_fills_by_order_id", { symbol: opts.symbol, orderId: opts.orderId });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("cancel")
    .description("Cancel an order")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .requiredOption("--order-id <id>", "Order ID", parseInt)
    .action(async (opts: { symbol: string; orderId: number }, cmd: Command) => {
      try {
        const payload = { symbol: opts.symbol, orderId: opts.orderId };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_orders_cancel_order", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_cancel_order", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  orders
    .command("cancel_all")
    .description("Cancel all open orders for a symbol")
    .requiredOption("--symbol <symbol>", "Trading pair")
    .action(async (opts: { symbol: string }, cmd: Command) => {
      try {
        const payload = { symbol: opts.symbol };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_orders_cancel_all_orders", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_orders_cancel_all_orders", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return orders;
}
