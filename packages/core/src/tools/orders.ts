import type { ToolSpec } from "./types.js";

export function registerOrdersTools(): ToolSpec[] {
  return [
    {
      name: "pionex_orders_new_order",
      module: "orders",
      isWrite: true,
      description:
        "Create a spot order on Pionex. LIMIT requires symbol/side/type=LIMIT/price/size. MARKET BUY requires amount (quote). MARKET SELL requires size (base).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          side: { type: "string", enum: ["BUY", "SELL"] },
          type: { type: "string", enum: ["LIMIT", "MARKET"] },
          clientOrderId: { type: "string", description: "Optional client order id (max 64 chars)" },
          size: { type: "string", description: "Quantity; required for limit and market sell" },
          price: { type: "string", description: "Required for limit order" },
          amount: { type: "string", description: "Quote amount; required for market buy" },
          IOC: { type: "boolean", description: "Immediate-or-cancel, default false" },
        },
        required: ["symbol", "side", "type"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; order placement is disabled.");
        }
        const body: Record<string, unknown> = {};
        if (args.symbol != null) body.symbol = String(args.symbol);
        if (args.side != null) body.side = String(args.side);
        if (args.type != null) body.type = String(args.type);
        if (args.clientOrderId != null) body.clientOrderId = String(args.clientOrderId);
        if (args.size != null) body.size = String(args.size);
        if (args.price != null) body.price = String(args.price);
        if (args.amount != null) body.amount = String(args.amount);
        if (args.IOC != null) body.IOC = Boolean(args.IOC);
        return (await client.signedPost("/api/v1/trade/order", body)).data;
      },
    },
    {
      name: "pionex_orders_get_order",
      module: "orders",
      isWrite: false,
      description: "Get a single order by order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          orderId: { type: "integer", description: "Order id" },
        },
        required: ["symbol", "orderId"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const orderId = Number(args.orderId);
        return (await client.signedGet("/api/v1/trade/order", { symbol, orderId })).data;
      },
    },
    {
      name: "pionex_orders_get_order_by_client_order_id",
      module: "orders",
      isWrite: false,
      description: "Get a single order by client order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          clientOrderId: { type: "string", description: "Client order id" },
        },
        required: ["symbol", "clientOrderId"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const clientOrderId = String(args.clientOrderId);
        return (await client.signedGet("/api/v1/trade/orderByClientOrderId", { symbol, clientOrderId })).data;
      },
    },
    {
      name: "pionex_orders_get_open_orders",
      module: "orders",
      isWrite: false,
      description: "List open (unfilled) orders for a symbol.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { symbol: { type: "string", description: "e.g. BTC_USDT" } },
        required: ["symbol"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        return (await client.signedGet("/api/v1/trade/openOrders", { symbol })).data;
      },
    },
    {
      name: "pionex_orders_get_all_orders",
      module: "orders",
      isWrite: false,
      description: "List order history for a symbol (filled and cancelled), with optional limit.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          limit: { type: "integer", description: "Default 1 (1-100)" },
        },
        required: ["symbol"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const q: Record<string, unknown> = { symbol };
        if (args.limit != null) q.limit = Number(args.limit);
        return (await client.signedGet("/api/v1/trade/allOrders", q)).data;
      },
    },
    {
      name: "pionex_orders_cancel_order",
      module: "orders",
      isWrite: true,
      description: "Cancel an open order by order ID.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          orderId: { type: "integer", description: "Order id" },
        },
        required: ["symbol", "orderId"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; order cancellation is disabled.");
        }
        const symbol = String(args.symbol);
        const orderId = Number(args.orderId);
        return (await client.signedDelete("/api/v1/trade/order", { symbol, orderId })).data;
      },
    },
    {
      name: "pionex_orders_get_fills",
      module: "orders",
      isWrite: false,
      description: "Get filled trades (fills) for a symbol in a time range. Requires API key. Returns up to 100 latest fills.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string", description: "e.g. BTC_USDT" },
          startTime: { type: "integer", description: "Start time in milliseconds." },
          endTime: { type: "integer", description: "End time in milliseconds." },
        },
        required: ["symbol"],
      },
      async handler(args, { client }) {
        const symbol = String(args.symbol);
        const q: Record<string, unknown> = { symbol };
        if (args.startTime != null) q.startTime = Number(args.startTime);
        if (args.endTime != null) q.endTime = Number(args.endTime);
        return (await client.signedGet("/api/v1/trade/fills", q)).data;
      },
    },
    {
      name: "pionex_orders_cancel_all_orders",
      module: "orders",
      isWrite: true,
      description: "Cancel all open orders for a symbol.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { symbol: { type: "string", description: "e.g. BTC_USDT" } },
        required: ["symbol"],
      },
      async handler(args, { client, config }) {
        if (config.readOnly) {
          throw new Error("Server is running in --read-only mode; cancel-all is disabled.");
        }
        const symbol = String(args.symbol);
        return (await client.signedDelete("/api/v1/trade/allOrders", { symbol })).data;
      },
    },
  ];
}

