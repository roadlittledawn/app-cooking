import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
