import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Start a pionex-mcp server as a child process over stdio and return an MCP client.
 */
export async function createTestClient(extraEnv = {}) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.mjs"],
    env: { ...process.env, ...extraEnv },
  });

  const client = new Client({ name: "pionex-test-client", version: "1.0" });
  await client.connect(transport);
  return client;
}
