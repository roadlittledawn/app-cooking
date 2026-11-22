import { ApiError, MissingApiKeyError } from "./api.js";
import { ApiKeyRejectedError } from "./auth.js";

/**
 * One readable line for the model: what went wrong and, where it can, what
 * to do next. Validation errors name each field so it can fix and retry.
 */
export function toolErrorMessage(err: unknown, authBaseUrl: string): string {
  const keysUrl = `${authBaseUrl.replace(/\/+$/, "")}/keys?app=cooking`;
  const newKey = `Create one at ${keysUrl}, put it in mcp-server/.env as CLANG_AUTH_API_KEY, then reconnect the server with /mcp.`;

  if (err instanceof MissingApiKeyError) {
    return `No API key configured. ${newKey}`;
  }
  if (err instanceof ApiKeyRejectedError) {
    return `clang-auth rejected the API key (revoked, expired, or access removed). ${newKey}`;
  }
  if (err instanceof ApiError) {
    switch (err.status) {
      case 400: {
        const fields = Object.entries(err.details ?? {})
          .filter(([, messages]) => messages && messages.length > 0)
          .map(([field, messages]) => `${field}: ${messages!.join(", ")}`);
        return fields.length > 0
          ? `Validation failed: ${fields.join("; ")}`
          : `Bad request: ${err.message}`;
      }
      case 401:
        return "The cooking app rejected the access token even after a fresh exchange. Check that COOKING_BASE_URL and AUTH_BASE_URL point at the same environment.";
      case 403:
        return `Not allowed (${err.message}). You can only edit your own recipes, and deletes are only available in the web UI.`;
      case 404:
        return `Not found: ${err.message}`;
      default:
        return `Cooking API error ${err.status}: ${err.message}`;
    }
  }
  if (err instanceof TypeError && /fetch failed/i.test(err.message)) {
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    return `Network error: ${cause?.code ?? cause?.message ?? err.message}. Is the server reachable?`;
  }
  return err instanceof Error ? err.message : String(err);
}
