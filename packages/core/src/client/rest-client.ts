import crypto from "node:crypto";
import type { PionexConfig } from "../config.js";
import { PionexApiError, ConfigError } from "../utils/errors.js";
import type { HttpMethod, QueryParams, RequestResult } from "./types.js";

function requireAuth(config: PionexConfig): { apiKey: string; apiSecret: string } {
  if (!config.apiKey || !config.apiSecret) {
    throw new ConfigError(
      "This operation requires authentication, but no Pionex API credentials were found.",
      "Run 'pionex-ai-kit onboard' to create ~/.pionex/config.toml, or set PIONEX_API_KEY and PIONEX_API_SECRET.",
    );
  }
  return { apiKey: config.apiKey, apiSecret: config.apiSecret };
}

function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const entries = Object.entries(query).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "";
  const params = new URLSearchParams();
  for (const [k, v] of entries) params.set(k, String(v));
  return params.toString();
}

function buildSignedRequest(
  config: PionexConfig,
  method: HttpMethod,
  path: string,
  query: QueryParams,
  bodyJson: string | null,
): { url: string; headers: Record<string, string>; bodyJson: string | null } {
  const { apiKey, apiSecret } = requireAuth(config);
  const timestamp = Date.now().toString();
  const params: Record<string, unknown> = { ...query, timestamp };

  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const pathUrl = `${path}?${queryString}`;

  let payload = `${method}${pathUrl}`;
  if (bodyJson != null) payload += bodyJson;
  const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");

  const url = `${config.baseUrl}${pathUrl}`;
  const headers = {
    "PIONEX-KEY": apiKey,
    "PIONEX-SIGNATURE": signature,
    "Content-Type": "application/json",
  };
  return { url, headers, bodyJson };
}

async function readTextSafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export class PionexRestClient {
  private readonly config: PionexConfig;
  public constructor(config: PionexConfig) {
    this.config = config;
  }

  public async publicGet<TData = unknown>(path: string, query: QueryParams = {}): Promise<RequestResult<TData>> {
    const qs = buildQueryString(query);
    const endpoint = qs ? `${path}?${qs}` : path;
    const url = `${this.config.baseUrl}${endpoint}`;
    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint, responseText: txt });
    }
    const data = (await res.json()) as TData;
    return { endpoint, requestTime: new Date().toISOString(), data };
  }

  public async signedGet<TData = unknown>(path: string, query: QueryParams = {}): Promise<RequestResult<TData>> {
    const { url, headers } = buildSignedRequest(this.config, "GET", path, query, null);
    const endpoint = `${path}?${buildQueryString({ ...query, timestamp: "..." })}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path, responseText: txt });
    }
    const data = (await res.json()) as TData;
    return { endpoint: path, requestTime: new Date().toISOString(), data };
  }

  public async signedPost<TData = unknown>(path: string, body: Record<string, unknown>): Promise<RequestResult<TData>> {
    const bodyJson = JSON.stringify(body);
    const { url, headers, bodyJson: bj } = buildSignedRequest(this.config, "POST", path, {}, bodyJson);
    const res = await fetch(url, { method: "POST", headers, body: bj ?? undefined });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path, responseText: txt });
    }
    const data = (await res.json()) as TData;
    return { endpoint: path, requestTime: new Date().toISOString(), data };
  }

  public async signedDelete<TData = unknown>(path: string, body: Record<string, unknown>): Promise<RequestResult<TData>> {
    const bodyJson = JSON.stringify(body);
    const { url, headers, bodyJson: bj } = buildSignedRequest(this.config, "DELETE", path, {}, bodyJson);
    const res = await fetch(url, { method: "DELETE", headers, body: bj ?? undefined });
    if (!res.ok) {
      const txt = await readTextSafe(res);
      throw new PionexApiError(`HTTP ${res.status}: ${txt || res.statusText}`, { status: res.status, endpoint: path, responseText: txt });
    }
    const data = (await res.json()) as TData;
    return { endpoint: path, requestTime: new Date().toISOString(), data };
  }
}

