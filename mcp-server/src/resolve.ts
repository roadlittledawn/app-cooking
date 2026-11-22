import type { CookingApi } from "./api.js";
import type { ApiIngredient } from "./format.js";

export interface IngredientLine {
  name: string;
  amount: string;
  unit?: string;
}

/** Some names have no exact match. Nothing was written. */
export class UnknownIngredientsError extends Error {
  constructor(readonly names: string[]) {
    super(`Unknown ingredients: ${names.join(", ")}`);
    this.name = "UnknownIngredientsError";
  }
}

/** Ingredient names are stored lowercase and trimmed. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Turn ingredient names into the `{ ingredientId, amount, unit }` lines the API
 * wants, by exact (case-insensitive) lookup. Never creates ingredients: if
 * any name is unknown, throws listing every unknown name (R10, R17).
 */
export async function resolveIngredients(api: CookingApi, lines: IngredientLine[]) {
  const names = [...new Set(lines.map((l) => normalizeName(l.name)))];
  const found = await Promise.all(
    names.map(async (name) => {
      const [match] = await api.get<ApiIngredient[]>("/api/ingredients", { name });
      return [name, match?._id] as const;
    })
  );
  const ids = new Map(found);
  const unknown = names.filter((name) => !ids.get(name));
  if (unknown.length > 0) throw new UnknownIngredientsError(unknown);

  return lines.map((l) => ({
    ingredientId: ids.get(normalizeName(l.name))!,
    amount: l.amount.trim(),
    unit: (l.unit ?? "").trim(),
  }));
}
