import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { createIngredientSchema } from "@/lib/validations/ingredient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const name = searchParams.get("name");

  await connectDB();

  // Exact lookup (names are stored lowercase): 0 or 1 results. Used by the
  // local MCP server to resolve ingredient names without regex near-misses.
  if (name !== null) {
    const match = await Ingredient.findOne({ name: name.toLowerCase().trim() }).lean();
    return NextResponse.json(match ? [match] : []);
  }

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
  const { user, response } = await requireUser();
  if (response) return response;

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
    createdBy: user.id,
  });

  return NextResponse.json(ingredient, { status: 201 });
}
