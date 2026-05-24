import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { User } from "@/models/User";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
