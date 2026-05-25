import type { Metadata } from "next";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { RecipeCard } from "@/components/recipes/recipe-card";

export const metadata: Metadata = {
  title: "Abramogosch Cooking",
  description: "A personal collection of recipes worth making again",
};

export default async function HomePage() {
  await connectDB();

  const [featured, recent] = await Promise.all([
    Recipe.find({ featured: true })
      .sort({ updatedAt: -1 })
      .limit(6)
      .populate("authorId", "name image")
      .lean(),
    Recipe.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("authorId", "name image")
      .lean(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--border)] px-6 py-16 md:py-24 text-center">
        <p className="text-xs tracking-[0.2em] uppercase text-[var(--accent)] mb-4 font-medium">
          A personal recipe collection
        </p>
        <h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl text-[var(--foreground)] leading-tight mb-6">
          Abramogosch<br />Cooking
        </h1>
        <p className="text-[var(--muted-foreground)] max-w-md mx-auto mb-8 leading-relaxed">
          Recipes worth writing down. Browse the collection or search by ingredient, tag, or anything you have on hand.
        </p>
        <Link
          href="/recipes"
          className="inline-block bg-[var(--accent)] text-white px-8 py-3 rounded-sm hover:bg-[var(--accent-dark)] transition-colors duration-150 tracking-wide text-sm"
        >
          Browse All Recipes
        </Link>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-8">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--accent)] mb-1 font-medium">
              ★ Featured
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl text-[var(--foreground)]">
              Worth Making This Week
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((recipe: any) => (
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
        </section>
      )}

      {featured.length === 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 text-center">
          <p className="text-[var(--muted-foreground)] text-sm">
            No featured recipes yet. Admins can feature recipes from any recipe page.
          </p>
        </section>
      )}

      {/* Recently Added */}
      {recent.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-12 border-t border-[var(--border)]">
          <div className="mb-8">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--accent)] mb-1 font-medium">
              Recently Added
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-3xl text-[var(--foreground)]">
              New to the Collection
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recent.map((recipe: any) => (
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
        </section>
      )}
    </div>
  );
}
