import { readTomlProfile } from "./config/toml.js";
import { PIONEX_API_DEFAULT_BASE_URL, DEFAULT_MODULES, MODULES, type ModuleId } from "./constants.js";
import { ConfigError } from "./utils/errors.js";

export interface CliOptions {
  modules?: string;
  readOnly: boolean;
  profile?: string;
  baseUrl?: string;
}

export interface PionexConfig {
  apiKey?: string;
  apiSecret?: string;
  hasAuth: boolean;
  baseUrl: string;
  modules: ModuleId[];
  readOnly: boolean;
}

function parseModuleList(rawModules?: string): ModuleId[] {
  if (!rawModules || rawModules.trim().length === 0) return [...DEFAULT_MODULES];
  const trimmed = rawModules.trim().toLowerCase();
  if (trimmed === "all") return [...MODULES];

  const requested = trimmed
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (requested.length === 0) return [...DEFAULT_MODULES];

  const out: ModuleId[] = [];
  for (const m of requested) {
    if (!MODULES.includes(m as ModuleId)) {
      throw new ConfigError(`Unknown module "${m}".`, `Use one of: ${MODULES.join(", ")} or "all".`);
    }
    out.push(m as ModuleId);
  }
  return Array.from(new Set(out));
}

/**
 * Credential priority (highest to lowest):
 *   1. Environment variables (PIONEX_API_KEY / PIONEX_API_SECRET)
 *   2. ~/.pionex/config.toml profile values
 */
export function loadConfig(cli: CliOptions): PionexConfig {
  const toml = readTomlProfile(cli.profile);

  const apiKey = process.env.PIONEX_API_KEY?.trim() || toml.api_key;
  const apiSecret = process.env.PIONEX_API_SECRET?.trim() || toml.secret_key;

  const hasAuth = Boolean(apiKey && apiSecret);
  const partialAuth = Boolean(apiKey) || Boolean(apiSecret);
  if (partialAuth && !hasAuth) {
    throw new ConfigError(
      "Partial Pionex API credentials detected.",
      "Set both PIONEX_API_KEY and PIONEX_API_SECRET (env vars or config.toml profile).",
    );
  }

  const baseUrl = (cli.baseUrl?.trim() || process.env.PIONEX_BASE_URL?.trim() || toml.base_url || PIONEX_API_DEFAULT_BASE_URL)
    .replace(/\/+$/, "");
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    throw new ConfigError(`Invalid base URL "${baseUrl}".`, "PIONEX_BASE_URL must start with http:// or https://");
  }

  return {
    apiKey,
    apiSecret,
    hasAuth,
    baseUrl,
    modules: parseModuleList(cli.modules),
    readOnly: cli.readOnly,
  };
}

