import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerDeps } from "../server.js";
import {
  escapeRegex,
  toIngredient,
  toRecipeDetail,
  toRecipeSummary,
  type ApiIngredient,
  type ApiRecipe,
} from "../format.js";
import { toolResult } from "./result.js";

export const objectId = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Must be a recipe id from search_recipes (24 hex characters)");

export function registerReadTools(server: McpServer, { api, authBaseUrl }: ServerDeps): void {
  // Who the API key belongs to, for get_recipe's isMine. Fetched once.
  let me: Promise<string> | undefined;
  const myUserId = () => {
    me ??= api.get<{ id: string }>("/api/me").then(
      (user) => user.id,
      (err) => {
        me = undefined;
        throw err;
      }
    );
    return me;
  };

  server.registerTool(
    "search_recipes",
    {
      description:
        "Search the cooking app's recipes by title (case-insensitive substring) and/or tags (recipes with ANY of the given tags; take names from list_tags). With neither, lists the newest recipes. Use it before creating a recipe to catch duplicates, to find a recipe the user wants to change, or to browse by tag. Returns id, title, author, tags and url for each match, newest first.",
      inputSchema: {
        query: z.string().min(1).optional().describe("Words from the title, e.g. 'chicken tikka'"),
        tags: z.array(z.string().min(1)).optional().describe("e.g. ['soup', 'dinner']"),
        limit: z.number().int().min(1).max(20).default(10),
      },
    },
    ({ query, tags, limit }) =>
      toolResult(authBaseUrl, async () => {
        const { recipes } = await api.get<{ recipes: ApiRecipe[] }>("/api/recipes", {
          q: query ? escapeRegex(query) : undefined,
          tags: tags && tags.length > 0 ? tags.join(",") : undefined,
          limit,
        });
        return recipes.map((r) => toRecipeSummary(r, api.baseUrl));
      })
  );

  server.registerTool(
    "get_recipe",
    {
      description:
        "Get one recipe in full: description, servings, prep and cook time in minutes, ingredients (name, amount, unit), Markdown steps, tags, author, and isMine (whether the user can edit it).",
      inputSchema: { id: objectId },
    },
    ({ id }) =>
      toolResult(authBaseUrl, async () => {
        const [recipe, userId] = await Promise.all([
          api.get<ApiRecipe>(`/api/recipes/${id}`),
          myUserId(),
        ]);
        return toRecipeDetail(recipe, api.baseUrl, userId);
      })
  );

  server.registerTool(
    "list_tags",
    {
      description:
        "List every tag name in use, sorted. Pick a recipe's tags from this list; only propose a new tag when none fits, and tell the user it's new.",
      inputSchema: {},
    },
    () =>
      toolResult(authBaseUrl, async () => {
        const { tags } = await api.get<{ tags: string[] }>("/api/tags");
        return tags;
      })
  );

  server.registerTool(
    "search_ingredients",
    {
      description:
        "Search existing ingredients by name (case-insensitive substring, up to 20 results). Ingredient names are lowercase and usually singular. Use it to match a recipe's ingredients to existing ones before proposing new ones; try a shorter or alternative word (e.g. 'scallion' and 'green onion') when nothing matches.",
      inputSchema: { query: z.string().min(1).describe("e.g. 'flour'") },
    },
    ({ query }) =>
      toolResult(authBaseUrl, async () => {
        const ingredients = await api.get<ApiIngredient[]>("/api/ingredients", {
          q: escapeRegex(query),
        });
        return ingredients.map(toIngredient);
      })
  );
}
