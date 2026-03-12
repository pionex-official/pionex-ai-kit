import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { createTestClient } from "./helpers/mcp-client.mjs";

let client = null;

describe("pionex market tools", () => {
  beforeAll(async () => {
    client = await createTestClient();
  });

  afterAll(async () => {
    await client?.close();
  });

  test("get_depth returns bids/asks for BTC_USDT", async () => {
    const result = await client.callTool({
      name: "pionex.market.get_depth",
      arguments: { symbol: "BTC_USDT", limit: 5 },
    });

    expect(result.isError).toBeFalsy();
    const text = /** @type {{ text: string }} */ (result.content[0]).text;
    expect(text).toContain("bids");
    expect(text).toContain("asks");
  });

  test("get_trades returns trades array for BTC_USDT", async () => {
    const result = await client.callTool({
      name: "pionex.market.get_trades",
      arguments: { symbol: "BTC_USDT", limit: 5 },
    });

    expect(result.isError).toBeFalsy();
    const text = /** @type {{ text: string }} */ (result.content[0]).text;
    const json = JSON.parse(text);
    expect(json?.data?.trades?.length).toBeGreaterThan(0);
  });
});
