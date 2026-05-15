import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { SavedRecipe } from "@/models/SavedRecipe";
import { Recipe } from "@/models/Recipe";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const recipe = await Recipe.findById(recipeId);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const existing = await SavedRecipe.findOne({
    userId: session.user.id,
    recipeId,
  });

  if (existing) {
    return NextResponse.json({ message: "Already saved" });
  }

  await SavedRecipe.create({
    userId: session.user.id,
    recipeId,
  });

  return NextResponse.json({ message: "Recipe saved" }, { status: 201 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  await SavedRecipe.findOneAndDelete({
    userId: session.user.id,
    recipeId,
  });

  return NextResponse.json({ message: "Recipe unsaved" });
}
