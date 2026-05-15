import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { SavedRecipe } from "@/models/SavedRecipe";
import { RecipeCard } from "@/components/recipes/recipe-card";

export default async function SavedRecipesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();

  const savedRecipes = await SavedRecipe.find({ userId: session.user.id })
    .sort({ savedAt: -1 })
    .populate({
      path: "recipeId",
      populate: { path: "authorId", select: "name image" },
    })
    .lean();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Saved Recipes</h1>

      {savedRecipes.length === 0 ? (
        <p className="text-[var(--muted-foreground)] text-center py-12">
          No saved recipes yet. Browse recipes and click the heart to save them!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedRecipes.map((saved: any) => {
            const recipe = saved.recipeId;
            if (!recipe) return null;
            return (
              <RecipeCard
                key={saved._id.toString()}
                id={recipe._id.toString()}
                title={recipe.title}
                image={recipe.image}
                prepTime={recipe.prepTime}
                cookTime={recipe.cookTime}
                authorName={recipe.authorId?.name || "Unknown"}
                tags={recipe.tags}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
