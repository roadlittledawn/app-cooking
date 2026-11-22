# Project: app-cooking

## Tech Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- **Database:** MongoDB via Mongoose (`src/models/`)
- **Auth:** clang-auth (`https://auth.clintonlangosch.com`), shared sign-in for `*.clintonlangosch.com` apps. See [Authentication](#authentication).
- **Images:** Vercel Blob
- **Hosting:** Vercel, at `https://cooking.clintonlangosch.com` (the old `app-cooking.vercel.app` redirects there)
- **Tests:** `npm run test:auth` (a plain `tsx` script with `node:assert`; there's no test framework)
- **MCP server:** `mcp-server/`, an npm workspace (stdio, for Claude Code), with the `/add-recipe` skill in `.claude/skills/`. Tests: `npm test -w mcp-server` (`node:test` via `tsx`). See [mcp-server/README.md](mcp-server/README.md).

> The SDD scaffold sections further down (components, CMDO, Kubernetes) describe the template this repo was generated from, not the app as built.

## Authentication

Sign-in is handled by clang-auth. The app never sees a password. It verifies the `ca_access` cookie (a 15-minute ES256 JWT) against clang-auth's JWKS. The full design and rollout are in [docs/clang-auth-migration.md](docs/clang-auth-migration.md).

- **The only supported auth checks** are in `src/lib/auth/current-user.ts`: `getCurrentUser()` for pages and server components, `requireUser()` / `requireAdmin()` for route handlers (they return the `401`/`403` response to send). Don't read the cookie yourself.
- **`CurrentUser.id` is the local `User._id`**, which recipes, saved recipes and ingredients reference. The token's `sub` maps to it through `User.clangAuthSub`. Never look users up by email.
- **Roles come from the clang-auth grant:** `apps.cooking` containing `admin` means admin; any other grant means a regular user. No `cooking` grant means no access.
- **Adding a user:** `clang-auth user create <email> --name "<name>" --grant cooking` (add `:admin` for an admin), then send them the setup link. There's no sign-up page.
- `src/proxy.ts` redirects signed-out visitors on protected pages to clang-auth and refuses cross-origin API writes. Browser code calls protected APIs with `authFetch()` from `src/lib/auth/client.ts`, which refreshes the token on a `401`.
- **Bearer tokens:** API routes also accept a clang-auth access token in `Authorization: Bearer`, from the local MCP server (`mcp-server/`), which exchanges a clang-auth API key for it. A Bearer header always wins over the cookie and never falls back to it (`requestToken()` in `clang-auth.ts`). Bearer writes skip the same-origin check, but any Bearer `DELETE` gets `403` (`src/lib/auth/api-write-policy.ts`). Key tokens carry the roles ticked for the key on clang-auth `/keys`, none by default, so the app treats them like any other token. The app stores no keys.
- **MCP tools track the API:** when an API route the MCP server uses changes, update `mcp-server/` in the same PR (its README lists the tools and their routes).
- **Local dev:** run the clang-auth service locally (`http://auth.localtest.me:4000`), then `npx next dev -p 3004` and open `http://cooking.localtest.me:3004`. `localhost` doesn't get the cookie. Point `MONGODB_URI` at a local database: `.env.local` may point at production.

## Coding Standards (MANDATORY)

**You MUST follow the project's standards skills when writing or modifying code.** Before starting any implementation work, read the relevant standards skill to load the coding patterns. These are mandatory, not optional.

| When working on... | Standards skill to follow |
|---------------------|--------------------------|
| Any TypeScript code | `typescript-standards` |
| Backend (server) components | `backend-standards` |
| Frontend (webapp) components | `frontend-standards` |
| Database migrations/schema | `database-standards` |
| API contracts (OpenAPI) | `contract-standards` |
| Helm charts / Kubernetes | `helm-standards` |
| CI/CD pipelines | `cicd-standards` |
| Configuration | `config-standards` |
| Integration tests | `integration-testing-standards` |
| E2E tests | `e2e-testing-standards` |

**Multiple standards apply simultaneously.** For example, backend work requires both `typescript-standards` AND `backend-standards`. Database work in a backend context requires `typescript-standards`, `backend-standards`, AND `database-standards`.

**This applies to ALL code changes** — whether through agent workflows, direct prompts, corrections, or ad-hoc requests. Never write code without first loading the relevant standards.

## Behavior Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Branching Strategy

- **`main`** — production branch. Deploys to prod. Never commit directly; merge only via PR from `develop`.
- **`develop`** — default branch. All feature/bugfix branches are cut from here and PR'd back here.

### Workflow

```
feature/my-thing  →  develop  →  main
                  (PR)        (PR)
```

1. Cut a branch from `develop`: `git checkout -b feature/my-thing`
2. Open a PR targeting `develop` when ready
3. The **PR Validation** check (`.github/workflows/pr-validation.yml`) must pass — it runs ESLint and `tsc --noEmit`
4. Merge to `develop`
5. To release, open a PR from `develop` → `main`

### Branch protection

Both `develop` and `main` require:
- A PR (no direct pushes, including admins)
- The `Lint & Type Check` status check to pass

### Linting

ESLint is configured in `eslint.config.mjs` (Next.js + TypeScript rules). Run locally with:

```
npm run lint
```

Type-check without emitting:

```
npx tsc --noEmit
```

Both must pass cleanly before any PR can merge.

## Spec-Driven Development

1. **Specs are truth:** Every change needs a SPEC.md
2. **Change types:** Changes can be `feature`, `bugfix`, or `refactor`
3. **Issue required:** Every spec references a tracking issue
4. **Git = state machine:** PR = draft, merged = active

## Key Paths

| Path | Purpose |
|------|---------|
| `changes/INDEX.md` | Registry of all change specs |
| `changes/` | Change specifications (features, bugfixes, refactors) |
| `specs/` | Static domain knowledge (glossary, definitions, architecture) |
| `components/contracts/{name}/openapi.yaml` | API contract |
| `sdd/sdd-settings.yaml` | Project settings (components, domains) |

## Claude Code Commands

- `/sdd I want to initialize a new project` - Initialize new project
- `/sdd I want to create a new feature` - Start new change
- `/sdd I want to import an external spec` - Import changes from external spec
- `/sdd` - Show workflow status (no-arg reads context)
- `/sdd I want to continue` - Resume current workflow
- `/sdd I want to approve the spec` - Approve spec, create plan
- `/sdd I want to approve the plan` - Approve plan, enable implementation
- `/sdd I want to start implementing` - Implement change
- `/sdd I want to verify the implementation` - Verify implementation
