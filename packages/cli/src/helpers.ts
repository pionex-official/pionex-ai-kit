import { createRequire } from "node:module";
import type { Command } from "commander";
import { loadConfig, PionexRestClient, createToolRunner } from "@pionex-ai/core";

const _require = createRequire(import.meta.url);
export const version = (_require("../package.json") as { version: string }).version;

export function resolveConfig(cmd: Command) {
  const opts = cmd.optsWithGlobals() as {
    profile?: string;
    modules?: string;
    baseUrl?: string;
    readOnly?: boolean;
    dryRun?: boolean;
  };
  return loadConfig({
    profile: opts.profile,
    modules: opts.modules,
    baseUrl: opts.baseUrl,
    readOnly: opts.readOnly ?? false,
  });
}

export function isDryRun(cmd: Command): boolean {
  return Boolean((cmd.optsWithGlobals() as { dryRun?: boolean }).dryRun);
}

export function print(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function parseJsonFlag(raw: unknown, flagName: string): Record<string, unknown> {
  if (typeof raw !== "string") {
    throw new Error(`Missing required flag: --${flagName}`);
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid --${flagName}: ${msg}`);
  }
}

export function makeRunner(cmd: Command) {
  const config = resolveConfig(cmd);
  const client = new PionexRestClient(config);
  return createToolRunner(client, config);
}
