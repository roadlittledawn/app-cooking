import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerDeps } from "../server.js";
import { recipeUrl, type ApiIngredient } from "../format.js";
import { normalizeName, resolveIngredients } from "../resolve.js";
import { objectId } from "./read.js";
import { toolResult } from "./result.js";

const ingredientLine = z.object({
  name: z.string().min(1).describe("An existing ingredient name, e.g. 'onion' (lowercase, singular)"),
  amount: z.string().min(1).describe("e.g. '2', '1 ½', '2–3', 'to taste'"),
  unit: z.string().optional().describe("A measure such as 'cup', 'tbsp', 'g'. Empty for counted items ('2 eggs')."),
});

const recipeFields = {
  title: z.string().min(1).max(200),
  description: z.string().describe("One or two sentences"),
  servings: z.number().int().min(1),
  prepTime: z.number().int().min(0).describe("Minutes"),
  cookTime: z.number().int().min(0).describe("Minutes"),
  steps: z.string().min(1).describe("Markdown, as a numbered list: '1. …\\n2. …'"),
  tags: z.array(z.string().min(1)).describe("Existing tag names from list_tags where possible"),
  ingredients: z
    .array(ingredientLine)
    .min(1)
    .describe("Every name must already exist: create new ones with create_ingredient first"),
};

const CONFIRM =
  "Only call it after showing the user the full draft and getting their confirmation.";

export function registerWriteTools(server: McpServer, { api, authBaseUrl }: ServerDeps): void {
  server.registerTool(
    "create_ingredient",
    {
      description: `Add a new ingredient to the shared list. ${CONFIRM} Check search_ingredients first: if the ingredient already exists, this returns it with created: false instead of adding a duplicate.`,
      inputSchema: { name: z.string().min(1).max(100).describe("Lowercase, singular, no prep notes: 'shallot', not 'Shallots, minced'") },
    },
    ({ name }) =>
      toolResult(authBaseUrl, async () => {
        const normalized = normalizeName(name);
        const [existing] = await api.get<ApiIngredient[]>("/api/ingredients", { name: normalized });
        if (existing) return { id: existing._id, name: existing.name, created: false };
        const created = await api.post<ApiIngredient>("/api/ingredients", { name: normalized });
        return { id: created._id, name: created.name, created: true };
      })
  );

  server.registerTool(
    "create_recipe",
    {
      description: `Create a recipe owned by the user. ${CONFIRM} Ingredients are given by name and must all exist already; if any don't, nothing is saved and the error lists them. Returns the recipe's id, title and url.`,
      inputSchema: { ...recipeFields, description: recipeFields.description.optional() },
    },
    ({ ingredients, ...fields }) =>
      toolResult(authBaseUrl, async () => {
        const lines = await resolveIngredients(api, ingredients);
        const recipe = await api.post<{ _id: string; title: string }>("/api/recipes", {
          ...fields,
          description: fields.description ?? "",
          ingredients: lines,
        });
        return { id: recipe._id, title: recipe.title, url: recipeUrl(api.baseUrl, recipe._id) };
      })
  );

  server.registerTool(
    "update_recipe",
    {
      description: `Change a recipe the user owns (get_recipe's isMine). Pass only the fields to change; 'ingredients', if given, replaces the whole list. ${CONFIRM} Returns the recipe's id, title and url.`,
      inputSchema: {
        id: objectId,
        title: recipeFields.title.optional(),
        description: recipeFields.description.optional(),
        servings: recipeFields.servings.optional(),
        prepTime: recipeFields.prepTime.optional(),
        cookTime: recipeFields.cookTime.optional(),
        steps: recipeFields.steps.optional(),
        tags: recipeFields.tags.optional(),
        ingredients: recipeFields.ingredients.optional(),
      },
    },
    ({ id, ingredients, ...fields }) =>
      toolResult(authBaseUrl, async () => {
        const changes: Record<string, unknown> = Object.fromEntries(
          Object.entries(fields).filter(([, value]) => value !== undefined)
        );
        if (ingredients) changes.ingredients = await resolveIngredients(api, ingredients);
        if (Object.keys(changes).length === 0) throw new Error("Nothing to update: pass at least one field to change.");
        const recipe = await api.put<{ _id: string; title: string }>(`/api/recipes/${id}`, changes);
        return { id: recipe._id, title: recipe.title, url: recipeUrl(api.baseUrl, recipe._id) };
      })
  );
}
