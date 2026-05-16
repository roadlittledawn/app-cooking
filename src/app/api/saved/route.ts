import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { SavedRecipe } from "@/models/SavedRecipe";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const saved = await SavedRecipe.find({ userId: session.user.id })
    .sort({ savedAt: -1 })
    .populate({
      path: "recipeId",
      populate: { path: "authorId", select: "name image" },
    })
    .lean();

  return NextResponse.json({ saved });
}
