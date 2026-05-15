import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!MONGODB_URI || !ADMIN_EMAIL) {
  console.error("Missing required env vars: MONGODB_URI, ADMIN_EMAIL");
  process.exit(1);
}

async function reset() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db!;
  const email = ADMIN_EMAIL!.toLowerCase();

  const deletedUser = await db.collection("users").deleteOne({ email });
  console.log(deletedUser.deletedCount ? `Deleted user: ${email}` : `No user found: ${email}`);

  const deletedInvite = await db.collection("invites").deleteOne({ email });
  console.log(deletedInvite.deletedCount ? `Deleted invite: ${email}` : `No invite found: ${email}`);

  await mongoose.disconnect();
  console.log("Done. Run 'npm run seed' to recreate.");
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
