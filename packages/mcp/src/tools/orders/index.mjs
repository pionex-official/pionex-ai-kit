import { z } from "zod";
import { signedGet, signedPost, signedDelete } from "../common/client.mjs";
import { textContent, errorContent } from "../common/utils.mjs";

export function registerOrdersTools(server) {
  server.tool(
    "pionex.orders.new_order",
    "Create a spot order on Pionex. " +
      "For LIMIT orders, you must provide `symbol`, `side`, `type=\"LIMIT\"`, `price` and `size` (quantity). " +
      "For MARKET BUY orders, you must provide `symbol`, `side=\"BUY\"`, `type=\"MARKET\"`, and `amount` (quote amount to spend). " +
      "For MARKET SELL orders, you must provide `symbol`, `side=\"SELL\"`, `type=\"MARKET\"`, and `size` (base quantity). " +
      "Common error codes: TRADE_AMOUNT_FILTER_DENIED, TRADE_SIZE_FILTER_DENIED, TRADE_NOT_ENOUGH_MONEY, TRADE_INVALID_SYMBOL.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        side: z.enum(["BUY", "SELL"]),
        type: z.enum(["LIMIT", "MARKET"]),
        clientOrderId: z.string().max(64).optional(),
        size: z.string().optional().describe("Quantity; required for limit and market sell"),
        price: z.string().optional().describe("Required for limit order"),
        amount: z.string().optional().describe("Buying amount; required for market buy"),
        IOC: z.boolean().optional().describe("Immediate-or-cancel, default false"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const body = {};
        if (params.symbol) body.symbol = params.symbol;
        if (params.side) body.side = params.side;
        if (params.type) body.type = params.type;
        if (params.clientOrderId != null) body.clientOrderId = params.clientOrderId;
        if (params.size != null) body.size = params.size;
        if (params.price != null) body.price = params.price;
        if (params.amount != null) body.amount = params.amount;
        if (params.IOC != null) body.IOC = params.IOC;
        const data = await signedPost("/api/v1/trade/order", body);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.get_order",
    "Get a single order by order ID.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        orderId: z.number().int().describe("Order id"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, orderId } = params;
        const data = await signedGet("/api/v1/trade/order", { symbol, orderId });
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.get_order_by_client_order_id",
    "Get a single order by client order ID.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        clientOrderId: z.string().describe("Client order id"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, clientOrderId } = params;
        const data = await signedGet("/api/v1/trade/orderByClientOrderId", { symbol, clientOrderId });
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.get_open_orders",
    "List open (unfilled) orders for a symbol.",
    { schema: z.object({ symbol: z.string().describe("e.g. BTC_USDT") }) },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol } = params;
        const data = await signedGet("/api/v1/trade/openOrders", { symbol });
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.get_all_orders",
    "List order history for a symbol (filled and cancelled), with optional limit.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        limit: z.number().int().min(1).max(100).optional().describe("Default 1"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, limit } = params;
        const q = { symbol };
        if (limit != null) q.limit = limit;
        const data = await signedGet("/api/v1/trade/allOrders", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.cancel_order",
    "Cancel an open order by order ID.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        orderId: z.number().int().describe("Order id"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, orderId } = params;
        const data = await signedDelete("/api/v1/trade/order", { symbol, orderId });
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.get_fills",
    "Get filled trades (fills) for a symbol in a time range. Requires API key. Returns up to 100 latest fills.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
        startTime: z.number().int().optional().describe("Start time in milliseconds."),
        endTime: z.number().int().optional().describe("End time in milliseconds."),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol, startTime, endTime } = params;
        const q = { symbol };
        if (startTime != null) q.startTime = startTime;
        if (endTime != null) q.endTime = endTime;
        const data = await signedGet("/api/v1/trade/fills", q);
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );

  server.tool(
    "pionex.orders.cancel_all_orders",
    "Cancel all open orders for a symbol.",
    {
      schema: z.object({
        symbol: z.string().describe("e.g. BTC_USDT"),
      }),
    },
    async (paramsRaw) => {
      try {
        const params =
          paramsRaw && typeof paramsRaw.schema === "object" ? paramsRaw.schema : paramsRaw;
        const { symbol } = params;
        const data = await signedDelete("/api/v1/trade/allOrders", { symbol });
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );
}
