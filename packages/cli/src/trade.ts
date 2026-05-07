import { Command } from "commander";
import { version } from "./helpers.js";
import { initCompletion, generateFishCompletion } from "./completion.js";
import { buildMarketCommand } from "./commands/market.js";
import { buildWalletCommand } from "./commands/wallet.js";
import { buildOrdersCommand } from "./commands/orders.js";
import { buildBotCommand } from "./commands/bot.js";
import { buildEarnCommand } from "./commands/earn.js";
import { buildCapabilitiesCommand } from "./commands/capabilities.js";

// omelette must be initialized before commander parses argv
// (it intercepts COMP_LINE / COMP_POINT env vars set by the shell)
const completion = initCompletion();

export function buildTradeProgram(): Command {
  const program = new Command("pionex-trade-cli")
    .version(version, "-v, --version", "Print version number")
    .description("Pionex trading CLI — direct access to market data, orders, bots, and earn products")
    .addHelpCommand(true);

  // Global options inherited by all sub-commands via cmd.optsWithGlobals()
  program
    .option("--profile <name>", "Profile name in ~/.pionex/config.toml")
    .option("--modules <list>", "Comma-separated modules to enable (market,wallet,orders,bot,earn or all)")
    .option("--base-url <url>", "Override API base URL")
    .option("--read-only", "Disable write operations (orders new/cancel, etc.)")
    .option("--dry-run", "Print resolved request body without executing (write commands only)");

  program.addCommand(buildMarketCommand());
  program.addCommand(buildWalletCommand());
  program.addCommand(buildOrdersCommand());
  program.addCommand(buildBotCommand());
  program.addCommand(buildEarnCommand());
  program.addCommand(buildCapabilitiesCommand());

  // Shell completion setup commands
  program
    .command("setup-completion")
    .description("Install tab completion for bash/zsh (run once, then source your shell config)")
    .action(() => {
      completion.setupShellInitFile();
      process.stdout.write(
        "✓ Completion installed.\n" +
        "  bash:  source ~/.bashrc\n" +
        "  zsh:   source ~/.zshrc\n"
      );
    });

  program
    .command("setup-completion-fish")
    .description(
      "Print fish shell completion script\n" +
      "  Usage: pionex-trade-cli setup-completion-fish > ~/.config/fish/completions/pionex-trade-cli.fish"
    )
    .action(() => {
      process.stdout.write(generateFishCompletion());
    });

  return program;
}
