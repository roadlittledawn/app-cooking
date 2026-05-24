import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { Recipe } from "@/models/Recipe";
import { User } from "@/models/User";
import { mergeIngredientSchema } from "@/lib/validations/ingredient";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
