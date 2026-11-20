import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { SavedRecipe } from "@/models/SavedRecipe";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();

  const saved = await SavedRecipe.find({ userId: user.id })
    .sort({ savedAt: -1 })
    .populate({
      path: "recipeId",
      populate: { path: "authorId", select: "name image" },
    })
    .lean();

  return NextResponse.json({ saved });
}
