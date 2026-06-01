import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { RecipeForm } from "@/components/recipes/recipe-form";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = (session.user as { role?: string }).role === "admin";

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
    featured: !!recipe.featured,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-6">
        <h1 className="text-2xl font-bold">Edit Recipe</h1>
        <a
          href={`/recipes/${id}`}
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          View recipe
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      <RecipeForm initialData={initialData} recipeId={id} canSetFeatured={isAdmin} />
    </div>
  );
}
