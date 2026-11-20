import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { Recipe } from "@/models/Recipe";
import { mergeIngredientSchema } from "@/lib/validations/ingredient";

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  await connectDB();

  const body = await request.json();
  const parsed = mergeIngredientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { sourceId, targetId } = parsed.data;

  if (sourceId === targetId) {
    return NextResponse.json({ error: "Source and target must be different ingredients" }, { status: 400 });
  }

  const [source, target] = await Promise.all([
    Ingredient.findById(sourceId),
    Ingredient.findById(targetId),
  ]);

  if (!source) return NextResponse.json({ error: "Source ingredient not found" }, { status: 404 });
  if (!target) return NextResponse.json({ error: "Target ingredient not found" }, { status: 404 });

  const result = await Recipe.updateMany(
    { "ingredients.ingredientId": new Types.ObjectId(sourceId) },
    { $set: { "ingredients.$[elem].ingredientId": new Types.ObjectId(targetId) } },
    { arrayFilters: [{ "elem.ingredientId": new Types.ObjectId(sourceId) }] }
  );

  await Ingredient.findByIdAndDelete(sourceId);

  return NextResponse.json({
    message: `Merged "${source.name}" into "${target.name}"`,
    recipesUpdated: result.modifiedCount,
  });
}
