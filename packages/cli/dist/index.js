#!/usr/bin/env node

// src/index.ts
import { basename } from "path";
async function main() {
  const invokedAs = basename(process.argv[1] || "");
  if (invokedAs.includes("pionex-ai-kit")) {
    const { buildKitProgram } = await import("./kit-7X7UVP4Q.js");
    await buildKitProgram().parseAsync(process.argv);
  } else {
    const { buildTradeProgram } = await import("./trade-EKHXN3M7.js");
    await buildTradeProgram().parseAsync(process.argv);
  }
}
main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exit(1);
});
//# sourceMappingURL=index.js.map