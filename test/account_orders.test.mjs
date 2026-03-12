import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { createTestClient } from "./helpers/mcp-client.mjs";

const hasCredentials = Boolean(process.env.PIONEX_API_KEY && process.env.PIONEX_API_SECRET);

describe("pionex account & orders tools", () => {
  let client = null;

  beforeAll(async () => {
    client = await createTestClient();
  });

  afterAll(async () => {
    await client?.close();
  });

  test("get_balance requires auth (no credentials)", async () => {
    const noAuthClient = await createTestClient({
      PIONEX_API_KEY: undefined,
      PIONEX_API_SECRET: undefined,
    });

    try {
      const result = await noAuthClient.callTool({
        name: "pionex.account.get_balance",
        arguments: {},
      });
      expect(result.isError).toBe(true);
      const text = /** @type {{ text: string }} */ (result.content[0]).text;
      expect(text).toContain("PIONEX_API_KEY");
    } finally {
      await noAuthClient.close();
    }
  });

  test.skipIf(!hasCredentials)("get_balance returns data with credentials", async () => {
    const result = await client.callTool({
      name: "pionex.account.get_balance",
      arguments: {},
    });
    expect(result.isError).toBeFalsy();
    expect(result.content.length).toBeGreaterThan(0);
  });

  test.skipIf(!hasCredentials)("new_order then get_order works end-to-end (symbol BTC_USDT)", async () => {
    // 注意：如果连接的是真实账户，这个测试会真的下单。
    // 建议先在测试环境或极小下单金额上验证。
    const create = await client.callTool({
      name: "pionex.orders.new_order",
      arguments: {
        symbol: "BTC_USDT",
        side: "BUY",
        type: "LIMIT",
        size: "0.0001",
        price: "1000", // 故意远离市价以降低成交概率
        IOC: false,
      },
    });

    expect(create.isError).toBeFalsy();
    const createText = /** @type {{ text: string }} */ (create.content[0]).text;
    const createJson = JSON.parse(createText);
    const orderId = createJson?.data?.orderId;
    expect(orderId).toBeTruthy();

    const get = await client.callTool({
      name: "pionex.orders.get_order",
      arguments: {
        symbol: "BTC_USDT",
        orderId,
      },
    });

    expect(get.isError).toBeFalsy();
    const getText = /** @type {{ text: string }} */ (get.content[0]).text;
    const getJson = JSON.parse(getText);
    expect(getJson?.data?.orderId).toBe(orderId);
  });
});
