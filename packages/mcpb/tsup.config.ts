import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  sourcemap: false,
  clean: true,
  dts: false,
  noExternal: ["@pionex-ai/core"],
});
