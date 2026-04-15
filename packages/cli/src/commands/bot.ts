import { Command } from "commander";
import { toToolErrorPayload, parseAndValidateCreateFuturesGridBuOrderData, parseAndValidateCreateSpotGridBuOrderData } from "@pionex-ai/core";
import { print, makeRunner, isDryRun, parseJsonFlag } from "../helpers.js";

function buildFuturesGridCommand(): Command {
  const fg = new Command("futures_grid").description("Futures Grid bot sub-commands (requires auth)");

  fg.command("get")
    .description("Get a Futures Grid bot order by ID")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .option("--lang <lang>", "Response language (e.g. en, zh)")
    .action(async (opts: { buOrderId: string; lang?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_futures_grid_get_order", { buOrderId: opts.buOrderId, lang: opts.lang });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  fg.command("create")
    .description(
      "Create a Futures Grid bot\n" +
      "  Example: pionex-trade-cli bot futures_grid create --base BTC --quote USDT \\\n" +
      "    --bu-order-data-json '{\"top\":\"110000\",\"bottom\":\"90000\",\"row\":100,\"grid_type\":\"arithmetic\",\"trend\":\"long\",\"leverage\":5,\"quoteInvestment\":\"100\"}'"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC, normalized to BTC.PERP if needed)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .requiredOption("--bu-order-data-json <json>", "JSON object with grid parameters")
    .option("--copy-from <source>", "Copy source type")
    .option("--copy-type <type>", "Copy type")
    .option("--copy-bot-order-id <id>", "Bot order ID to copy from")
    .action(async (opts: { base: string; quote: string; buOrderDataJson: string; copyFrom?: string; copyType?: string; copyBotOrderId?: string }, cmd: Command) => {
      try {
        const buOrderDataRaw = parseJsonFlag(opts.buOrderDataJson, "bu-order-data-json");
        const buOrderData = parseAndValidateCreateFuturesGridBuOrderData(buOrderDataRaw);
        const payload: Record<string, unknown> = {
          base: opts.base,
          quote: opts.quote,
          buOrderData,
          copyFrom: opts.copyFrom,
          copyType: opts.copyType,
          copyBotOrderId: opts.copyBotOrderId,
        };
        if (isDryRun(cmd)) {
          const run = makeRunner(cmd);
          const out = await run("pionex_bot_futures_grid_create", { ...payload, __dryRun: true });
          print(out.data);
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_futures_grid_create", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  fg.command("adjust_params")
    .description("Adjust parameters of an existing Futures Grid bot")
    .requiredOption("--body-json <json>", "JSON object with parameters to adjust")
    .action(async (opts: { bodyJson: string }, cmd: Command) => {
      try {
        const payload = parseJsonFlag(opts.bodyJson, "body-json");
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_futures_grid_adjust_params", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_futures_grid_adjust_params", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  fg.command("reduce")
    .description("Reduce position of a Futures Grid bot")
    .requiredOption("--body-json <json>", "JSON object with reduce parameters")
    .action(async (opts: { bodyJson: string }, cmd: Command) => {
      try {
        const payload = parseJsonFlag(opts.bodyJson, "body-json");
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_futures_grid_reduce", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_futures_grid_reduce", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  fg.command("check_params")
    .description(
      "Validate Futures Grid bot parameters before creating an order\n" +
      "  Example: pionex-trade-cli bot futures_grid check_params --base BTC --quote USDT \\\n" +
      "    --bu-order-data-json '{\"top\":\"110000\",\"bottom\":\"90000\",\"row\":100,\"grid_type\":\"arithmetic\",\"trend\":\"long\",\"leverage\":5,\"quoteInvestment\":\"100\"}'"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .requiredOption("--bu-order-data-json <json>", "JSON object with grid parameters")
    .action(async (opts: { base: string; quote: string; buOrderDataJson: string }, cmd: Command) => {
      try {
        const buOrderDataRaw = parseJsonFlag(opts.buOrderDataJson, "bu-order-data-json");
        const buOrderData = parseAndValidateCreateFuturesGridBuOrderData(buOrderDataRaw);
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_futures_grid_check_params", { base: opts.base, quote: opts.quote, buOrderData });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  fg.command("cancel")
    .description("Cancel a Futures Grid bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .option("--close-note <note>", "Close note")
    .option("--close-sell-model <model>", "Sell model on close")
    .option("--immediate", "Close immediately")
    .option("--close-slippage <slippage>", "Slippage tolerance on close")
    .action(async (opts: { buOrderId: string; closeNote?: string; closeSellModel?: string; immediate?: boolean; closeSlippage?: string }, cmd: Command) => {
      try {
        const payload = {
          buOrderId: opts.buOrderId,
          closeNote: opts.closeNote,
          closeSellModel: opts.closeSellModel,
          immediate: opts.immediate,
          closeSlippage: opts.closeSlippage,
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_futures_grid_cancel", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_futures_grid_cancel", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return fg;
}

function buildSpotGridCommand(): Command {
  const sg = new Command("spot_grid").description("Spot Grid bot sub-commands (requires auth)");

  sg.command("get")
    .description("Get a Spot Grid bot order by ID")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .action(async (opts: { buOrderId: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_get_order", { buOrderId: opts.buOrderId });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("get_ai_strategy")
    .description("Get AI-recommended Spot Grid strategy parameters")
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .action(async (opts: { base: string; quote: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_get_ai_strategy", { base: opts.base, quote: opts.quote });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("create")
    .description(
      "Create a Spot Grid bot\n" +
      "  Example: pionex-trade-cli bot spot_grid create --base BTC --quote USDT \\\n" +
      "    --bu-order-data-json '{\"top\":\"110000\",\"bottom\":\"90000\",\"row\":50,\"gridType\":\"arithmetic\",\"quoteTotalInvestment\":\"100\"}'"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .requiredOption("--bu-order-data-json <json>", "JSON object with grid parameters")
    .option("--note <note>", "Optional note for this bot")
    .action(async (opts: { base: string; quote: string; buOrderDataJson: string; note?: string }, cmd: Command) => {
      try {
        const buOrderDataRaw = parseJsonFlag(opts.buOrderDataJson, "bu-order-data-json");
        const buOrderData = parseAndValidateCreateSpotGridBuOrderData(buOrderDataRaw);
        const payload: Record<string, unknown> = { base: opts.base, quote: opts.quote, note: opts.note, buOrderData };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_spot_grid_create", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_create", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("adjust_params")
    .description("Adjust parameters of an existing Spot Grid bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .option("--top <price>", "New upper price boundary")
    .option("--bottom <price>", "New lower price boundary")
    .option("--row <n>", "New number of grid rows", parseInt)
    .option("--quote-invest <amount>", "Additional quote investment amount")
    .action(async (opts: { buOrderId: string; top?: string; bottom?: string; row?: number; quoteInvest?: string }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = {
          buOrderId: opts.buOrderId,
          top: opts.top,
          bottom: opts.bottom,
          row: opts.row,
          quoteInvest: opts.quoteInvest,
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_spot_grid_adjust_params", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_adjust_params", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("invest_in")
    .description("Add investment to an existing Spot Grid bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .requiredOption("--quote-invest <amount>", "Quote asset amount to invest")
    .action(async (opts: { buOrderId: string; quoteInvest: string }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = { buOrderId: opts.buOrderId, quoteInvest: opts.quoteInvest };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_spot_grid_invest_in", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_invest_in", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("check_params")
    .description(
      "Validate Spot Grid bot parameters before creating an order\n" +
      "  Example: pionex-trade-cli bot spot_grid check_params --base BTC --quote USDT \\\n" +
      "    --bu-order-data-json '{\"top\":\"110000\",\"bottom\":\"90000\",\"row\":50,\"gridType\":\"arithmetic\",\"quoteTotalInvestment\":\"100\"}'"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .requiredOption("--bu-order-data-json <json>", "JSON object with grid parameters")
    .action(async (opts: { base: string; quote: string; buOrderDataJson: string }, cmd: Command) => {
      try {
        const buOrderDataRaw = parseJsonFlag(opts.buOrderDataJson, "bu-order-data-json");
        const buOrderData = parseAndValidateCreateSpotGridBuOrderData(buOrderDataRaw);
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_check_params", { base: opts.base, quote: opts.quote, buOrderData });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("cancel")
    .description("Cancel a Spot Grid bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .option("--close-sell-model <model>", "Sell model on close: NOT_SELL | TO_QUOTE | TO_USDT")
    .option("--slippage <slippage>", "Slippage tolerance")
    .action(async (opts: { buOrderId: string; closeSellModel?: string; slippage?: string }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = {
          buOrderId: opts.buOrderId,
          closeSellModel: opts.closeSellModel,
          slippage: opts.slippage,
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_spot_grid_cancel", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_cancel", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sg.command("profit")
    .description("Withdraw profit from a Spot Grid bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .requiredOption("--amount <amount>", "Amount to withdraw")
    .action(async (opts: { buOrderId: string; amount: string }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = { buOrderId: opts.buOrderId, amount: opts.amount };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_spot_grid_profit", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_spot_grid_profit", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return sg;
}

function buildSmartCopyCommand(): Command {
  const sc = new Command("smart_copy").description("Smart Copy bot sub-commands (requires auth)");

  sc.command("get")
    .description("Get a Smart Copy bot order by ID")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .action(async (opts: { buOrderId: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_smart_copy_get_order", { buOrderId: opts.buOrderId });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sc.command("create")
    .description(
      "Create a Smart Copy bot\n" +
      "  Example: pionex-trade-cli bot smart_copy create --base BTC --quote USDT \\\n" +
      "    --bu-order-data-json '{\"quote_total_investment\":\"100\",\"portfolio\":[{\"base\":\"BTC\",\"signal_type\":\"<uuid>\",\"leverage\":2,\"percent\":\"1\"}]}'"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .requiredOption("--bu-order-data-json <json>", "JSON with quote_total_investment and portfolio array")
    .option("--copy-from <id>", "Source bot order ID to copy settings from")
    .option("--copy-type <type>", "Copy type")
    .option("--note <note>", "Optional note")
    .action(async (opts: { base: string; quote: string; buOrderDataJson: string; copyFrom?: string; copyType?: string; note?: string }, cmd: Command) => {
      try {
        const bu_order_data = parseJsonFlag(opts.buOrderDataJson, "bu-order-data-json");
        const payload: Record<string, unknown> = {
          base: opts.base,
          quote: opts.quote,
          bu_order_data,
          copy_from: opts.copyFrom,
          copy_type: opts.copyType,
          note: opts.note,
        };
        if (isDryRun(cmd)) {
          const run = makeRunner(cmd);
          const out = await run("pionex_bot_smart_copy_create", { ...payload, __dryRun: true });
          print(out.data);
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_smart_copy_create", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sc.command("check_params")
    .description(
      "Validate Smart Copy parameters before creating an order\n" +
      "  Example: pionex-trade-cli bot smart_copy check_params --base BTC --quote USDT \\\n" +
      "    --leverage 2 --quote-investment 0 --signal-type <uuid>"
    )
    .requiredOption("--base <base>", "Base asset (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote asset (e.g. USDT)")
    .requiredOption("--leverage <n>", "Leverage multiplier", parseInt)
    .requiredOption("--quote-investment <amount>", "Investment amount; use '0' to get range only")
    .option("--signal-type <uuid>", "Optional signal provider UUID")
    .option("--signal-param <json>", "Optional signal parameters as a JSON string")
    .action(async (opts: { base: string; quote: string; leverage: number; quoteInvestment: string; signalType?: string; signalParam?: string }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = {
          base: opts.base,
          quote: opts.quote,
          leverage: opts.leverage,
          quote_investment: opts.quoteInvestment,
          signal_type: opts.signalType,
          signal_param: opts.signalParam,
        };
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_smart_copy_check_params", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  sc.command("cancel")
    .description("Cancel a Smart Copy bot")
    .requiredOption("--bu-order-id <id>", "Bot order ID")
    .option("--close-note <note>", "Optional close note")
    .option("--convert-into-earn-coin", "Convert remaining funds into earn coin")
    .action(async (opts: { buOrderId: string; closeNote?: string; convertIntoEarnCoin?: boolean }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = {
          bu_order_id: opts.buOrderId,
          close_note: opts.closeNote,
          convert_into_earn_coin: opts.convertIntoEarnCoin,
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_smart_copy_cancel", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_smart_copy_cancel", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return sc;
}

function buildSignalCommand(): Command {
  const sig = new Command("signal").description("Signal provider sub-commands (requires auth)");

  sig.command("listener")
    .description(
      "Push a trading signal to the Pionex signal platform (signal provider use)\n" +
      "  Example: pionex-trade-cli bot signal listener --signal-type <uuid> --signal-param '{}' \\\n" +
      "    --base BTC --quote USDT --time 2024-01-01T12:00:00Z --price 85000 \\\n" +
      "    --action buy --position-size 1 --contracts 1"
    )
    .requiredOption("--signal-type <uuid>", "Signal provider UUID")
    .requiredOption("--signal-param <json>", "Signal parameters as a JSON string (e.g. '{}')")
    .requiredOption("--base <base>", "Base currency (e.g. BTC)")
    .requiredOption("--quote <quote>", "Quote currency (e.g. USDT)")
    .requiredOption("--time <iso>", "Signal timestamp in RFC 3339 format (e.g. 2024-01-01T12:00:00Z)")
    .requiredOption("--price <price>", "Current price at time of signal (e.g. 85000)")
    .requiredOption("--action <action>", "'buy' to open a position, 'sell' to close")
    .requiredOption("--position-size <size>", "Target position size as a fraction (e.g. '1' for 100%)")
    .requiredOption("--contracts <n>", "Number of contracts")
    .option("--direction <dir>", "Optional trade direction")
    .action(async (opts: { signalType: string; signalParam: string; base: string; quote: string; time: string; price: string; action: string; positionSize: string; contracts: string; direction?: string }, cmd: Command) => {
      try {
        const payload: Record<string, unknown> = {
          signalType: opts.signalType,
          signalParam: opts.signalParam,
          base: opts.base,
          quote: opts.quote,
          time: opts.time,
          price: opts.price,
          data: {
            action: opts.action,
            position_size: opts.positionSize,
            contracts: opts.contracts,
            direction: opts.direction,
          },
        };
        if (isDryRun(cmd)) {
          print({ tool: "pionex_bot_signal_listener", args: payload });
          return;
        }
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_signal_listener", payload);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return sig;
}

export function buildBotCommand(): Command {
  const bot = new Command("bot").description("Bot management (requires auth)");

  bot.command("order_list")
    .description("List bot orders across all bot types")
    .option("--status <status>", "Filter by status: running | finished")
    .option("--base <base>", "Filter by base asset (e.g. BTC)")
    .option("--quote <quote>", "Filter by quote asset (e.g. USDT)")
    .option("--page-token <token>", "Pagination token from previous response")
    .option("--bu-order-types <list>", "Comma-separated types: futures_grid,spot_grid,smart_copy")
    .action(async (opts: { status?: string; base?: string; quote?: string; pageToken?: string; buOrderTypes?: string }, cmd: Command) => {
      try {
        const buOrderTypes = opts.buOrderTypes ? opts.buOrderTypes.split(",").map((s) => s.trim()) : undefined;
        const run = makeRunner(cmd);
        const out = await run("pionex_bot_order_list", {
          status: opts.status,
          base: opts.base,
          quote: opts.quote,
          pageToken: opts.pageToken,
          buOrderTypes,
        });
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  bot.addCommand(buildFuturesGridCommand());
  bot.addCommand(buildSpotGridCommand());
  bot.addCommand(buildSmartCopyCommand());
  bot.addCommand(buildSignalCommand());

  return bot;
}
