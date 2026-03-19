import type { ModuleId } from "../constants.js";
import type { PionexConfig } from "../config.js";
import type { PionexRestClient } from "../client/rest-client.js";

export type JsonSchema =
  | {
      type: "object";
      properties?: Record<string, JsonSchema>;
      required?: string[];
      additionalProperties?: boolean;
      description?: string;
      enum?: string[];
    }
  | { type: "string"; description?: string; enum?: string[] }
  | { type: "number"; description?: string }
  | { type: "integer"; description?: string }
  | { type: "boolean"; description?: string }
  | { type: "array"; items: JsonSchema; description?: string }
  | { type: "null" };

export interface ToolContext {
  config: PionexConfig;
  client: PionexRestClient;
}

export type ToolArgs = Record<string, unknown>;

export interface ToolSpec {
  name: string;
  description: string;
  module: ModuleId;
  isWrite: boolean;
  inputSchema: JsonSchema;
  handler: (args: ToolArgs, ctx: ToolContext) => Promise<unknown>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}

export function toMcpTool(tool: ToolSpec): McpTool {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      readOnlyHint: !tool.isWrite,
      destructiveHint: tool.isWrite,
      idempotentHint: !tool.isWrite,
      openWorldHint: false,
    },
  };
}

