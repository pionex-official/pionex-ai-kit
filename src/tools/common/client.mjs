import crypto from "crypto";
import process from "process";
import fetch from "node-fetch";

const API_KEY_ENV = "PIONEX_API_KEY";
const API_SECRET_ENV = "PIONEX_API_SECRET";
const BASE_URL_ENV = "PIONEX_BASE_URL";

export function getBaseUrl() {
  return process.env[BASE_URL_ENV] || "https://api.pionex.com";
}

export function isAuthenticated() {
  return Boolean(process.env[API_KEY_ENV] && process.env[API_SECRET_ENV]);
}

export function requireAuth() {
  if (!isAuthenticated()) {
    throw new Error(
      "This tool requires authentication. Set PIONEX_API_KEY and PIONEX_API_SECRET environment variables."
    );
  }
}

function getApiKey() {
  const v = process.env[API_KEY_ENV];
  if (!v) throw new Error(`Environment variable ${API_KEY_ENV} is required.`);
  return v;
}

function getApiSecret() {
  const v = process.env[API_SECRET_ENV];
  if (!v) throw new Error(`Environment variable ${API_SECRET_ENV} is required.`);
  return v;
}

/**
 * Build query string and signature for a request. For GET: no body. For POST/DELETE: body is JSON string.
 * Returns { url, headers } for fetch.
 */
function buildSignedRequest(method, path, query, bodyJson = null) {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();
  const apiSecret = getApiSecret();
  const timestamp = Date.now().toString();
  const params = { ...query, timestamp };

  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
  const pathUrl = `${path}?${queryString}`;
  let payload = `${method}${pathUrl}`;
  if (bodyJson != null) payload += bodyJson;

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(payload)
    .digest("hex");

  const url = `${baseUrl}${pathUrl}`;
  const headers = {
    "PIONEX-KEY": apiKey,
    "PIONEX-SIGNATURE": signature,
    "Content-Type": "application/json",
  };
  return { url, headers, bodyJson };
}

/**
 * Public GET (no auth). Used for market data.
 */
export async function publicGet(path, query = {}) {
  const baseUrl = getBaseUrl();
  const qs = new URLSearchParams(query).toString();
  const url = qs ? `${baseUrl}${path}?${qs}` : `${baseUrl}${path}`;
  const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Signed GET for private endpoints.
 */
export async function signedGet(path, query = {}) {
  requireAuth();
  const { url, headers } = buildSignedRequest("GET", path, query);
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Signed POST for private endpoints (e.g. new order).
 */
export async function signedPost(path, body) {
  requireAuth();
  const bodyJson = JSON.stringify(body);
  const { url, headers } = buildSignedRequest("POST", path, {}, bodyJson);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: bodyJson,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Signed DELETE with JSON body (e.g. cancel order).
 */
export async function signedDelete(path, body) {
  requireAuth();
  const bodyJson = JSON.stringify(body);
  const { url, headers } = buildSignedRequest("DELETE", path, {}, bodyJson);
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    body: bodyJson,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

