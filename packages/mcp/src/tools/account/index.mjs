import { z } from "zod";
import { signedGet } from "../common/client.mjs";
import { textContent, errorContent } from "../common/utils.mjs";

export function registerAccountTools(server) {
  server.tool(
    "pionex.account.get_balance",
    {
      // Accept any input; handler ignores params.
      // This avoids incompatibilities between clients that send {} vs { schema: {} }.
      schema: z.any(),
    },
    async (paramsRaw) => {
      try {
        // Some clients (or adapters) may wrap arguments as { schema: {...} }.
        // For this zero-arg tool we just normalize and ignore them.
        const _params =
          paramsRaw && typeof paramsRaw.schema === "object"
            ? paramsRaw.schema
            : paramsRaw ?? {};

        const data = await signedGet("/api/v1/account/balances");
        return textContent(data);
      } catch (e) {
        return errorContent(e);
      }
    }
  );
}
