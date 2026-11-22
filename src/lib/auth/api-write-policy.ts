/**
 * What src/proxy.ts does with a state-changing `/api/*` request. Pure, so
 * scripts/test/auth.test.ts can cover every case.
 *
 * - Cookie requests must come from this app's own origin (CSRF: `ca_access`
 *   is shared across *.clintonlangosch.com).
 * - Requests with an `Authorization` header (the local MCP server's Bearer
 *   token) skip that check: browsers never attach the header on their own,
 *   and a cross-site page that sets it triggers a CORS preflight we don't
 *   allow. They may not DELETE: deletes stay in the web UI.
 *
 * The proxy only sees that the header is present. The handler verifies the
 * token (requireUser).
 */

export const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export type ApiWriteDecision =
  | { allow: true }
  | { allow: false; status: 403; error: string };

export function apiWriteDecision(
  method: string,
  hasAuthorization: boolean,
  sameOrigin: boolean
): ApiWriteDecision {
  if (!WRITE_METHODS.includes(method)) return { allow: true };
  if (hasAuthorization) {
    return method === "DELETE"
      ? { allow: false, status: 403, error: "Deletes are only available in the web UI" }
      : { allow: true };
  }
  return sameOrigin
    ? { allow: true }
    : { allow: false, status: 403, error: "Cross-origin request refused" };
}
