import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, loginUrl, resolveToken } from "./lib/auth/clang-auth";
import { apiWriteDecision } from "./lib/auth/api-write-policy";

/**
 * Next.js 16 Proxy: auth gate for pages, and a CSRF check for API writes.
 *
 * Sessions come from clang-auth (the `ca_access` cookie, see
 * docs/clang-auth-migration.md).
 *
 * - Protected page, signed out → redirect to the auth service's sign-in page,
 *   which returns here afterwards (silently, if a session already exists).
 * - Protected page, signed in without a `cooking` grant → 403. Never a
 *   redirect: it would loop.
 * - API routes pass through: handlers answer 401/403 themselves (requireUser /
 *   requireAdmin), which authFetch() relies on.
 * - State-changing API requests must come from this app's own origin. The
 *   cookie is shared across *.clintonlangosch.com and SameSite=Lax treats
 *   sibling subdomains as same-site, so this blocks forged cross-app requests.
 *   Requests with an `Authorization` header (the local MCP server) skip it but
 *   may not DELETE. See src/lib/auth/api-write-policy.ts.
 *
 * The admin role needs the database, so it's checked in src/app/admin/layout.tsx
 * and in the admin route handlers, not here.
 */

function isProtectedPage(pathname: string): boolean {
  return (
    pathname === "/saved" ||
    pathname.startsWith("/saved/") ||
    pathname === "/recipes/new" ||
    /^\/recipes\/[^/]+\/edit\/?$/.test(pathname) ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * This app's public origin as the browser sees it. From the Host header (or
 * Vercel's x-forwarded-host) rather than nextUrl, which can report the dev
 * server's bind address instead of cooking.localtest.me.
 */
function requestOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

/** Same-origin check for state-changing requests (Origin, else Referer). */
function isSameOrigin(request: NextRequest): boolean {
  const source =
    originOf(request.headers.get("origin")) ?? originOf(request.headers.get("referer"));
  return source === requestOrigin(request);
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const decision = apiWriteDecision(
      request.method,
      request.headers.has("authorization"),
      isSameOrigin(request)
    );
    if (!decision.allow) {
      return NextResponse.json({ error: decision.error }, { status: decision.status });
    }
    return NextResponse.next();
  }

  if (!isProtectedPage(pathname)) {
    return NextResponse.next();
  }

  const auth = await resolveToken(request.cookies.get(ACCESS_COOKIE)?.value);
  if (auth.status === "anonymous") {
    return NextResponse.redirect(loginUrl(`${requestOrigin(request)}${pathname}${search}`));
  }
  if (auth.status === "forbidden") {
    return new NextResponse("You don't have access to Cooking.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
