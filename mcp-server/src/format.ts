/**
 * Compact shapes for tool results (N5): only what the model needs, with
 * ingredients by name rather than ObjectId (R10).
 */

/** A recipe as GET /api/recipes and /api/recipes/:id return it (populated). */
export interface ApiRecipe {
  _id: string;
  title: string;
  description?: string;
  ingredients: { ingredientId: { _id: string; name: string } | null; amount: string; unit?: string }[];
  steps: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  authorId: { _id: string; name: string } | null;
}

export interface ApiIngredient {
  _id: string;
  name: string;
}

export function recipeUrl(baseUrl: string, id: string): string {
  return `${baseUrl}/recipes/${id}`;
}

export function toRecipeSummary(recipe: ApiRecipe, baseUrl: string) {
  return {
    id: recipe._id,
    title: recipe.title,
    author: recipe.authorId?.name ?? null,
    tags: recipe.tags,
    url: recipeUrl(baseUrl, recipe._id),
  };
}

export function toRecipeDetail(recipe: ApiRecipe, baseUrl: string, myUserId: string) {
  return {
    id: recipe._id,
    title: recipe.title,
    description: recipe.description ?? "",
    servings: recipe.servings,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.ingredientId?.name ?? "(deleted ingredient)",
      amount: i.amount,
      unit: i.unit ?? "",
    })),
    steps: recipe.steps,
    tags: recipe.tags,
    author: recipe.authorId?.name ?? null,
    isMine: recipe.authorId?._id === myUserId,
    url: recipeUrl(baseUrl, recipe._id),
  };
}

export function toIngredient(ingredient: ApiIngredient) {
  return { id: ingredient._id, name: ingredient.name };
}

/** The API's `q` params are regexes on the server; search for the literal text. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
