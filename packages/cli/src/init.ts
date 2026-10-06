#!/usr/bin/env node

import { buildKitProgram } from "./kit.js";

buildKitProgram()
  .parseAsync(process.argv)
  .catch((e) => {
    process.stderr.write(String(e) + "\n");
    process.exit(1);
  });
