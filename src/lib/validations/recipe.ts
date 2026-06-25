import { z } from "zod";

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  amount: z.string().min(1, "Amount is required"),
  unit: z.string().optional().default(""),
});

export const createRecipeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().default(""),
  ingredients: z.array(recipeIngredientSchema).min(1, "At least one ingredient is required"),
  steps: z.string().min(1, "Steps are required"),
  prepTime: z
    .number({ invalid_type_error: "Prep time is required" })
    .int()
    .min(0),
  cookTime: z
    .number({ invalid_type_error: "Cook time is required" })
    .int()
    .min(0),
  servings: z.number().int().min(1),
  image: z.string().url().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export const updateRecipeSchema = createRecipeSchema.extend({
  featured: z.boolean().optional(),
}).partial();

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
