import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { createRecipeSchema } from "@/lib/validations/recipe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const search = searchParams.get("q") || "";
  const tag = searchParams.get("tag") || "";

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }
  if (tag) {
    filter.tags = tag;
  }

  const total = await Recipe.countDocuments(filter);
  const recipes = await Recipe.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("authorId", "name image")
    .populate("ingredients.ingredientId", "name")
    .lean();

  return NextResponse.json({
    recipes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRecipeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await connectDB();

  const recipe = await Recipe.create({
    ...parsed.data,
    authorId: session.user.id,
  });

  return NextResponse.json(recipe, { status: 201 });
}
