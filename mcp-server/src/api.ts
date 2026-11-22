/** Thin JSON client for the cooking app's /api routes. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** zod fieldErrors from a 400: { field: [messages] } */
    readonly details?: Record<string, string[] | undefined>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thrown before any request when mcp-server/.env has no key. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("CLANG_AUTH_API_KEY is not set");
    this.name = "MissingApiKeyError";
  }
}

type Query = Record<string, string | number | undefined>;

export interface CookingApi {
  /** e.g. https://cooking.clintonlangosch.com, no trailing slash */
  baseUrl: string;
  get<T>(path: string, query?: Query): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
}

export function cookingApi(
  baseUrl: string,
  authFetch: (input: string | URL, init?: RequestInit) => Promise<Response>
): CookingApi {
  const base = baseUrl.replace(/\/+$/, "");

  async function request<T>(method: string, path: string, query?: Query, body?: unknown): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const res = await authFetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const err = (json ?? {}) as { error?: string; details?: Record<string, string[]> };
      throw new ApiError(res.status, err.error ?? (text.slice(0, 200) || res.statusText), err.details);
    }
    return json as T;
  }

  return {
    baseUrl: base,
    get: (path, query) => request("GET", path, query),
    post: (path, body) => request("POST", path, undefined, body),
    put: (path, body) => request("PUT", path, undefined, body),
  };
}
