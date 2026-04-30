import { Command } from "commander";
import { toToolErrorPayload } from "@pionex-ai/core";
import { print, makeRunner } from "../helpers.js";

export function buildAccountCommand(): Command {
  const account = new Command("account").description("Account data (requires auth)");

  account
    .command("balance")
    .description("Get account balance for all assets")
    .action(async (_opts: Record<string, unknown>, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const out = await run("pionex_account_get_balance", {});
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  account
    .command("balance_full")
    .description("Get full account balance overview (spot + futures, with coin prices and USDT/BTC totals)")
    .option("--app-lang <lang>", "App language, e.g. en or zh (overrides sys-lang)")
    .option("--sys-lang <lang>", "System language fallback")
    .action(async (opts: { appLang?: string; sysLang?: string }, cmd: Command) => {
      try {
        const run = makeRunner(cmd);
        const args: Record<string, string> = {};
        if (opts.appLang) args["appLang"] = opts.appLang;
        if (opts.sysLang) args["sysLang"] = opts.sysLang;
        const out = await run("pionex_account_get_balance_full", args);
        print(out.data);
      } catch (e) {
        process.stderr.write(JSON.stringify(toToolErrorPayload(e), null, 2) + "\n");
        process.exit(1);
      }
    });

  return account;
}
