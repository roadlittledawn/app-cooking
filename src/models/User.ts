import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  /** clang-auth user ID (the access token's `sub`). See docs/clang-auth-migration.md. */
  clangAuthSub?: string;
  /** Legacy bcrypt hash from before clang-auth. Unused; removed in cleanup (C2). */
  passwordHash: string | null;
  image: string | null;
  /** Mirror of the clang-auth grant (admin or not), kept in step on each request. */
  role: "admin" | "user";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  // No default: the partial unique index below ignores documents without it.
  clangAuthSub: { type: String },
  passwordHash: { type: String, default: null },
  image: { type: String, default: null },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index(
  { clangAuthSub: 1 },
  { unique: true, partialFilterExpression: { clangAuthSub: { $type: "string" } } }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
