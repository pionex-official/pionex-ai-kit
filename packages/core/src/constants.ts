export const PIONEX_API_DEFAULT_BASE_URL = "https://api.pionex.com";

export const MODULES = ["market", "account", "orders", "bot"] as const;
export type ModuleId = (typeof MODULES)[number];

export const DEFAULT_MODULES: ModuleId[] = ["market", "account", "orders", "bot"];

