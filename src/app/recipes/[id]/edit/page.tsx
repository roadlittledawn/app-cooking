import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { RecipeForm } from "@/components/recipes/recipe-form";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipe: any = await Recipe.findById(id)
    .populate("ingredients.ingredientId", "name")
    .lean();

  if (!recipe) notFound();

  const initialData = {
    title: recipe.title as string,
    description: recipe.description as string,
    ingredients: (recipe.ingredients as { ingredientId: { _id: string; name: string }; amount: string; unit: string }[]).map((ing) => ({
      ingredientId: ing.ingredientId._id.toString(),
      name: ing.ingredientId.name,
      amount: ing.amount,
      unit: ing.unit,
    })),
    steps: recipe.steps as string,
    prepTime: recipe.prepTime as number,
    cookTime: recipe.cookTime as number,
    servings: recipe.servings as number,
    image: recipe.image as string | null,
    tags: recipe.tags as string[],
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Edit Recipe</h1>
      <RecipeForm initialData={initialData} recipeId={id} />
    </div>
  );
}
