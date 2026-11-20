import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const { featured } = await request.json();

  if (typeof featured !== "boolean") {
    return NextResponse.json({ error: "featured must be a boolean" }, { status: 400 });
  }

  await connectDB();

  const recipe = await Recipe.findByIdAndUpdate(id, { featured }, { new: true });
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ featured: recipe.featured });
}
