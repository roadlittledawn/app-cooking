import mongoose, { Schema, type Document } from "mongoose";

export interface ITag extends Document {
  name: string;
  showInFilter: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, lowercase: true },
    showInFilter: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Tag =
  mongoose.models.Tag || mongoose.model<ITag>("Tag", TagSchema);
