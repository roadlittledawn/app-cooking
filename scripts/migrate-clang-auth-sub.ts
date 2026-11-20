/**
 * One-time migration: store each existing user's clang-auth ID (`sub`) on
 * their User document, so recipes, saved recipes and ingredients stay
 * attached after the switch to clang-auth. See docs/clang-auth-migration.md (P5).
 *
 *   clang-auth --json user list --app cooking \
 *     | jq '[.[] | {email, sub: .id}]' > /tmp/cooking-subs.json
 *   npm run migrate:clang-auth-sub -- /tmp/cooking-subs.json          # dry run
 *   npm run migrate:clang-auth-sub -- /tmp/cooking-subs.json --apply  # write
 *
 * Reads MONGODB_URI from the environment, else .env.local. Only ever writes
 * users.clangAuthSub (and its index). Safe to rerun.
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { planSubLinks, type SubMapping, type LocalUser } from "../src/lib/auth/link-plan";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: migrate-clang-auth-sub <mapping.json> [--apply]");
    process.exit(2);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(2);
  }

  const mappings = JSON.parse(readFileSync(file, "utf8")) as SubMapping[];
  if (!Array.isArray(mappings)) throw new Error("mapping file must be a JSON array of { email, sub }");

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  console.log(`Database: ${db.databaseName} (${apply ? "APPLY" : "dry run"})\n`);

  const users = db.collection("users");
  const docs = await users.find({}, { projection: { email: 1, clangAuthSub: 1 } }).toArray();
  const local: LocalUser[] = docs.map((d) => ({
    id: d._id.toString(),
    email: String(d.email),
    clangAuthSub: d.clangAuthSub ?? null,
  }));

  const plan = planSubLinks(mappings, local);

  const show = (title: string, rows: string[]) => {
    console.log(`${title} (${rows.length})`);
    for (const r of rows) console.log(`  ${r}`);
    console.log();
  };
  show("Link", plan.link.map((l) => `${l.email} → ${l.sub}`));
  show("Already linked", plan.alreadyLinked.map((l) => `${l.email} → ${l.sub}`));
  show("Conflicts (skipped)", plan.conflicts.map((c) => `${c.email} → ${c.sub}: ${c.reason}`));
  show("clang-auth users with no User here (new User on first sign-in)", plan.noLocalUser.map((m) => m.email));

  const orphanRows: string[] = [];
  for (const u of plan.noClangAuthUser) {
    const id = new mongoose.Types.ObjectId(u.id);
    const [recipes, saved, ingredients] = await Promise.all([
      db.collection("recipes").countDocuments({ authorId: id }),
      db.collection("savedrecipes").countDocuments({ userId: id }),
      db.collection("ingredients").countDocuments({ createdBy: id }),
    ]);
    orphanRows.push(`${u.email}: ${recipes} recipes, ${saved} saved, ${ingredients} ingredients`);
  }
  show("Users with no clang-auth account (can't sign in until mapped)", orphanRows);

  if (apply) {
    await users.createIndex(
      { clangAuthSub: 1 },
      { unique: true, partialFilterExpression: { clangAuthSub: { $type: "string" } } }
    );
    let written = 0;
    for (const l of plan.link) {
      // Guarded by the filter: never overwrite an existing link.
      const res = await users.updateOne(
        { _id: new mongoose.Types.ObjectId(l.userId), clangAuthSub: { $exists: false } },
        { $set: { clangAuthSub: l.sub } }
      );
      written += res.modifiedCount;
    }
    console.log(`Wrote ${written} of ${plan.link.length} links.`);
  } else if (plan.link.length > 0) {
    console.log("Dry run: nothing written. Rerun with --apply.");
  }

  await mongoose.disconnect();
  if (plan.conflicts.length > 0) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
