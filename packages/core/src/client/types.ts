export type HttpMethod = "GET" | "POST" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface RequestResult<TData = unknown> {
  endpoint: string;
  requestTime: string;
  data: TData;
}

