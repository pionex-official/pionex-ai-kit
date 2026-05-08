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

  return account;
}
