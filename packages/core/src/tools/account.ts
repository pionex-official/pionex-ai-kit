import type { ToolSpec } from "./types.js";

export function registerAccountTools(): ToolSpec[] {
  return [
    {
      name: "pionex_account_get_balance",
      module: "account",
      isWrite: false,
      description: "Query spot account balances for all currencies. Requires API key and secret in ~/.pionex/config.toml or env.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      async handler(_args, { client }) {
        return (await client.signedGet("/api/v1/account/balances")).data;
      },
    },
    {
      name: "pionex_account_get_balance_full",
      module: "account",
      isWrite: false,
      description:
        "Query full account balance overview including spot (Bot Account) and futures (Trader Account), with per-coin price info and total USDT/BTC valuations. Requires authentication.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          appLang: { type: "string", description: "App language, e.g. 'en' or 'zh' (takes priority over sysLang)" },
          sysLang: { type: "string", description: "System language fallback when appLang is not set" },
        },
      },
      async handler(args, { client }) {
        return (await client.signedGet("/api/v1/wallet/balancesFull", args as Record<string, string>)).data;
      },
    },
  ];
}

