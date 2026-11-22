# Add recipes from Claude Code: Requirements

Status: Approved (revised 2026-11-22: keys move to clang-auth)
Date: 2026-11-22
Branch: feat/recipe-mcp-skill

## Problem

Adding a recipe means typing every field into the web form and picking each ingredient one at a time. It's slow enough that recipes don't get added. Clinton and Brie both use Claude Code. They'd rather hand it a recipe in whatever form they have, such as a web page, pasted text or a rough description, and have it create the recipe for them.

## Decisions

Settled during planning. Don't reopen these without a reason.

| Topic | Decision | Why |
|---|---|---|
| Where the agent runs | Locally in Claude Code: a project skill plus a local stdio MCP server in this repo | dev-standards agent-access default. No hosted AI, no token costs in the app. |
| How the MCP server gets data | It calls the app's HTTP API, never MongoDB | Validation and auth rules stay in one place (dev-standards). |
| API keys | **Issued and stored by clang-auth** ([service-clang-auth-claude#4](https://github.com/roadlittledawn/service-clang-auth-claude/issues/4)). The MCP server exchanges its key for a normal 15-minute access token and sends it as `Authorization: Bearer`. | Revoking a key or a grant, or disabling a user, takes effect within 15 minutes, with no key table in the app. This replaces the earlier plan for keys stored in the app (issued on an account page). |
| Key-token privileges | Roles come from clang-auth: each key carries the roles ticked for it on `/keys` (none by default), intersected with the user's current grant. The app treats them like any token's roles. Deletes are refused for any Bearer request. | Decided in [#4](https://github.com/roadlittledawn/service-clang-auth-claude/issues/4#issuecomment-7083618406), so every app gets least privilege by default. A key without admin can't edit other people's recipes. |
| Recipe sources (v1) | A recipe web page URL, pasted text, or a description from memory | Photos are out for v1. |
| Images | Not set by the skill in v1 | Can be added later in the web UI. |
| Tool scope | Search, get, create, and update your own recipes. Look up and create ingredients. List tags. Extract recipe data from a URL. No delete. | Search catches duplicates, and update fixes mistakes. Deletes stay in the web UI. |
| Repo layout | The app stays at the repo root. `mcp-server/` becomes an npm workspace beside it. | Moving the app would also mean changing Vercel's root directory. |
| CSRF | Bearer requests skip the same-origin check | Browsers never attach the header automatically, so it can't be forged cross-site. |
| In-app AI feature | Deferred | See Out of scope. |
| Plan location | `docs/plans/`, not the SDD `changes/` scaffold | Matches how the clang-auth migration was documented. |

## Functional requirements

**API auth**

- **R1.** API routes accept a clang-auth access token sent as `Authorization: Bearer <token>`, with the same rules as the cookie: valid signature and a `cooking` grant. A request with this header never falls back to the cookie.
- **R2.** A Bearer request with a missing, invalid or expired token gets `401`, with no redirect. One without a `cooking` grant gets `403`.
- **R3.** A key-derived token acts as its owner with the roles clang-auth put in it: a regular user unless the key was given admin. Any `DELETE` sent with an `Authorization` header gets `403`.
- **R4.** Removing someone's `cooking` grant, disabling them or revoking their key stops their MCP access within one access-token lifetime (15 minutes). The app has no offboarding step of its own.

**API**

- **R5.** Any user with access can list all tags, without needing the admin role.
- **R6.** Ingredients can be looked up by exact name.

**MCP server**

- **R7.** Claude Code in this repo connects to a `cooking` MCP server after a one-time setup that the README documents: create a key on clang-auth, put it in a local env file, then install and build.
- **R8.** The server exchanges its clang-auth key for an access token, reuses the token until shortly before it expires, and exchanges again after a `401`.
- **R9.** The server provides tools to: search recipes by title, get a recipe, create a recipe, update a recipe the user owns, search ingredients, create an ingredient, list tags, and extract structured recipe data from a web page.
- **R10.** The recipe tools accept and return ingredients by name as well as id, so the model never has to juggle ObjectIds to read a recipe.
- **R11.** API validation errors come back to the model as readable messages that name the field, so it can correct itself and retry. A rejected key comes back as a message that says how to get a new one.
- **R12.** The server points at production by default, and env vars can point it at local dev: the app and clang-auth URLs.

**Skill**

- **R13.** `/add-recipe <url | text | description>` extracts the title, description, servings, prep and cook time in minutes, ingredients with amount and unit, steps, and suggested tags.
- **R14.** For a URL, the skill reads the page's recipe content, using its structured recipe data when there is any, and ignores the blog filler around it.
- **R15.** For a description from memory, the skill asks about required details it can't reasonably fill in, such as servings or times, rather than inventing them silently.
- **R16.** Before creating anything, the skill checks for an existing recipe with a similar title and warns the user if it finds one.
- **R17.** The skill matches each ingredient to an existing one where it reasonably can, including singular and plural or trivial wording differences, and marks the ones that would be created new.
- **R18.** Tags are chosen from the existing tag list. The skill proposes a new tag only when nothing fits, and marks it as new.
- **R19.** The skill shows the full draft, including new ingredients and tags and any duplicate warning, and writes nothing until the user confirms. The user can ask for changes first.
- **R20.** After creating the recipe, the skill replies with its URL on the site.
- **R21.** Steps are written as Markdown, in the format the recipe page already renders.

## Non-functional requirements

- **N1.** Browser behavior is unchanged: requests without an `Authorization` header keep the same cookie verification, CSRF check and `401` refresh flow.
- **N2.** The clang-auth key lives only in a gitignored local env file, never in committed config. Exchanged tokens are kept only in memory.
- **N3.** Tests cover Bearer handling: a valid token, missing, malformed, expired, no grant, a Bearer header taking priority over the cookie, a key token's roles honored as given, a key token scoped to another app refused, Bearer `DELETE` refused, and the proxy's CSRF decision. They run in the existing `tsx` + `node:assert` test setup and in CI.
- **N4.** Lint, `tsc --noEmit` and the tests pass in CI, and the CI also builds, type-checks and tests `mcp-server/`.
- **N5.** Tool descriptions and responses are compact: list results carry only the fields the model needs, so one session can add several recipes without filling the context.

## Out of scope

- **Key management in this app.** Creating, listing and revoking keys is clang-auth's `/keys` page (#4). The app links to it.
- **In-app AI or "Claude-like" feature for contributors.** Deferred. If it comes back, the recommended shape is an "Import from URL or text" button on the new-recipe form that makes one structured-output call and fills the existing form for review. That means no chat and no agent loop, and it avoids the context and token-limit problems of a self-built agent loop.
- Remote or hosted MCP server.
- Recipe photos: setting the image, or reading a recipe from a photo.
- Deleting recipes, or editing other users' recipes, through the MCP server.
- Bulk import of many recipes at once.
- Admin tools over MCP (tag and ingredient management, merges).

## Open questions

- None. (Resolved: clang-auth scopes key roles itself. See the Decisions table.)

## Success criteria

- Clinton and Brie can each add a recipe from a typical recipe-blog URL in under two minutes, including review. The recipe shows them as its author, with ingredients linked to the existing ingredient list.
- No duplicate ingredients are created for ingredients that already exist.
- Revoking a key on clang-auth stops MCP access within 15 minutes.
