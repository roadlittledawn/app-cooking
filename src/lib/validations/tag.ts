import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  showInFilter: z.boolean().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  showInFilter: z.boolean().optional(),
});

export const renameTagSchema = z.object({
  name: z.string().min(1).max(50),
  newName: z.string().min(1).max(50),
});
