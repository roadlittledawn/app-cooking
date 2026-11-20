import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const filter = q ? { name: { $regex: `^${q}`, $options: "i" } } : {};

  const [ingredients, total] = await Promise.all([
    Ingredient.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Ingredient.countDocuments(filter),
  ]);

  return NextResponse.json({
    ingredients,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
