import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const updateIngredientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const mergeIngredientSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
