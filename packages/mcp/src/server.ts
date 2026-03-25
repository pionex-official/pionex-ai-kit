import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  PionexRestClient,
  buildTools,
  MODULES,
  toToolErrorPayload,
  toMcpTool,
  type PionexConfig,
  type ModuleId,
  type ToolSpec,
} from "@pionex-ai/core";

const SERVER_NAME = "pionex-trade-mcp";

function resolveServerVersion(): string {
  try {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: unknown };
    return typeof parsed.version === "string" && parsed.version.length > 0 ? parsed.version : "0.0.0-unknown";
  } catch {
    return "0.0.0-unknown";
  }
}

const SERVER_VERSION = resolveServerVersion();

const SYSTEM_CAPABILITIES_TOOL_NAME = "system_get_capabilities";
const SYSTEM_CAPABILITIES_TOOL: Tool = {
  name: SYSTEM_CAPABILITIES_TOOL_NAME,
  description: "Return machine-readable server capabilities and module availability for agent planning.",
  inputSchema: { type: "object", additionalProperties: false },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

type ModuleCapabilityStatus = "enabled" | "disabled" | "requires_auth";

interface CapabilitySnapshot {
  readOnly: boolean;
  hasAuth: boolean;
  moduleAvailability: Record<
    ModuleId,
    {
      status: ModuleCapabilityStatus;
      reasonCode?: string;
    }
  >;
}

function buildCapabilitySnapshot(config: PionexConfig): CapabilitySnapshot {
  const enabledModules = new Set(config.modules);
  const moduleAvailability = {} as CapabilitySnapshot["moduleAvailability"];

  for (const moduleId of MODULES) {
    if (!enabledModules.has(moduleId)) {
      moduleAvailability[moduleId] = { status: "disabled", reasonCode: "MODULE_FILTERED" };
      continue;
    }
    if (moduleId === "market") {
      moduleAvailability[moduleId] = { status: "enabled" };
      continue;
    }
    if (!config.hasAuth) {
      moduleAvailability[moduleId] = { status: "requires_auth", reasonCode: "AUTH_MISSING" };
      continue;
    }
    moduleAvailability[moduleId] = { status: "enabled" };
  }

  return {
    readOnly: config.readOnly,
    hasAuth: config.hasAuth,
    moduleAvailability,
  };
}

function successResult(toolName: string, data: unknown, snapshot: CapabilitySnapshot): CallToolResult {
  const payload: Record<string, unknown> = {
    tool: toolName,
    ok: true,
    data,
    capabilities: snapshot,
    timestamp: new Date().toISOString(),
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function errorResult(toolName: string, error: unknown, snapshot: CapabilitySnapshot): CallToolResult {
  const payload = toToolErrorPayload(error);
  const structured: Record<string, unknown> = {
    tool: toolName,
    ...payload,
    serverVersion: SERVER_VERSION,
    capabilities: snapshot,
  };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

export function createServer(config: PionexConfig): Server {
  const client = new PionexRestClient(config);
  const tools = buildTools(config);
  const toolMap = new Map<string, ToolSpec>(tools.map((t) => [t.name, t]));

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: [...tools.map(toMcpTool), SYSTEM_CAPABILITIES_TOOL] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const snapshot = buildCapabilitySnapshot(config);

    if (toolName === SYSTEM_CAPABILITIES_TOOL_NAME) {
      return successResult(
        toolName,
        {
          server: { name: SERVER_NAME, version: SERVER_VERSION },
          capabilities: snapshot,
        },
        snapshot,
      );
    }

    const tool = toolMap.get(toolName);
    if (!tool) {
      return errorResult(toolName, new Error(`Tool "${toolName}" is not available in this server session.`), snapshot);
    }

    try {
      const data = await tool.handler(request.params.arguments ?? {}, { config, client });
      return successResult(toolName, data, snapshot);
    } catch (e) {
      return errorResult(toolName, e, snapshot);
    }
  });

  return server;
}

