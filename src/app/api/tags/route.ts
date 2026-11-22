import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { connectDB } from "@/lib/db";
import { Tag } from "@/models/Tag";
import { Recipe } from "@/models/Recipe";

/**
 * Every tag name in use or defined, sorted. For any user (the local MCP server
 * picks tags from it); /api/admin/tags is the admin view with counts.
 */
export async function GET() {
  const { response } = await requireUser();
  if (response) return response;
  await connectDB();

  const [recipeTags, tagDocs] = await Promise.all([
    Recipe.distinct("tags"),
    Tag.find({}, { name: 1 }).lean(),
  ]);

  // distinct() yields null for recipes with an empty tags array.
  const names = new Set<string>(
    [...recipeTags, ...tagDocs.map((t) => t.name)].filter(
      (n): n is string => typeof n === "string" && n.length > 0
    )
  );
  return NextResponse.json({ tags: [...names].sort() });
}
