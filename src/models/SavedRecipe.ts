import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ISavedRecipe extends Document {
  userId: Types.ObjectId;
  recipeId: Types.ObjectId;
  savedAt: Date;
}

const SavedRecipeSchema = new Schema<ISavedRecipe>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipeId: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
  savedAt: { type: Date, default: Date.now },
});

SavedRecipeSchema.index({ userId: 1, recipeId: 1 }, { unique: true });

export const SavedRecipe =
  mongoose.models.SavedRecipe ||
  mongoose.model<ISavedRecipe>("SavedRecipe", SavedRecipeSchema);
