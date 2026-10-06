#!/usr/bin/env node

import { buildTradeProgram } from "./trade.js";

buildTradeProgram()
  .parseAsync(process.argv)
  .catch((e) => {
    process.stderr.write(String(e) + "\n");
    process.exit(1);
  });
