import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Tag } from "@/models/Tag";
import { Recipe } from "@/models/Recipe";
import { User } from "@/models/User";
import { updateTagSchema } from "@/lib/validations/tag";

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
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const tag = await Tag.findById(id);
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  const updates: { name?: string; showInFilter?: boolean } = {};

  if (parsed.data.name !== undefined) {
    const newName = parsed.data.name.toLowerCase().trim();
    if (newName !== tag.name) {
      const collision = await Tag.findOne({ name: newName, _id: { $ne: id } });
      if (collision) {
        return NextResponse.json({ error: "A tag with that name already exists" }, { status: 409 });
      }
      await Recipe.updateMany(
        { tags: tag.name },
        { $set: { "tags.$[el]": newName } },
        { arrayFilters: [{ el: tag.name }] }
      );
      updates.name = newName;
    }
  }

  if (parsed.data.showInFilter !== undefined) {
    updates.showInFilter = parsed.data.showInFilter;
  }

  const updated = await Tag.findByIdAndUpdate(id, updates, { new: true });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const tag = await Tag.findById(id);
  if (!tag) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

  const result = await Recipe.updateMany(
    { tags: tag.name },
    { $pull: { tags: tag.name } }
  );

  await Tag.findByIdAndDelete(id);

  return NextResponse.json({ message: "Tag deleted", recipesAffected: result.modifiedCount });
}
