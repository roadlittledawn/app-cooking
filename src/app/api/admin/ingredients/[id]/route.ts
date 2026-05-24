import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { Recipe } from "@/models/Recipe";
import { User } from "@/models/User";
import { updateIngredientSchema } from "@/lib/validations/ingredient";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const dbUser = await User.findById(session.user.id);
  if (!dbUser || dbUser.role !== "admin") return null;
  return dbUser;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const recipesAffected = await Recipe.countDocuments({ "ingredients.ingredientId": id });

  const deleted = await Ingredient.findByIdAndDelete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Ingredient deleted", recipesAffected });
}
