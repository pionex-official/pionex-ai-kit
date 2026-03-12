import { z } from "zod";
import { signedGet } from "../common/client.mjs";
import { textContent, errorContent } from "../common/utils.mjs";

/**
 * Register account tools (require auth).
 * @param { import('@modelcontextprotocol/sdk/server/mcp.js').McpServer } server
 */
export function registerAccountTools(server) {
  server.tool(
    "pionex.account.get_balance",
    { schema: z.object({}) },
    async () => {
      try {
        const data = await signedGet("/api/v1/account/balances");
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );
}

