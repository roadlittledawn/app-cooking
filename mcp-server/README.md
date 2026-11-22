# cooking MCP server

A local [MCP](https://modelcontextprotocol.io) server that lets Claude Code read and add recipes in the cooking app. It calls the app's own `/api/*` routes over HTTPS: no database access, so the app's validation and ownership rules apply. It runs over stdio, launched by Claude Code from this repo. Nothing about it is deployed.

The [`/add-recipe` skill](../.claude/skills/add-recipe/SKILL.md) is the main way to use it: hand it a recipe URL, pasted text or a description, check the draft, and it creates the recipe.

## Setup

1. **Create an API key** on clang-auth: [auth.clintonlangosch.com/keys?app=cooking](https://auth.clintonlangosch.com/keys?app=cooking), also linked as **API keys** in the app's account menu. Leave the roles unticked. A key without `admin` can only do what a regular user can, which is all the tools need. The key is shown once.
2. **Configure:** copy `.env.example` to `mcp-server/.env` (gitignored) and set `CLANG_AUTH_API_KEY`.
3. **Install and build**, from the repo root:
   ```sh
   npm install
   npm run build -w mcp-server
   ```
4. **Connect:** the repo's `.mcp.json` registers the server as `cooking`. Restart Claude Code in the repo, approve the project server when asked, and check it with `/mcp`.

After changing the code or `.env`, rebuild and reconnect with `/mcp`.

### Configuration

| Variable | Default | Local dev |
|---|---|---|
| `CLANG_AUTH_API_KEY` | (required) | A key from local clang-auth's `/keys?app=cooking` |
| `COOKING_BASE_URL` | `https://cooking.clintonlangosch.com` | `http://cooking.localtest.me:3004` |
| `AUTH_BASE_URL` | `https://auth.clintonlangosch.com` | `http://auth.localtest.me:4000` |

A key only works against the clang-auth it came from, so switch all three together. Local dev runs the app with `npx next dev -p 3004` and a local `MONGODB_URI` (see CLAUDE.md).

## How auth works

The server exchanges the key at clang-auth's `POST /api/token` for a normal 15-minute access token, and sends that token to the app as `Authorization: Bearer`. The token is kept only in memory and re-exchanged a minute before it expires, or when the app answers `401`. Details are in clang-auth's `docs/integration-guide.md` §8.

- **Revoking access:** revoke the key on `/keys`, remove the person's `cooking` grant, or disable them in clang-auth. Any of these stops the server within 15 minutes. The app has no key table and nothing to clean up.
- **What a key can't do:** delete anything (the app refuses `DELETE` with a Bearer token), or, without `admin`, use admin routes or edit other people's recipes.

## Tools

| Tool | What it does | API |
|---|---|---|
| `search_recipes` | Search by title and/or tags (any match), or list the newest | `GET /api/recipes?q=&tags=` |
| `get_recipe` | One recipe in full, with ingredients by name and `isMine` | `GET /api/recipes/:id`, `GET /api/me` |
| `list_tags` | Every tag name, sorted | `GET /api/tags` |
| `search_ingredients` | Existing ingredients by name | `GET /api/ingredients?q=` |
| `create_ingredient` | Add an ingredient. Returns the existing one instead of a duplicate. | `GET /api/ingredients?name=`, `POST /api/ingredients` |
| `create_recipe` | Create a recipe with ingredients by name. Refuses unknown names and saves nothing. | `GET /api/ingredients?name=`, `POST /api/recipes` |
| `update_recipe` | Change fields of your own recipe | `PUT /api/recipes/:id` |
| `extract_recipe_from_url` | A page's schema.org Recipe data (no app call) | (fetches the page) |

**When the API changes, update these tools in the same PR.**

## Development

```sh
npm run typecheck -w mcp-server   # src and tests
npm test -w mcp-server            # node:test via tsx, no network
npm run dev -w mcp-server         # run from source (Claude Code uses dist/)
```

Code layout:
- `src/auth.ts`: the key exchange, ported from clang-auth's `examples/node-app/src/api-key-client.ts`. Keep the two in step.
- `src/api.ts`: the JSON client.
- `src/tools/`: the tool definitions.
- `src/extract.ts`: JSON-LD parsing.
- Diagnostics go to stderr: stdout carries the MCP protocol.
