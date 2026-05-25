import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Tag } from "@/models/Tag";
import { Recipe } from "@/models/Recipe";
import { User } from "@/models/User";
import { createTagSchema, renameTagSchema } from "@/lib/validations/tag";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  await connectDB();
  const dbUser = await User.findById(session.user.id);
  if (!dbUser || dbUser.role !== "admin") return null;
  return dbUser;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [recipeTags, tagDocs, recipeCounts] = await Promise.all([
    Recipe.distinct("tags"),
    Tag.find({}).lean(),
    Recipe.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map<string, number>(
    recipeCounts.map((r: { _id: string; count: number }) => [r._id, r.count])
  );
  const tagDocMap = new Map(tagDocs.map((t) => [t.name, t]));

  const allNames = new Set([...recipeTags, ...tagDocs.map((t) => t.name)]);

  const tags = [...allNames].sort().map((name) => {
    const doc = tagDocMap.get(name);
    return {
      name,
      tagId: doc?._id?.toString() ?? null,
      showInFilter: doc?.showInFilter ?? false,
      recipeCount: countMap.get(name) ?? 0,
    };
  });

  return NextResponse.json({ tags });
}

// Upsert a Tag doc by name (used to enable a tag for filter control)
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const name = parsed.data.name.toLowerCase().trim();
  const showInFilter = parsed.data.showInFilter ?? false;

  const tag = await Tag.findOneAndUpdate(
    { name },
    { $set: { showInFilter } },
    { upsert: true, new: true }
  );

  return NextResponse.json(tag);
}

// Rename a tag by name — used when no Tag doc exists yet
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = renameTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const oldName = parsed.data.name.toLowerCase().trim();
  const newName = parsed.data.newName.toLowerCase().trim();

  if (oldName === newName) return NextResponse.json({ name: newName });

  const collision = await Tag.findOne({ name: newName });
  if (collision) {
    return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
  }

  await Recipe.updateMany(
    { tags: oldName },
    { $set: { "tags.$[el]": newName } },
    { arrayFilters: [{ el: oldName }] }
  );

  // Update Tag doc if one exists, otherwise leave it (no doc to update)
  await Tag.findOneAndUpdate({ name: oldName }, { $set: { name: newName } });

  return NextResponse.json({ name: newName });
}
