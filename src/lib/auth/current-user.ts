import { cache } from "react";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  ACCESS_COOKIE,
  displayName,
  loginUrl,
  resolveToken,
  type AuthState,
  type Identity,
  type Role,
} from "./clang-auth";

/**
 * Server-side auth for route handlers and server components. The only
 * supported way to ask "who is signed in?" in this app.
 *
 * The local User document stays the record recipes, saved recipes and
 * ingredients point at. clang-auth's `sub` maps to it through
 * User.clangAuthSub, which scripts/migrate-clang-auth-sub.ts filled for the
 * users who existed before the migration. We never look users up by email.
 */

export interface CurrentUser {
  /** User._id as a string: compare with recipe.authorId.toString() etc. */
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  /** Access-token expiry, seconds since the epoch. */
  exp: number;
}

/** `cache()` dedupes within one request, so a layout and its page verify once. */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const cookieStore = await cookies();
  return resolveToken(cookieStore.get(ACCESS_COOKIE)?.value);
});

async function findOrCreateUser(identity: Identity) {
  await connectDB();
  let user = await User.findOne({ clangAuthSub: identity.sub });
  if (!user) {
    try {
      user = await User.create({
        name: displayName(identity),
        email: identity.email,
        clangAuthSub: identity.sub,
        role: identity.role,
      });
    } catch (err) {
      // A concurrent request created it first: use that one.
      user = await User.findOne({ clangAuthSub: identity.sub });
      if (!user) {
        // Most likely an existing user the migration didn't map (email is
        // unique). Fail loudly rather than redirect, which would loop.
        throw new Error(
          `No User is linked to clang-auth user ${identity.sub}, and creating one failed. ` +
            "Add them to the mapping and rerun scripts/migrate-clang-auth-sub.ts.",
          { cause: err }
        );
      }
    }
  }

  // The grant is the source of truth for the role; keep the DB copy in step.
  const updates: { role?: Role; name?: string } = {};
  if (user.role !== identity.role) updates.role = identity.role;
  if (identity.name && identity.name !== user.name) updates.name = identity.name;
  if (Object.keys(updates).length > 0) {
    await User.updateOne({ _id: user._id }, { $set: updates });
    Object.assign(user, updates);
  }
  return user;
}

/** The signed-in user with access to this app, or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const state = await getAuthState();
  if (state.status !== "ok") return null;
  const user = await findOrCreateUser(state.identity);
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: state.identity.role,
    exp: state.identity.exp,
  };
});

type Guard = { user: CurrentUser; response?: never } | { user?: never; response: NextResponse };

/** For route handlers: the user, or the 401/403 response to return. */
export async function requireUser(): Promise<Guard> {
  const state = await getAuthState();
  if (state.status === "anonymous") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (state.status === "forbidden") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: (await getCurrentUser())! };
}

/** For admin route handlers: like requireUser, plus 403 unless the grant has `admin`. */
export async function requireAdmin(): Promise<Guard> {
  const guard = await requireUser();
  if (guard.response) return guard;
  if (guard.user.role !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return guard;
}

/**
 * Sign-in URL that returns to `path` on this app. For server components,
 * which don't see the request URL; src/proxy.ts builds its own.
 */
export async function loginUrlFor(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return loginUrl(`${proto}://${host}${path}`);
}
