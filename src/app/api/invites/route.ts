import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Invite } from "@/models/Invite";
import { User } from "@/models/User";
import { createInviteSchema } from "@/lib/validations/invite";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await Invite.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(invites);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id);
  if (!dbUser || dbUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await Invite.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "An invite for this email already exists." },
      { status: 409 }
    );
  }

  const invite = await Invite.create({
    email,
    invitedBy: dbUser._id,
  });

  return NextResponse.json(invite, { status: 201 });
}

export async function DELETE(request: Request) {
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
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing invite id" }, { status: 400 });
  }

  const invite = await Invite.findById(id);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.usedAt) {
    return NextResponse.json(
      { error: "Cannot revoke a used invite" },
      { status: 400 }
    );
  }

  await Invite.findByIdAndDelete(id);
  return NextResponse.json({ message: "Invite revoked" });
}
