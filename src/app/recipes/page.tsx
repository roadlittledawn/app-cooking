import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { RecipeCard } from "@/components/recipes/recipe-card";

export const metadata: Metadata = {
  title: "Recipes | App Cooking",
  description: "Browse and discover cooking recipes",
};

interface RecipesPageProps {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { q, tag, page } = await searchParams;
  const currentPage = parseInt(page || "1");
  const limit = 12;

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (q) filter.title = { $regex: q, $options: "i" };
  if (tag) filter.tags = tag;

  const total = await Recipe.countDocuments(filter);
  const recipes = await Recipe.find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * limit)
    .limit(limit)
    .populate("authorId", "name image")
    .lean();

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Recipes</h1>
        <Link
          href="/recipes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          New Recipe
        </Link>
      </div>

      <form className="mb-6 flex gap-3">
        <input
          name="q"
          type="text"
          defaultValue={q}
          placeholder="Search recipes..."
          className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="border px-4 py-2 rounded-md hover:bg-gray-50"
        >
          Search
        </button>
      </form>

      {recipes.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No recipes found. {q || tag ? "Try a different search." : "Create your first recipe!"}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: any) => (
            <RecipeCard
              key={recipe._id.toString()}
              id={recipe._id.toString()}
              title={recipe.title}
              image={recipe.image}
              prepTime={recipe.prepTime}
              cookTime={recipe.cookTime}
              authorName={recipe.authorId?.name || "Unknown"}
              tags={recipe.tags}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/recipes?page=${p}${q ? `&q=${q}` : ""}${tag ? `&tag=${tag}` : ""}`}
              className={`px-3 py-1 rounded-md ${
                p === currentPage
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
