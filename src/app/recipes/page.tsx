import type { Metadata } from "next";
import type { Types } from "mongoose";
import Link from "next/link";

interface LeanRecipe {
  _id: Types.ObjectId;
  title: string;
  image: string | null;
  prepTime: number;
  cookTime: number;
  tags: string[];
  authorId: { name: string } | null;
}
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { Ingredient } from "@/models/Ingredient";
import { Tag } from "@/models/Tag";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { SearchFilters } from "@/components/recipes/search-filters";

export const metadata: Metadata = {
  title: "Recipes | Abramogosch Cooking",
  description: "Browse and discover cooking recipes",
};

interface RecipesPageProps {
  searchParams: Promise<{
    q?: string;
    tags?: string;
    ingredientIds?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const { q, tags: tagsParam, ingredientIds: ingredientIdsParam, sort, page } = await searchParams;
  const currentPage = parseInt(page || "1");
  const limit = 12;
  const selectedTags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const selectedIngredientIds = ingredientIdsParam ? ingredientIdsParam.split(",").filter(Boolean) : [];
  const currentSort = sort || "newest";

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (q) filter.title = { $regex: q, $options: "i" };
  if (selectedTags.length > 0) filter.tags = { $in: selectedTags };
  if (selectedIngredientIds.length > 0) {
    filter["ingredients.ingredientId"] = { $in: selectedIngredientIds };
  }

  const sortQuery: Record<string, 1 | -1> =
    currentSort === "alpha"
      ? { title: 1 }
      : currentSort === "quickest"
      ? { cookTime: 1 }
      : { createdAt: -1 };

  const [total, recipes, filterTags, currentIngredients] = await Promise.all([
    Recipe.countDocuments(filter),
    Recipe.find(filter)
      .sort(sortQuery)
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .populate("authorId", "name image")
      .lean<LeanRecipe[]>(),
    Tag.find({ showInFilter: true }).sort({ name: 1 }).lean(),
    selectedIngredientIds.length > 0
      ? Ingredient.find({ _id: { $in: selectedIngredientIds } })
          .select("_id name")
          .lean<{ _id: { toString(): string }; name: string }[]>()
      : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl text-[var(--foreground)]">
            Recipes
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1.5">
            {total} {total === 1 ? "recipe" : "recipes"}
            {selectedTags.length > 0 || q || selectedIngredientIds.length > 0 ? " found" : " in the collection"}
          </p>
        </div>
        <Link
          href="/recipes/new"
          className="text-sm bg-[var(--accent)] text-white px-5 py-2 rounded-sm hover:bg-[var(--accent-dark)] transition-colors duration-150 tracking-wide"
        >
          New Recipe
        </Link>
      </div>

      <Suspense>
        <SearchFilters
          allTags={filterTags.map((t) => t.name)}
          currentQ={q || ""}
          currentTags={selectedTags}
          currentIngredients={currentIngredients.map((i) => ({
            id: i._id.toString(),
            name: i.name,
          }))}
          currentSort={currentSort}
        />
      </Suspense>

      {recipes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-sm">
          <p className="text-[var(--muted-foreground)] text-sm">
            {q || selectedTags.length > 0 || selectedIngredientIds.length > 0
              ? "No recipes match your filters. Try adjusting your search."
              : "No recipes yet. Add your first one!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
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
        <div className="flex justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (tagsParam) params.set("tags", tagsParam);
            if (ingredientIdsParam) params.set("ingredientIds", ingredientIdsParam);
            if (sort) params.set("sort", sort);
            params.set("page", String(p));
            return (
              <Link
                key={p}
                href={`/recipes?${params.toString()}`}
                className={`w-8 h-8 flex items-center justify-center text-sm rounded-sm transition-colors duration-150 ${
                  p === currentPage
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {p}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
