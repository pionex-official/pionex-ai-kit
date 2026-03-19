import type { PionexConfig } from "../config.js";
import type { PionexRestClient } from "../client/rest-client.js";
import { MODULES, type ModuleId } from "../constants.js";
import type { ToolArgs, ToolSpec } from "./types.js";
import { registerMarketTools } from "./market.js";
import { registerAccountTools } from "./account.js";
import { registerOrdersTools } from "./orders.js";

function allToolSpecs(): ToolSpec[] {
  return [...registerMarketTools(), ...registerAccountTools(), ...registerOrdersTools()];
}

export function buildTools(config: PionexConfig): ToolSpec[] {
  const enabled = new Set(config.modules);
  const tools = allToolSpecs().filter((t) => enabled.has(t.module));
  if (!config.readOnly) return tools;
  return tools.filter((t) => !t.isWrite);
}

export interface ToolResult {
  endpoint: string;
  requestTime: string;
  data: unknown;
}

export type ToolRunner = (toolName: string, args: ToolArgs) => Promise<ToolResult>;

/**
 * Create a function that can call any registered tool by name.
 * For CLI usage we keep module filtering at the command routing level,
 * but the runner itself knows all tools.
 */
export function createToolRunner(client: PionexRestClient, config: PionexConfig): ToolRunner {
  const fullConfig: PionexConfig = { ...config, modules: [...MODULES] as ModuleId[] };
  const toolMap = new Map<string, ToolSpec>(allToolSpecs().map((t) => [t.name, t]));

  return async (toolName: string, args: ToolArgs): Promise<ToolResult> => {
    const tool = toolMap.get(toolName);
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    const data = await tool.handler(args, { config: fullConfig, client });
    return { endpoint: toolName, requestTime: new Date().toISOString(), data };
  };
}

