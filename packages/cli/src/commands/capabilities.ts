import { Command } from "commander";

export function buildCapabilitiesCommand(): Command {
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
          dual: [
            "symbols",
            "open_products",
            "prices",
            "index",
            "delivery_prices",
            "balances",
            "get_invests",
            "records",
            "invest",
            "revoke_invest",
            "collect",
          ],
        },
      };
      process.stdout.write(JSON.stringify(caps, null, 2) + "\n");
    });
}
