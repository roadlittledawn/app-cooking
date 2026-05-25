import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { createIngredientSchema } from "@/lib/validations/ingredient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  await connectDB();

  const filter = q
    ? { name: { $regex: q, $options: "i" } }
    : {};

  const ingredients = await Ingredient.find(filter)
    .sort({ name: 1 })
    .limit(20)
    .lean();

  return NextResponse.json(ingredients);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createIngredientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await connectDB();

  const name = parsed.data.name.toLowerCase().trim();
  const existing = await Ingredient.findOne({ name });
  if (existing) {
    return NextResponse.json(existing);
  }

  const ingredient = await Ingredient.create({
    name,
    createdBy: session.user.id,
  });

  return NextResponse.json(ingredient, { status: 201 });
}
