export function toText(value) {
  return JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export function textContent(value) {
  return { content: [{ type: "text", text: toText(value) }] };
}

export function errorContent(err) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}
