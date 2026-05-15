import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string | null;
  image: string | null;
  role: "admin" | "user";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, default: null },
  image: { type: String, default: null },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  createdAt: { type: Date, default: Date.now },
});

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
