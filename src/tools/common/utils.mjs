/**
 * Convert a value to JSON string for MCP tool responses.
 */
export function toText(value) {
  return JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

/**
 * Standard MCP tool content: { content: [{ type: "text", text: ... }] }
 */
export function textContent(value) {
  return { content: [{ type: "text", text: toText(value) }] };
}

/**
 * Error response for MCP tools.
 */
export function errorContent(err) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

