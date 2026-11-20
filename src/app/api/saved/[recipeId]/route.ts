import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { SavedRecipe } from "@/models/SavedRecipe";
import { Recipe } from "@/models/Recipe";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params;
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();

  const recipe = await Recipe.findById(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const existing = await SavedRecipe.findOne({
    userId: user.id,
    recipeId,
  });

  if (existing) {
    return NextResponse.json({ message: "Already saved" });
  }

  await SavedRecipe.create({
    userId: user.id,
    recipeId,
  });

  return NextResponse.json({ message: "Recipe saved" }, { status: 201 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params;
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();

  await SavedRecipe.findOneAndDelete({
    userId: user.id,
    recipeId,
  });

  return NextResponse.json({ message: "Recipe unsaved" });
}
