import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IRecipeIngredient {
  ingredientId: Types.ObjectId;
  amount: string;
  unit: string;
}

export interface IRecipe extends Document {
  title: string;
  description: string;
  ingredients: IRecipeIngredient[];
  steps: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  image: string | null;
  tags: string[];
  authorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>(
  {
    ingredientId: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },
    amount: { type: String, required: true },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const RecipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    ingredients: { type: [RecipeIngredientSchema], default: [] },
    steps: { type: String, required: true },
    prepTime: { type: Number, required: true },
    cookTime: { type: Number, required: true },
    servings: { type: Number, required: true },
    image: { type: String, default: null },
    tags: { type: [String], default: [] },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

RecipeSchema.index({ title: "text", tags: 1 });

export const Recipe =
  mongoose.models.Recipe || mongoose.model<IRecipe>("Recipe", RecipeSchema);
