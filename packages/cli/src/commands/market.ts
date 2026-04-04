import { Command } from "commander";
import { toToolErrorPayload } from "@pionex-ai/core";
import { print, makeRunner } from "../helpers.js";

export function buildMarketCommand(): Command {
  const market = new Command("market").description("Market data (public, no auth required)");

  market
    .command("depth <symbol>")
    .description("Get order book depth for a symbol")
    .option("--limit <n>", "Number of price levels to return", parseInt)
    .action(async (symbol: string, opts: { limit?: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_market_get_depth", { symbol, limit: opts.limit });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  market
    .command("trades <symbol>")
    .description("Get recent trades for a symbol")
    .option("--limit <n>", "Number of trades to return", parseInt)
    .action(async (symbol: string, opts: { limit?: number }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_market_get_trades", { symbol, limit: opts.limit });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  market
    .command("symbols")
    .description("Get symbol/trading pair information")
    .option("--symbols <list>", "Comma-separated symbol list (e.g. BTC_USDT)")
    .option("--type <type>", "Symbol type filter")
    .action(async (opts: { symbols?: string; type?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_market_get_symbol_info", { symbols: opts.symbols, type: opts.type });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  market
    .command("tickers")
    .description("Get 24h ticker statistics")
    .option("--symbol <symbol>", "Filter by symbol (e.g. BTC_USDT)")
    .option("--type <type>", "Symbol type filter")
    .action(async (opts: { symbol?: string; type?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_market_get_tickers", { symbol: opts.symbol, type: opts.type });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  market
    .command("book_tickers")
    .description("Get best bid/ask prices for symbols")
    .option("--symbol <symbol>", "Filter by symbol (e.g. BTC_USDT)")
    .option("--type <type>", "Symbol type filter")
    .action(async (opts: { symbol?: string; type?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_market_get_book_tickers", { symbol: opts.symbol, type: opts.type });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  market
    .command("klines [symbol] [interval]")
    .description("Get candlestick/kline data\n  Valid intervals: 1M 5M 15M 30M 60M 4H 8H 12H 1D\n  Example: pionex-trade-cli market klines BTC_USDT 60M")
    .option("--symbol <symbol>", "Trading pair (e.g. BTC_USDT)")
    .option("--interval <interval>", "Kline interval: 1M 5M 15M 30M 60M 4H 8H 12H 1D")
    .option("--end-time <ms>", "End time in milliseconds", parseInt)
    .option("--limit <n>", "Number of klines to return", parseInt)
    .action(async (posSymbol: string | undefined, posInterval: string | undefined, opts: { symbol?: string; interval?: string; endTime?: number; limit?: number }, cmd: Command) => {
      try {
        const symbol = opts.symbol ?? posSymbol;
        const interval = opts.interval ?? posInterval;
        if (!symbol || !interval) {
          throw new Error("Missing symbol/interval. Example: pionex-trade-cli market klines BTC_USDT 60M");
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_market_get_klines", { symbol, interval, endTime: opts.endTime, limit: opts.limit });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return market;
}
