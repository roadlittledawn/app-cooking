import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { Recipe } from "@/models/Recipe";
import { updateIngredientSchema } from "@/lib/validations/ingredient";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateIngredientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const name = parsed.data.name.toLowerCase().trim();

  const collision = await Ingredient.findOne({ name, _id: { $ne: id } });
  if (collision) {
    return NextResponse.json({ error: "An ingredient with that name already exists" }, { status: 409 });
  }

  const updated = await Ingredient.findByIdAndUpdate(id, { name }, { new: true });
  if (!updated) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;
  await connectDB();

  const { id } = await params;

  const recipesAffected = await Recipe.countDocuments({ "ingredients.ingredientId": id });

  const deleted = await Ingredient.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Ingredient deleted", recipesAffected });
}
