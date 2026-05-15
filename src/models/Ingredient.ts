import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IIngredient extends Document {
  name: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const IngredientSchema = new Schema<IIngredient>({
  name: { type: String, required: true, unique: true, lowercase: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Ingredient =
  mongoose.models.Ingredient ||
  mongoose.model<IIngredient>("Ingredient", IngredientSchema);
