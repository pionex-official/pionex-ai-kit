#!/usr/bin/env node

import { basename } from "node:path";

async function main(): Promise<void> {
  const invokedAs = basename(process.argv[1] || "");
  if (invokedAs.includes("pionex-ai-kit")) {
    const { buildKitProgram } = await import("./kit.js");
    await buildKitProgram().parseAsync(process.argv);
  } else {
    const { buildTradeProgram } = await import("./trade.js");
    await buildTradeProgram().parseAsync(process.argv);
  }
}

main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
