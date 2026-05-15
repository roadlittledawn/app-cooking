import mongoose from "mongoose";
import bcrypt from "bcrypt";

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_NAME = process.env.ADMIN_NAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
  console.error(
    "Missing required env vars: MONGODB_URI, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD"
  );
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;

  const existingAdmin = await db
    .collection("users")
    .findOne({ email: ADMIN_EMAIL!.toLowerCase() });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);
    await db.collection("users").insertOne({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL!.toLowerCase(),
      passwordHash,
      image: null,
      role: "admin",
      createdAt: new Date(),
    });
    console.log(`Admin user created: ${ADMIN_EMAIL}`);
  }

  const existingInvite = await db
    .collection("invites")
    .findOne({ email: ADMIN_EMAIL!.toLowerCase() });

  if (existingInvite) {
    console.log(`Invite already exists for: ${ADMIN_EMAIL}`);
  } else {
    const admin = await db
      .collection("users")
      .findOne({ email: ADMIN_EMAIL!.toLowerCase() });
    await db.collection("invites").insertOne({
      email: ADMIN_EMAIL!.toLowerCase(),
      invitedBy: admin!._id,
      usedAt: new Date(),
      createdAt: new Date(),
    });
    console.log(`Invite created for: ${ADMIN_EMAIL}`);
  }

  await mongoose.disconnect();
  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
