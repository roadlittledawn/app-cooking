/**
 * Exchange a clang-auth API key for short-lived access tokens, and call the
 * app with them. Ported from clang-auth's examples/node-app/src/api-key-client.ts
 * (docs/integration-guide.md §8); keep the two in step if the contract changes.
 *
 * The token is cached until `refreshSkewSeconds` before it expires (tokens
 * live 15 minutes), concurrent callers share one exchange, and a 401 from the
 * app triggers one fresh exchange and a retry, so bodies must be re-sendable
 * (the API client sends JSON strings). Tokens live only in memory.
 */

export interface ApiKeyClientConfig {
  /** e.g. https://auth.clintonlangosch.com */
  authBaseUrl: string;
  /** ca_key_…, created on <authBaseUrl>/keys?app=cooking */
  apiKey: string;
  /** Re-exchange this many seconds before expiry. Default 60, capped at half the token's lifetime. */
  refreshSkewSeconds?: number;
  fetch?: typeof fetch;
  /** Tests only. */
  now?: () => number;
}

/** POST /api/token answered 401: revoked or expired key, disabled user, or no grant. */
export class ApiKeyRejectedError extends Error {
  constructor() {
    super("clang-auth rejected the API key (revoked, expired, user disabled or grant removed)");
    this.name = "ApiKeyRejectedError";
  }
}

export interface ApiKeyClient {
  /** A valid access token, exchanging the API key when needed. */
  token(): Promise<string>;
  /** `fetch` with `Authorization: Bearer <access token>`; retries once on 401. */
  fetch(input: string | URL, init?: RequestInit): Promise<Response>;
}

export function apiKeyClient(cfg: ApiKeyClientConfig): ApiKeyClient {
  const doFetch = cfg.fetch ?? fetch;
  const now = cfg.now ?? Date.now;
  const skew = (cfg.refreshSkewSeconds ?? 60) * 1000;
  let cached: { token: string; refreshAt: number } | undefined;
  let inflight: Promise<string> | undefined;

  async function exchange(): Promise<string> {
    const res = await doFetch(new URL("/api/token", cfg.authBaseUrl), {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.apiKey}` },
    });
    if (res.status === 401) throw new ApiKeyRejectedError();
    if (!res.ok) throw new Error(`clang-auth /api/token failed: ${res.status}`);
    const body = (await res.json()) as { token: string; expires_in: number };
    const lifetime = body.expires_in * 1000;
    // Never refresh earlier than halfway, so short lifetimes still cache.
    cached = { token: body.token, refreshAt: now() + lifetime - Math.min(skew, lifetime / 2) };
    return body.token;
  }

  async function token(): Promise<string> {
    if (cached && now() < cached.refreshAt) return cached.token;
    inflight ??= exchange().finally(() => (inflight = undefined));
    return inflight;
  }

  async function authFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
    const send = async (t: string) => {
      const headers = new Headers(init.headers);
      headers.set("authorization", `Bearer ${t}`);
      return doFetch(input, { ...init, headers });
    };
    const used = await token();
    const res = await send(used);
    if (res.status !== 401) return res;
    // Drop the token only if it's still the one that failed: when several
    // requests get 401 at once, they then share a single re-exchange.
    if (cached?.token === used) cached = undefined;
    return send(await token());
  }

  return { token, fetch: authFetch };
}
