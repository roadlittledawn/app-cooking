# Add recipes from Claude Code: Tasks

Plan: [requirements](requirements.md) · [design](design.md)

Every task leaves `npm run lint`, `npx tsc --noEmit`, `npm run test:auth` and `npm run build` passing. From task 1 on, the `mcp-server` build, typecheck and tests must pass too. Local manual checks use the setup in CLAUDE.md: local clang-auth, `npx next dev -p 3004`, and `MONGODB_URI` pointed at a **local** database.

**Dependency:** task 4 onwards needs [clang-auth #4](https://github.com/roadlittledawn/service-clang-auth-claude/issues/4) running locally (`/keys` and `POST /api/token`). Prod checks in task 7 need #4 deployed. Before task 4, re-read #4's merged docs and update the design if the contract changed.

## Tasks

- [x] **0. docs(plan): recipe-mcp-skill**
  - Covers: none (the plan docs)
  - Change: commit `requirements.md`, `design.md` and `tasks.md`
  - Verify: none

- [x] **1. chore: add mcp-server npm workspace skeleton**
  - Covers: R7, N4
  - Change:
    - Add `"workspaces": ["mcp-server"]` to the root `package.json`.
    - Add the `mcp-server/` package: MCP SDK, zod, dotenv; `build`, `typecheck` and `test` scripts; a stdio server with one `ping` tool; `.env.example`.
    - Exclude `mcp-server/` from the root `tsconfig.json` and `eslint.config.mjs`.
    - Commit a `.mcp.json` that registers `cooking`, and gitignore `mcp-server/.env`.
    - Add a CI step that builds, type-checks and tests `mcp-server`.
  - Verify:
    - `npm ci` from a clean `node_modules`, then the root checks, `npm run build` and the `mcp-server` checks.
    - Manual:
      - Restart Claude Code in the repo. `/mcp` should show `cooking` connected, and `ping` should answer.
      - Push the branch. The Vercel preview should build, and the lockfile diff should look sane.

- [x] **2. feat(auth): accept Bearer access tokens**
  - Covers: R1, R2, R3, N1, N3
  - Change:
    - `getAuthState()` takes the token from `Authorization: Bearer` when that header is present, with no cookie fallback, and otherwise from `ca_access`.
    - `proxy.ts`: a pure `apiWriteDecision()` lets writes with an `Authorization` header skip the same-origin check and returns `403` for a `DELETE` with one.
  - Verify:
    - `scripts/test/auth.test.ts` gains tests for:
      - Token-source selection: Bearer wins, and a bad Bearer token doesn't fall back.
      - Bearer valid, expired and no-grant tokens.
      - Key tokens' roles honored as given, and a key token for another app forbidden.
      - Every `apiWriteDecision` case.
    - Manual, local: mint a token with local clang-auth `/admin/tokens`.
      - `curl` `/api/me` with the Bearer token should give 200.
      - The same with a garbage token should give 401.
      - A cookie write with a sibling `Origin` should still give 403.
      - Browser sign-in and editing should still work.

- [x] **3. feat(api): add tag list and exact ingredient lookup**
  - Covers: R5, R6
  - Change: a new `GET /api/tags` that returns `{ tags: string[] }` (the `Tag` documents plus the tags on recipes, sorted) and needs a user. `GET /api/ingredients?name=` does an exact, case-insensitive match. `q` is unchanged.
  - Verify: manual, local `curl` with a Bearer token:
    - `/api/tags` returns the list. With no auth it gives 401.
    - `?name=Salt` finds `salt`. `?name=sal` finds nothing.

- [ ] **4. feat(mcp): add token exchange and read tools**
  - Covers: R4, R7, R8, R9, R11, R12, N2, N5
  - Needs: #4 running locally
  - Change:
    - Config: `CLANG_AUTH_API_KEY`, `COOKING_BASE_URL` and `AUTH_BASE_URL`, with prod defaults.
    - A token cache: exchange on first use, refresh 60 seconds before expiry, one exchange in flight at a time, and re-exchange and retry once on a 401.
    - An API client and error formatting.
    - Tools: `search_recipes`, `get_recipe` (ingredients by name, with `url` and `isMine`), `list_tags`, `search_ingredients`. Remove `ping`.
    - An "API keys" link in the user menu to `${AUTH_BASE_URL}/keys?app=cooking`.
  - Verify:
    - `mcp-server` tests for the token cache (each case in the design), error formatting and the compact recipe mapping.
    - Manual, local:
      - Create a key on local `/keys`, put it in `mcp-server/.env`, and rebuild.
      - Ask Claude Code to "search my recipes for chicken" and "list tags".
      - Revoke the key and wait for the token to expire (or restart the server). The next call should give the new-key message.

- [ ] **5. feat(mcp): add write tools**
  - Covers: R9, R10, R11, R20
  - Change: `create_ingredient`, `create_recipe` and `update_recipe`. The recipe tools resolve ingredient names with `?name=`, fail with the list of unknown names, and never create ingredients. Both return `{ id, title, url }`.
  - Verify:
    - `mcp-server` tests for name resolution: all known, some unknown (every one listed), and case differences.
    - Manual, local:
      - Create a recipe using one known and one unknown ingredient. The tool should refuse.
      - Create the ingredient, then retry. The recipe should show you as author.
      - Update its cook time.
      - Try to update someone else's recipe. It should give 403.
      - Ask it to delete a recipe. There's no tool for that, and a raw Bearer `DELETE` gives 403.

- [ ] **6. feat(mcp): add extract_recipe_from_url**
  - Covers: R9, R14, N5
  - Change: fetch the page and parse the `schema.org/Recipe` JSON-LD, whether it's an object, an array or an `@graph`. Convert ISO-8601 durations to minutes, and flatten instructions, including `HowToSection`. Otherwise return `{ found: false }`.
  - Verify:
    - `mcp-server` tests over saved HTML fixtures for each JSON-LD shape and for a page without one.
    - Manual: run it on 2–3 real recipe blogs.

- [ ] **7. feat(skill): add add-recipe skill**
  - Covers: R13, R14, R15, R16, R17, R18, R19, R20, R21
  - Change: `.claude/skills/add-recipe/SKILL.md`, following the design's workflow:
    - Sources and the URL fallback.
    - Normalization rules.
    - One batch of questions for missing required fields.
    - Duplicate check, plus ingredient and tag matching.
    - A draft with new items marked, then confirmation before any write.
    - A reply with the recipe's link.
    - The same flow for "update my recipe X".
  - Verify: manual, against **prod** (needs #4 deployed and a prod key):
    - `/add-recipe <blog URL>`: the draft is accurate, existing ingredients are reused, and nothing is written before you confirm.
    - `/add-recipe` with pasted text.
    - `/add-recipe` from memory: it asks for servings or times when they're missing.
    - Rerun the first URL: it warns about the duplicate.
    - Spot-check the recipe pages on the site.

- [ ] **8. docs: close out recipe-mcp-skill plan**
  - Covers: R7
  - Change:
    - Write `mcp-server/README.md`: setup (create a key at clang-auth `/keys?app=cooking`, `.env`, build, `/mcp`), the tools table, local versus prod, and the revocation behavior.
    - Root README: a short "Add recipes with Claude Code" section.
    - CLAUDE.md, Authentication section: Bearer tokens accepted (key roles come from clang-auth), no Bearer deletes, and a rule that MCP tools change in the same PR as the API.
    - Note the follow-up: unescaped `$regex` in the `q` searches.
    - Delete `docs/plans/2026-11-22-feat-recipe-mcp-skill/`. Open the PR into `develop`.
  - Verify: the links resolve, the plan folder is gone, and CI is green on the PR. Manual: Brie follows the README from a fresh clone and adds a recipe.

## Coverage

| Requirement | Tasks |
|---|---|
| R1 | 2 |
| R2 | 2 |
| R3 | 2, 5 |
| R4 | 4 |
| R5 | 3 |
| R6 | 3 |
| R7 | 1, 4, 8 |
| R8 | 4 |
| R9 | 4, 5, 6 |
| R10 | 5 |
| R11 | 4, 5 |
| R12 | 4 |
| R13 | 7 |
| R14 | 6, 7 |
| R15 | 7 |
| R16 | 7 |
| R17 | 3, 7 |
| R18 | 7 |
| R19 | 7 |
| R20 | 5, 7 |
| R21 | 7 |
| N1 | 2 |
| N2 | 1, 4 |
| N3 | 2 |
| N4 | 1 |
| N5 | 4, 6 |
