import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { parse, stringify } from "smol-toml";

export { stringify as tomlStringify };

export interface PionexProfile {
  api_key?: string;
  secret_key?: string;
  base_url?: string;
}

export interface PionexTomlConfig {
  default_profile?: string;
  profiles: Record<string, PionexProfile>;
}

/** Fixed path: ~/.pionex/config.toml */
export function configFilePath(): string {
  return join(homedir(), ".pionex", "config.toml");
}

export function readFullConfig(): PionexTomlConfig {
  const path = configFilePath();
  if (!existsSync(path)) return { profiles: {} };
  const raw = readFileSync(path, "utf-8");
  return parse(raw) as unknown as PionexTomlConfig;
}

export function readTomlProfile(profileName?: string): PionexProfile {
  const config = readFullConfig();
  const name = profileName ?? config.default_profile ?? "default";
  return config.profiles?.[name] ?? {};
}

export function writeFullConfig(config: PionexTomlConfig): void {
  const path = configFilePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, stringify(config as unknown as Record<string, unknown>), "utf-8");
}
