export { stringify as tomlStringify } from 'smol-toml';

interface PionexProfile {
    api_key?: string;
    secret_key?: string;
    base_url?: string;
}
interface PionexTomlConfig {
    default_profile?: string;
    profiles: Record<string, PionexProfile>;
}
/** Fixed path: ~/.pionex/config.toml */
declare function configFilePath(): string;
declare function readFullConfig(): PionexTomlConfig;
declare function readTomlProfile(profileName?: string): PionexProfile;
declare function writeFullConfig(config: PionexTomlConfig): void;

type ClientId = "claude-desktop" | "cursor" | "windsurf" | "vscode" | "claude-code" | "openclaw" | "codex";
declare const SUPPORTED_CLIENTS: ClientId[];
declare function getConfigPath(client: ClientId): string | null;
interface SetupOptions {
    client: ClientId;
}
declare function runSetup(options: SetupOptions): void;
declare function printSetupUsage(): void;

declare const PIONEX_API_DEFAULT_BASE_URL = "https://api.pionex.com";
declare const MODULES: readonly ["market", "account", "wallet", "orders", "bot", "earn_dual"];
type ModuleId = (typeof MODULES)[number];
declare const DEFAULT_MODULES: ModuleId[];

interface CliOptions {
    modules?: string;
    readOnly: boolean;
    profile?: string;
    baseUrl?: string;
}
interface PionexConfig {
    apiKey?: string;
    apiSecret?: string;
    hasAuth: boolean;
    baseUrl: string;
    modules: ModuleId[];
    readOnly: boolean;
}
/**
 * Credential priority (highest to lowest):
 *   1. Environment variables (PIONEX_API_KEY / PIONEX_API_SECRET)
 *   2. ~/.pionex/config.toml profile values
 */
declare function loadConfig(cli: CliOptions): PionexConfig;

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;
interface RequestResult<TData = unknown> {
    endpoint: string;
    requestTime: string;
    data: TData;
}

declare class PionexRestClient {
    private readonly config;
    constructor(config: PionexConfig);
    publicGet<TData = unknown>(path: string, query?: QueryParams): Promise<RequestResult<TData>>;
    signedGet<TData = unknown>(path: string, query?: QueryParams): Promise<RequestResult<TData>>;
    signedPost<TData = unknown>(path: string, body: Record<string, unknown>): Promise<RequestResult<TData>>;
    signedDelete<TData = unknown>(path: string, body: Record<string, unknown>): Promise<RequestResult<TData>>;
    signedDeleteQuery<TData = unknown>(path: string, query?: QueryParams): Promise<RequestResult<TData>>;
}

type JsonSchema = {
    type: "object";
    properties?: Record<string, JsonSchema>;
    required?: string[];
    additionalProperties?: boolean;
    description?: string;
    enum?: string[];
} | {
    type: "string";
    description?: string;
    enum?: string[];
} | {
    type: "number";
    description?: string;
} | {
    type: "integer";
    description?: string;
} | {
    type: "boolean";
    description?: string;
} | {
    type: "array";
    items: JsonSchema;
    description?: string;
} | {
    type: "null";
};
interface ToolContext {
    config: PionexConfig;
    client: PionexRestClient;
}
type ToolArgs = Record<string, unknown>;
interface ToolSpec {
    name: string;
    description: string;
    module: ModuleId;
    isWrite: boolean;
    inputSchema: JsonSchema;
    handler: (args: ToolArgs, ctx: ToolContext) => Promise<unknown>;
}
interface McpTool {
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
declare function toMcpTool(tool: ToolSpec): McpTool;

declare function buildTools(config: PionexConfig): ToolSpec[];
interface ToolResult {
    endpoint: string;
    requestTime: string;
    data: unknown;
}
type ToolRunner = (toolName: string, args: ToolArgs) => Promise<ToolResult>;
/**
 * Create a function that can call any registered tool by name.
 * For CLI usage we keep module filtering at the command routing level,
 * but the runner itself knows all tools.
 */
declare function createToolRunner(client: PionexRestClient, config: PionexConfig): ToolRunner;

declare class ConfigError extends Error {
    readonly suggestion?: string;
    constructor(message: string, suggestion?: string);
}
declare class PionexApiError extends Error {
    readonly status?: number;
    readonly endpoint?: string;
    readonly responseText?: string;
    constructor(message: string, opts?: {
        status?: number;
        endpoint?: string;
        responseText?: string;
    });
}
declare function toToolErrorPayload(error: unknown): Record<string, unknown>;

/**
 * Mirrors openapi_bot.yaml — CreateFuturesGridRequest + CreateFuturesGridOrderData.
 * https://github.com/pionex-official/pionex-open-api/blob/main/openapi_bot.yaml
 */

/** Every property under CreateFuturesGridOrderData (OpenAPI); no other keys allowed. */
declare const CREATE_FUTURES_GRID_ORDER_DATA_KEYS: readonly ["top", "bottom", "row", "grid_type", "trend", "leverage", "extraMargin", "quoteInvestment", "condition", "conditionDirection", "lossStopType", "lossStop", "lossStopDelay", "profitStopType", "profitStop", "profitStopDelay", "lossStopHigh", "shareRatio", "investCoin", "investmentFrom", "uiInvestCoin", "lossStopLimitPrice", "lossStopLimitHighPrice", "profitStopLimitPrice", "slippage", "bonusId", "uiExtraData", "movingIndicatorType", "movingIndicatorInterval", "movingIndicatorParam", "movingTrailingUpParam", "cateType", "movingTop", "movingBottom", "enableFollowClosed"];
/** Strip + reject unknown keys; validate types per OpenAPI. Returns body-ready buOrderData. */
declare function parseAndValidateCreateFuturesGridBuOrderData(raw: Record<string, unknown>): Record<string, unknown>;
/** JSON Schema for MCP tool `buOrderData` — matches openapi_bot.yaml CreateFuturesGridOrderData.properties */
declare const createFuturesGridOrderDataJsonSchema: JsonSchema;
/** Full MCP input schema for pionex_bot_futures_grid_create (includes internal __dryRun for CLI). */
declare const createFuturesGridCreateToolInputSchema: JsonSchema;

/**
 * Mirrors openapi_bot.yaml — CreateSpotGridRequest + CreateSpotGridOrderData.
 * https://github.com/pionex-official/pionex-open-api/pull/7
 */

/** Every property under CreateSpotGridOrderData (OpenAPI); no other keys allowed. */
declare const CREATE_SPOT_GRID_ORDER_DATA_KEYS: readonly ["top", "bottom", "row", "gridType", "quoteTotalInvestment", "lossStopType", "lossStop", "lossStopDelay", "profitStopType", "profitStop", "profitStopDelay", "condition", "conditionDirection", "slippage", "closeSellModel"];
/** Strip + reject unknown keys; validate types per OpenAPI. Returns body-ready buOrderData. */
declare function parseAndValidateCreateSpotGridBuOrderData(raw: Record<string, unknown>): Record<string, unknown>;
/** JSON Schema for MCP tool `buOrderData` — matches openapi_bot.yaml CreateSpotGridOrderData.properties */
declare const createSpotGridOrderDataJsonSchema: JsonSchema;
/** Full MCP input schema for pionex_bot_spot_grid_create. */
declare const createSpotGridCreateToolInputSchema: JsonSchema;

export { CREATE_FUTURES_GRID_ORDER_DATA_KEYS, CREATE_SPOT_GRID_ORDER_DATA_KEYS, type CliOptions, type ClientId, ConfigError, DEFAULT_MODULES, MODULES, type McpTool, type ModuleId, PIONEX_API_DEFAULT_BASE_URL, PionexApiError, type PionexConfig, type PionexProfile, PionexRestClient, type PionexTomlConfig, type RequestResult, SUPPORTED_CLIENTS, type SetupOptions, type ToolArgs, type ToolContext, type ToolResult, type ToolRunner, type ToolSpec, buildTools, configFilePath, createFuturesGridCreateToolInputSchema, createFuturesGridOrderDataJsonSchema, createSpotGridCreateToolInputSchema, createSpotGridOrderDataJsonSchema, createToolRunner, getConfigPath, loadConfig, parseAndValidateCreateFuturesGridBuOrderData, parseAndValidateCreateSpotGridBuOrderData, printSetupUsage, readFullConfig, readTomlProfile, runSetup, toMcpTool, toToolErrorPayload, writeFullConfig };
