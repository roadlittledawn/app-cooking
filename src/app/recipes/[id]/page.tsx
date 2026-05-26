import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Pencil } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { auth } from "@/auth";
import { SaveButton } from "@/components/recipes/save-button";
import { SavedRecipe } from "@/models/SavedRecipe";

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipe: any = await Recipe.findById(id).lean();
  if (!recipe) return { title: "Recipe Not Found" };

  return {
    title: `${recipe.title} | Abramogosch Cooking`,
    description: recipe.description?.slice(0, 160),
    openGraph: {
      title: recipe.title,
      description: recipe.description?.slice(0, 160),
      ...(recipe.image ? { images: [recipe.image] } : {}),
    },
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;
  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recipe: any = await Recipe.findById(id)
    .populate("authorId", "name image")
    .populate("ingredients.ingredientId", "name")
    .lean();

  if (!recipe) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === recipe.authorId?._id?.toString();

  let isSaved = false;
  if (session?.user) {
    const saved = await SavedRecipe.findOne({
      userId: session.user.id,
      recipeId: id,
    });
    isSaved = !!saved;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl leading-tight text-[var(--foreground)] mb-3">
        {recipe.title}
      </h1>
      <div className="flex items-center gap-2 mb-4">
        {session?.user && <SaveButton recipeId={id} initialSaved={isSaved} />}
        {isOwner && (
          <Link
            href={`/recipes/${id}/edit`}
            className="flex items-center gap-1.5 border border-[var(--border)] px-3 py-1.5 rounded-sm text-sm text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-150"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)] mb-6">
        <span className="italic">by {recipe.authorId?.name || "Unknown"}</span>
        {recipe.prepTime > 0 && <span>Prep: {recipe.prepTime} min</span>}
        {recipe.cookTime > 0 && <span>Cook: {recipe.cookTime} min</span>}
        <span>Serves {recipe.servings}</span>
        {recipe.featured && (
          <span className="text-[var(--accent)] text-xs font-medium tracking-wide uppercase">
            ★ Featured
          </span>
        )}
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {recipe.tags.map((tag: string) => (
            <Link
              key={tag}
              href={`/recipes?tags=${tag}`}
              className="text-xs border border-[var(--border)] text-[var(--muted-foreground)] px-2.5 py-1 rounded-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-150"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {recipe.image && (
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full rounded-sm mb-8 max-h-96 object-cover"
        />
      )}

      <section className="mb-8">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl mb-3 text-[var(--foreground)]">
          Description
        </h2>
        <div className="prose max-w-none text-[var(--foreground)]">
          <ReactMarkdown>{recipe.description}</ReactMarkdown>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl mb-3 text-[var(--foreground)]">
          Ingredients
        </h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing: { ingredientId: { name: string }; amount: string; unit: string }, i: number) => (
            <li key={i} className="flex gap-2 text-sm border-b border-[var(--border)] pb-2 last:border-0">
              <span className="font-medium text-[var(--foreground)] w-24 shrink-0">
                {ing.amount} {ing.unit}
              </span>
              <span className="text-[var(--muted-foreground)]">{ing.ingredientId?.name || "Unknown"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl mb-3 text-[var(--foreground)]">
          Instructions
        </h2>
        <div className="prose max-w-none text-[var(--foreground)]">
          <ReactMarkdown>{recipe.steps}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
