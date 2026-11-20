# Plan: migrate App Cooking auth to clang-auth

Branch: `feature/clang-auth-migration` (from `develop`). The PR targets `develop`. After that, a release PR from `develop` to `main` deploys to production.

Reference docs, in the clang-auth repo: `docs/integration-guide.md`, `docs/migrating-apps.md` and `docs/how-it-works.md`. Lexicon (`web-wtq`) and the Knowledgebase (`app-knowledgebase`, `docs/clang-auth-migration.md`) were migrated the same way, and this plan reuses their patterns: the token helper, `authFetch`, the session hint, and the CSRF origin check.

## Status

| Part | State |
|---|---|
| Code (Parts 1–4) | **Done** on this branch. `tsc`, lint, `npm run test:auth` (19 tests) and `npm run build` pass, and the build lists `ƒ Proxy (Middleware)`. |
| Migration script | **Done.** Tested against a throwaway local database (link, report, apply, idempotent rerun). |
| Local checks, signed out | **Done.** Protected pages redirect to clang-auth with the right `redirect_uri`, `/login?callbackUrl=//evil.test` returns to `/`, and `/api/me` and protected APIs answer `401`. API writes with a foreign `Origin`, or with neither `Origin` nor `Referer`, get `403`; same-origin ones (by `Origin` or `Referer`) reach the handler. The old host gets a `308` to the new domain with path and query kept, and `/signup`, `/api/invites` and `/api/auth/*` are `404`. |
| Local checks, signed in | **Done** (2026-11-19, minted tokens against local clang-auth). `/api/me` returns the existing `User` linked by the migration; no duplicate is created, and the name syncs from the token. `/saved` lists the user's saved recipe, the owner sees Edit, and admin pages and APIs work. Save, unsave and featured all work same-origin, and the same request with a sibling-subdomain `Origin` gets `403`. A grant with no role gives `role: user` and `403` on admin APIs. No grant gives `403` on `/saved` and `/api/me` while the home page still loads. Not covered: the browser-only parts (the refresh timer, sign-out, and image upload to Blob). |
| P2 | **Done 2026-11-19:** prod app `cooking` (origin `https://cooking.clintonlangosch.com`), with you granted `cooking → admin`. |
| Merge to `develop` | **Done 2026-11-20** (PR #28). |
| P0 | **Done 2026-11-20.** Prod data is in database `test`: 3 users, none linked yet. The owner (admin, password) has 9 recipes, 5 saved and 50 ingredients. The two other users (role `user`) have 1 recipe each; one signed in with a password, the other only with Google. |
| P3 | **Deferred** (decided 2026-11-20). The other two users get no clang-auth account for now. Their recipes, ingredients and saved recipe stay attached to their existing `User` and stay visible; they just can't sign in. See [Adding the other users later](#adding-the-other-users-later). |
| P1, P4, P5 | Not started. P5 links only the owner for now. |

## Goal

- You sign in once at `https://auth.clintonlangosch.com` and are signed in to App Cooking and every other `*.clintonlangosch.com` app you have a grant for.
- **Auth.js is removed entirely**, including the Credentials provider, Google sign-in, `/signup`, invites, and the bcrypt hashes. The app stores no passwords or auth secrets. It verifies a 15-minute ES256 token (`ca_access`) against clang-auth's public JWKS, with no call to the auth service per request.
- Existing recipes, saved lists and ingredients stay attached to the same people. The local `User` document stays the record the data points at. A one-time migration script stores each person's clang-auth `sub` on their `User` before cutover, so at runtime the app only ever looks users up by `sub`.
- Anonymous browsing of recipes behaves exactly as it does now.

**Google sign-in is dropped for now** and comes back later through clang-auth itself ([service-clang-auth-claude#3](https://github.com/roadlittledawn/service-clang-auth-claude/issues/3)). Once that ships, this app needs no code change: former Google users simply sign in with Google on the auth host.

## Current state (what changes)

The app is Next.js 16 with Auth.js (`next-auth@5.0.0-beta.31`), Mongoose/MongoDB, and Vercel (Blob for images). Production is `https://app-cooking.vercel.app`. It has very few users: two other people each have one recipe, and everything else is yours.

> `CLAUDE.md` and `README.md` still describe the SDD scaffold (Express, PostgreSQL, Kubernetes), not the real app. Part 4 fixes them.

| Piece | Today | After |
|---|---|---|
| `src/auth.ts`, `src/auth.config.ts`, `api/auth/[...nextauth]` | Auth.js: Credentials (bcrypt against `User.passwordHash`) and Google (invite-gated, creates the `User`). `User._id` and `role` go into the Auth.js JWT. | Deleted. |
| `src/proxy.ts` | Auth.js `authorized` callback guards `/admin/**` (admin role), `/saved`, `/recipes/new`. The matcher **excludes `/api`**. | Rewritten: verifies `ca_access` on protected pages, plus a CSRF check on `/api` writes. |
| `/login`, `/signup`, `POST /api/auth/signup` | In-app forms. | `/login` redirects to clang-auth. Signup is deleted. |
| `/admin/invites`, `/api/invites`, `Invite` model | Admins add emails that may sign up or use Google. | Deleted. Invites are `clang-auth user create … --grant cooking`. |
| `scripts/seed.ts`, `scripts/reset-admin.ts` | Create or delete the admin `User` with a bcrypt password. | Both deleted (they only seed auth data), along with the `seed` and `reset-admin` npm scripts. |
| About 20 `auth()` call sites | Read `session.user.id` (the Mongo `User._id`) and `session.user.role`. Admin checks are inconsistent: `invites`, `admin/tags` and `admin/ingredients` re-read the role from the DB, while `recipes/[id]/featured` and `recipes/[id]/edit` trust the JWT. | All use `getCurrentUser()`, `requireUser()` or `requireAdmin()`. |
| `header.tsx`, `providers.tsx` | `useSession()`, `signOut()`, `SessionProvider`. | `useAuth()` from a new `AuthProvider`. |
| Foreign keys to `User._id` | `Recipe.authorId`, `SavedRecipe.userId`, `Ingredient.createdBy`. | Unchanged. |

## How it works after the change

```
browser (cooking.clintonlangosch.com)
  │  cookie ca_access (Domain=.clintonlangosch.com, HttpOnly, Secure, 15 min)
  ├─► page / API request ──► src/proxy.ts
  │       POST/PUT/PATCH/DELETE /api/*  → Origin must equal this request's origin, else 403 (CSRF)
  │       protected page, no token      → 302 https://auth.clintonlangosch.com/login?redirect_uri=<url>
  │       protected page, no grant      → 403 (never a redirect: it would loop)
  │       (API auth and the admin role are checked in handlers and in admin/layout.tsx)
  │
  ├─► getCurrentUser()   verify ca_access, require apps.cooking
  │       → User by clangAuthSub (set for existing users by the migration); on a miss, create one
  │       → role from the grant, mirrored into User.role
  │       returns { id: User._id, name, email, image, role }
  │
  ├─► GET /api/me        → { id, name, email, image, role, exp } or 401 (drives the header)
  └─► auth.clintonlangosch.com
        /login?redirect_uri=…          sign in, or bounce straight back if a session exists
        POST /api/session/refresh      new ca_access (credentials: "include")
        POST /logout                   signs out of every app on the domain
```

**Why a CSRF check is new:** today the Auth.js cookie is host-only on `app-cooking.vercel.app`. After the move, every `*.clintonlangosch.com` app is the same *site*, so `SameSite=Lax` no longer stops a sibling subdomain from sending a request that carries `ca_access`.

## Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Subdomain and slug | `cooking.clintonlangosch.com`, slug `cooking` (confirmed) | Convention is subdomain = slug. |
| D2 | Google sign-in | Dropped now. It comes back through clang-auth (#3). | Very few people use it. Keeping Auth.js in parallel would mean two sessions, two invite lists, a two-step sign-out, and a broken Google callback after the domain move (Vercel pins callbacks to `app-cooking.vercel.app`). |
| D3 | `AUTH_MODE` switch | **None.** Cut over directly, as kb and Lexicon did. | A personal app with very few, occasional users. Vercel *Instant Rollback* returns to the previous deployment (old code, old env) in seconds. The bcrypt hashes stay in the DB until cleanup (C2), so rollback still works. |
| D4 | Access rule | A valid token whose `apps` contains `cooking` (any roles). No grant means anonymous on public pages and `403` on protected pages and APIs. | Same rule as the integration guide. |
| D5 | Role source of truth | **The grant.** `role = apps.cooking.includes("admin") ? "admin" : "user"`. When it differs from `User.role`, `User.role` is updated (a cache for any code that reads it). | Same as every other app. One place to change it (`clang-auth grant set`). |
| D6 | Linking to existing users | New field `User.clangAuthSub`, filled for every existing user **by a one-time migration script** (P5) before cutover. At runtime, look up by `sub` only. On a miss, create a new `User` (the grant is the invite); that's the path for people invited later. There's **no link-by-email code at runtime.** | The mapping is decided once, by you, and reviewed in a dry run, instead of being inferred on someone's first sign-in. The runtime code is simpler, and an email that's reused or changed later can never attach to someone else's data. |
| D7 | `User.name` / `User.image` | `name`: kept, and set from `claims.name` when that's non-null and differs. `image`: kept as is (clang-auth has no avatar). | The name shows as the recipe author. Former Google users keep their avatar URL. |
| D8 | How the browser learns `AUTH_BASE_URL` | The root layout (a server component) passes it as a prop to `AuthProvider`. | No new `NEXT_PUBLIC_` var, so no rebuild when it changes. |
| D9 | CSRF origin source | Compare `Origin` (or `Referer`) with the request's own origin. No `APP_ORIGIN` env var. | Same as kb. Works locally, on previews, and in prod. |
| D10 | Preview deployments (`*.vercel.app`) | Public browsing only. Auth is tested locally and on prod. | `ca_access` can't reach `*.vercel.app` ([migrating-apps §5](../../service-clang-auth-claude/docs/migrating-apps.md#previews-and-staging)). |
| D11 | Tests | One `tsx` script, `scripts/test/auth.test.ts`, using `node:assert`, run by `npm run test:auth` and added to PR validation. | There's no test framework in the repo. Same approach as kb. |

## Prerequisites (outside this repo)

| Step | Action |
|---|---|
| P0 | **List existing users**, so each person gets a clang-auth account with the **same email** as their `User` (that's what D6 links on). The prod `MONGODB_URI` has no database name in its path, so the data is in MongoDB's default database, **`test`**. Check that in Atlas before running anything. In `mongosh` against prod: `db.users.find({}, { email: 1, name: 1, role: 1, passwordHash: { $cond: [{ $ifNull: ["$passwordHash", false] }, "password", "google"] } })`. |
| P1 | **Custom domain.** Vercel project → Settings → Domains → **Add Existing** `cooking.clintonlangosch.com`, *alongside* `app-cooking.vercel.app`. Add the `CNAME cooking → <target Vercel shows>` in Netlify DNS (`netlify api createDnsRecord`, zone `66351697a93f241eb3cbe686`). Wait for TLS, then check that `https://cooking.clintonlangosch.com/recipes` serves the current app. Check first that `cooking` is unused and that there are no CAA records (as done for `kb`). |
| P2 | **Register with prod clang-auth.** Run the CLI from outside the clang-auth repo, so it uses the prod config: `clang-auth app create cooking --name Cooking --origin https://cooking.clintonlangosch.com`, then `clang-auth grant set <your email> cooking --role admin`. |
| P3 | **Accounts for the other users** from P0: `clang-auth user create <their email> --name "<name>" --grant cooking`. If they already have a clang-auth account, use `clang-auth grant set <email> cooking` instead. The account must exist before P5, because P5 needs its ID. Sending the setup link (it expires after 72 h; `clang-auth user reset <email>` issues a new one) can wait until after cutover. Their recipes stay visible regardless. |
| P4 | **Vercel env vars, Production and Preview:** `AUTH_BASE_URL=https://auth.clintonlangosch.com`, `AUTH_APP_SLUG=cooking`. Keep `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` until cleanup (C3), so Instant Rollback still has them. |
| P5 | **Run the data migration** (1.11) against prod, after P2–P3 and before the release deploy. Export the mapping with `clang-auth --json user list --app cooking \| jq '[.[] \| {email, sub: .id}]' > /tmp/cooking-subs.json` (the JWT `sub` is the clang-auth user ID). Run `MONGODB_URI='<prod URI>' npm run migrate:clang-auth-sub -- /tmp/cooking-subs.json` (a dry run). The first line it prints is the database name; it should be the one from P0. Review the report, then rerun with `--apply`. It's safe before cutover: the deployed code ignores the new field. |

## Part 1: server side

| Step | Change |
|---|---|
| 1.1 | **Add `jose`** as a direct dependency. |
| 1.2 | **`src/lib/auth/clang-auth.ts`** (new), ported from kb's `src/lib/auth/clang-auth.ts`. `ACCESS_COOKIE = "ca_access"`. `authSettings()` reads `AUTH_BASE_URL` and `AUTH_APP_SLUG`, and throws if either is missing. `verifyAccessToken(token)` uses a module-scoped `createRemoteJWKSet`, `algorithms: ["ES256"]`, `issuer: AUTH_BASE_URL` and `clockTolerance: 30`, and checks that `sub` and `apps` are present. Also `setJwksForTesting()` and `loginUrl(returnTo)`. It must be edge-safe (no Mongoose), because the proxy imports it. |
| 1.3 | **`User` model:** add `clangAuthSub?: string` with **no default**, and the index `{ clangAuthSub: 1 }, { unique: true, partialFilterExpression: { clangAuthSub: { $type: "string" } } }`. (A `sparse` index with `default: null` would still index every `null` and reject the second one.) Make `passwordHash` optional (removed in C2). P5 fills the field for existing documents. |
| 1.4 | **`src/lib/auth/current-user.ts`** (new). `getCurrentUser(): Promise<CurrentUser \| null>`, wrapped in React `cache()` so a layout and a page in one request verify and query once. It reads `ca_access` with `cookies()`, verifies it, requires `apps.cooking` (D4), finds the `User` by `clangAuthSub` or creates one (D6), and syncs `role` and `name` (D5, D7). For a new `User`, `name = claims.name ?? email local part` (the field is required). `CurrentUser = { id, name, email, image, role }`, where `id` is `User._id.toString()`, so comparisons like `recipe.authorId.toString() === user.id` are unchanged. Also `getAuthState(): "ok" \| "anonymous" \| "forbidden"`, plus `requireUser()` and `requireAdmin()`, which return `{ user } \| { response }` with the `401 {"error":"Unauthorized"}` / `403 {"error":"Forbidden"}` JSON that handlers already return. |
| 1.5 | **Replace every `auth()` call** with these helpers. Optional-auth pages (`recipes/[id]` for owner and saved state, `page.tsx`) use `getCurrentUser()`. Required-auth handlers use `requireUser()`; admin handlers use `requireAdmin()`, which ends the DB-versus-JWT inconsistency. Pages that `redirect("/login")` call `redirect(loginUrl(<full URL>))` instead. |
| 1.6 | **Rewrite `src/proxy.ts`.** Widen the matcher to include `/api`. **CSRF:** for `POST/PUT/PATCH/DELETE` under `/api/`, `Origin` (or `Referer`'s origin, if `Origin` is missing) must equal the request's origin, else `403` (D9). **Protected pages** (`/saved`, `/recipes/new`, `/recipes/*/edit`, `/admin/**`): no valid token → `302` to `loginUrl(origin + pathname + search)`; a valid token without the `cooking` grant → `403`. API routes pass through (handlers return `401` and `403` themselves, which `authFetch` needs). The admin *role* is checked in 1.7, because it needs the DB-synced `User`. |
| 1.7 | **`src/app/admin/layout.tsx`** (new): `requireAdmin()`; a non-admin is redirected to `/`. |
| 1.8 | **`GET /api/me`** (new): `CurrentUser` plus the token's `exp`, or `401`. |
| 1.9 | **Delete Auth.js:** `src/auth.ts`, `src/auth.config.ts`, `src/app/api/auth/[...nextauth]/`, `src/app/api/auth/signup/`, `src/app/(auth)/signup/`, `src/app/api/invites/`, `src/app/admin/invites/`, `src/models/Invite.ts` (and its export in `models/index.ts`), `src/lib/validations/auth.ts`, `src/lib/validations/invite.ts`, `src/lib/rate-limit.ts` (only signup uses it), `scripts/seed.ts` and `scripts/reset-admin.ts` (and their npm scripts), and the `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` entry in `next.config.ts`. Remove `next-auth`, `bcrypt` and `@types/bcrypt`. Remove the Invites link from the header's admin menu. |
| 1.10 | **Old-domain redirect** in `next.config.ts` `redirects()`: `source: "/:path*"`, `has: [{ type: "host", value: "app-cooking.vercel.app" }]`, `destination: "https://cooking.clintonlangosch.com/:path*"`, `permanent: true`. The query string is preserved automatically. It matches only the production alias, so previews keep working. |
| 1.11 | **`scripts/migrate-clang-auth-sub.ts`** (new, run with `tsx`; npm script `migrate:clang-auth-sub`). Input: a JSON file of `[{ email, sub }]`. **Dry run by default**; `--apply` writes. For each entry it finds the `User` by lowercase email and sets `clangAuthSub`. It refuses (and reports) when the `sub` is already on a different `User`, or when the `User` already has a different `clangAuthSub`. It's idempotent, so reruns are no-ops. Its report lists four groups: linked, already linked, clang-auth users with no `User` here (they'll get a fresh one on first sign-in), and `User`s with no clang-auth account. Each `User` in that last group gets its counts of `Recipe`, `SavedRecipe` and `Ingredient`, so you can see whose data would be orphaned. It also ensures the unique index from 1.3 exists before writing. It touches only `users.clangAuthSub`. Recipes, saved recipes and ingredients already reference `User._id` and don't change. |

## Part 2: client side

| Step | Change |
|---|---|
| 2.1 | **`src/lib/auth/client.ts`** (new, browser only), ported from kb's `src/lib/auth/client.ts`: `refreshSession()` (`POST {authBase}/api/session/refresh`, `credentials: "include"`), `authFetch(url, init)` (on a `401`, refresh and retry once; if that fails, redirect to login), `redirectToLogin()`, `logout()` (`POST {authBase}/logout` with `Accept: application/json`, then `router.refresh()`), and a session hint in `localStorage` (`cooking_had_session`). |
| 2.2 | **`AuthProvider` + `useAuth()`** (`src/components/layout/auth-provider.tsx`), replacing `SessionProvider` in `providers.tsx`, with `authBaseUrl` passed from the root layout (D8). One `/api/me` per page load gives `{ status, user, isAdmin }`. On a `401` it refreshes only when the hint is set or the page is protected, so anonymous visitors never call the auth service (it's throttled to 5 rps across all apps). While signed in, it refreshes about 60 s before `exp`, and on `visibilitychange` once expired, then calls `router.refresh()`, so the save button and owner controls don't silently disappear after 15 minutes. |
| 2.3 | **`header.tsx`:** `useSession()` → `useAuth()`. **Sign in** calls `redirectToLogin(location.href)`. **Sign out** calls `logout()`, with a tooltip: "Signs you out of all clintonlangosch.com apps." |
| 2.4 | **`fetch` → `authFetch`** for calls to protected APIs: `recipe-form.tsx` (create, update, image upload; `FormData` can be re-sent on retry), `save-button.tsx`, `featured-toggle.tsx`, `ingredient-select.tsx` (create ingredient), and the ingredients and tags admin pages. Public reads stay as plain `fetch`. |
| 2.5 | **`/login`** becomes a tiny client component that calls `redirectToLogin(origin + (callbackUrl ?? "/"))`, so old links keep working. Only accept a `callbackUrl` that's a relative path (`/` followed by anything but `/` or `\`), so it can't become an open redirect. |

## Part 3: local development

| Step | Change |
|---|---|
| 3.1 | Run local clang-auth (`auth.localtest.me:4000`, see its README). Check what's on :4000 first (`lsof -nP -iTCP:4000 -sTCP:LISTEN`); sibling projects use it too. Register: `clang-auth app create cooking --name Cooking --origin http://cooking.localtest.me:3004`, then `clang-auth grant set dev@localtest.me cooking --role admin`. |
| 3.2 | Run `next dev -p 3004` and open **`http://cooking.localtest.me:3004`**, not `localhost`: the `Domain=.localtest.me` cookie is never sent to `localhost`. |
| 3.3 | `next.config.ts`: `allowedDevOrigins: ["cooking.localtest.me"]`, so the Next 16 dev server allows HMR from that host. |
| 3.4 | `.env.local.example`: remove `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_*`, `ADMIN_NAME` and `ADMIN_PASSWORD`. Add `AUTH_BASE_URL=http://auth.localtest.me:4000` and `AUTH_APP_SLUG=cooking`, with a comment pointing here. Check whether `.env.local` points at the prod Atlas DB before testing writes locally. |
| 3.5 | **`scripts/test/auth.test.ts`** (D11). It generates a throwaway ES256 keypair, injects it with `setJwksForTesting`, and signs tokens. It asserts that `verifyAccessToken` accepts valid claims and rejects: a missing token, an expired token, the wrong `iss`, an HS256 or forged signature, an unknown `kid`, and a missing `sub`. It also tests the pure functions behind D4, D5 and D7 (grant → access and role, the name fallback) and the `callbackUrl` validator from 2.5. The migration script's matching logic (1.11) is a pure function over the two lists and is tested here too: link, already linked, conflicting `sub`, and unmatched on both sides. Lookup by `sub` at runtime is covered by V1. |

## Part 4: docs

- `CLAUDE.md` and `README.md`: replace the scaffold description with the real stack (Next.js 16, MongoDB, Vercel). Add an Authentication section: clang-auth, `getCurrentUser()` / `requireUser()` / `requireAdmin()` as the only supported auth checks, creating users with `clang-auth user create … --grant cooking[:admin]`, and local dev on `cooking.localtest.me:3004`. Link here.
- `.env.local.example`: as in 3.4.

## Rollout

1. **P0–P5.** The new domain serves the current app and every existing `User` has its `clangAuthSub`; nothing changes for users.
2. **Merge to `develop`, then release to `main`.** The release deploy is the cutover: the new code, and the `308` from `app-cooking.vercel.app`.
3. **Verify (V1)** on `https://cooking.clintonlangosch.com`.
4. **P3** is deferred: see [Adding the other users later](#adding-the-other-users-later).
5. **Rollback** if needed: Vercel → Deployments → the previous production deployment → Instant Rollback. The old code, old env and bcrypt hashes are all still there until cleanup.
6. **Cleanup** after a couple of weeks (C1–C4).

## Adding the other users later

P3 was deferred at cutover. Nothing is lost in the meantime: recipes, ingredients and saved recipes point at the local `User._id`, which doesn't change. To let someone sign in later, do these steps in order:

1. **Create their clang-auth account** with the **same email** as their `User` (check with the P0 query): `clang-auth user create <email> --name "<name>" --grant cooking`. Use `--grant cooking:admin` to make them an admin. If they already have a clang-auth account, use `clang-auth grant set <email> cooking` (or `cooking:admin`).
2. **Rerun the migration** (P5 commands: export the mapping, dry run, then `--apply`). It's idempotent: users already linked show under "Already linked" and only the new ones are written.
3. **Send the setup link.** It expires after 72 h; `clang-auth user reset <email>` issues a new one. A user who only ever used Google gets a password account for now; Google comes back through clang-auth (roadlittledawn/service-clang-auth-claude#3).

If someone signs in between steps 1 and 2, they see an error page naming the migration script, not a new empty account. Running step 2 fixes it.

**Ownership is still open.** Today only a recipe's author can edit or delete it: `PUT` and `DELETE` in `src/app/api/recipes/[id]/route.ts` compare `authorId` with the user and don't check the role, so even admins can't edit someone else's recipe. Admin (the `cooking:admin` grant, D5) only adds the admin pages (ingredients, tags) and the featured toggle. Letting the other users edit any recipe therefore needs a code change, for example "the author or an admin" in those two handlers, plus showing Edit on the recipe page by the same rule. The edit page itself (`src/app/recipes/[id]/edit/page.tsx`) checks only that someone is signed in, not ownership; the API refuses the save. This predates the migration. Decide the rule before step 1.

## Verification (V1)

- [ ] Signed out, `/recipes` and a recipe page load normally, with no Save button.
- [ ] Signed out, `/saved` redirects to `https://auth.clintonlangosch.com/login?redirect_uri=…/saved`. Already signed in to Lexicon or kb, it bounces straight back without showing the form.
- [ ] After signing in, **your existing recipes show you as owner (Edit visible) and your saved list is intact**. In the DB, no duplicate `User` was created for you.
- [ ] Create a recipe with an image, save and unsave a recipe, toggle featured, and add an ingredient.
- [ ] Admin: the ingredients and tags pages work. `/admin/invites` returns `404`.
- [ ] A clang-auth user with no `cooking` grant gets `403` on `/saved` (not a loop) and can browse recipes.
- [ ] `clang-auth grant set <you> cooking` (no role) removes the Admin menu within 15 minutes and sets `User.role` to `user`. Restore it with `--role admin`.
- [ ] Wait more than 15 minutes (or delete `ca_access` in devtools), then save a recipe: `authFetch` refreshes silently.
- [ ] Sign out signs you out here and in other `*.clintonlangosch.com` apps.
- [ ] A cross-origin `POST` to `/api/saved/<id>` with a foreign `Origin` returns `403`.
- [ ] `curl -sI 'https://app-cooking.vercel.app/recipes?x=1'` → `308` (Next's permanent redirect) to `https://cooking.clintonlangosch.com/recipes?x=1`.
- [ ] Devtools shows `ca_access` with domain `.clintonlangosch.com`, `HttpOnly`, `Secure`.
- [ ] `npm run test:auth`, `npm run lint`, `npx tsc --noEmit` and `npm run build` pass, and the build output lists `ƒ Proxy (Middleware)`.

## Cleanup (after a couple of weeks)

| Step | Change |
|---|---|
| C1 | `db.invites.drop()`. |
| C2 | `db.users.updateMany({}, { $unset: { passwordHash: "" } })`, and drop the field from the schema, so the old hashes can't be attacked ([migrating-apps §4.4](../../service-clang-auth-claude/docs/migrating-apps.md#4-apps-that-already-have-users)). After this, rollback means a forward fix. |
| C3 | Delete `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` from Vercel. Delete the Google OAuth client in the Google Cloud console (#3 will use a single client on the auth host). |
| C4 | Keep `app-cooking.vercel.app` redirecting. It's the Vercel project's own alias, so it can't lapse while the project exists. |

## Risks

| Risk | Mitigation |
|---|---|
| A person's clang-auth email differs from the one on their `User`. | The P5 dry run shows them as unmatched on both sides before anything is written. Edit that entry's email in the mapping file to match the `User`, and rerun. |
| Someone was missed and signs in before being mapped. | Their email already exists on a `User`, so creating a new one fails, and `getCurrentUser()` throws an error that names the migration script. They see an error page, not an empty account or a redirect loop. Add them to the mapping and rerun the script. |
| Two clang-auth users would claim the same `User`. | The script refuses conflicts, and the unique index backs it up. |
| A former Google user expects the Google button. | Tell them in the setup-link message. Google returns via #3. |
| The proxy imports Mongoose. | 1.2 keeps the token helper DB-free. Role checks that need the DB stay in layouts and handlers. |

## Commit sequence on this branch

1. This plan.
2. Token helper, `getCurrentUser()` and its helpers, `User.clangAuthSub`, the migration script, and the test script with its CI step (1.1–1.4, 1.11, 3.5). The dependency swap (`next-auth`/`bcrypt` → `jose`) landed here too, so this commit alone doesn't build.
3. Switch to clang-auth in one commit: call sites, proxy, admin layout, `/api/me`, the client provider, header, `authFetch`, `/login`, the Auth.js removal, the old-domain redirect and the local dev origin (1.5–1.10, 2.1–2.5, 3.3, 3.4). Split halves would leave a broken app, as kb found.
4. Docs (Part 4) and this plan's status.
