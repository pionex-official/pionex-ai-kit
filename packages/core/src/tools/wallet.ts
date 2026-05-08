import type { ToolSpec } from "./types.js";

export function registerWalletTools(): ToolSpec[] {
  return [
    {
      name: "pionex_wallet_get_balance_full",
      module: "wallet",
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
