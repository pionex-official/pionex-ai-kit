export class ConfigError extends Error {
  public readonly suggestion?: string;
  public constructor(message: string, suggestion?: string) {
    super(message);
    this.name = "ConfigError";
    this.suggestion = suggestion;
  }
}

export class PionexApiError extends Error {
  public readonly status?: number;
  public readonly endpoint?: string;
  public readonly responseText?: string;
  public constructor(
    message: string,
    opts?: { status?: number; endpoint?: string; responseText?: string },
  ) {
    super(message);
    this.name = "PionexApiError";
    this.status = opts?.status;
    this.endpoint = opts?.endpoint;
    this.responseText = opts?.responseText;
  }
}

export function toToolErrorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof ConfigError) {
    return {
      error: true,
      type: "ConfigError",
      message: error.message,
      suggestion: error.suggestion,
    };
  }
  if (error instanceof PionexApiError) {
    return {
      error: true,
      type: "PionexApiError",
      message: error.message,
      status: error.status,
      endpoint: error.endpoint,
      responseText: error.responseText,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: true, type: "Error", message };
}

