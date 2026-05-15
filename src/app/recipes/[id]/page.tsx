import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { connectDB } from "@/lib/db";
import { Recipe } from "@/models/Recipe";
import { auth } from "@/auth";
import { SaveButton } from "@/components/recipes/save-button";
import { SavedRecipe } from "@/models/SavedRecipe";

interface RecipePageProps {
  params: Promise<{ id: string }>;
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
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl font-bold">{recipe.title}</h1>
        <div className="flex items-center gap-2">
          {session?.user && (
            <SaveButton recipeId={id} initialSaved={isSaved} />
          )}
          {isOwner && (
            <Link
              href={`/recipes/${id}/edit`}
              className="border px-3 py-1.5 rounded-md text-sm hover:bg-gray-50"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
        <span>by {recipe.authorId?.name || "Unknown"}</span>
        {recipe.prepTime > 0 && <span>Prep: {recipe.prepTime} min</span>}
        {recipe.cookTime > 0 && <span>Cook: {recipe.cookTime} min</span>}
        <span>Servings: {recipe.servings}</span>
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {recipe.tags.map((tag: string) => (
            <Link
              key={tag}
              href={`/recipes?tag=${tag}`}
              className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-md hover:bg-blue-200"
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
          className="w-full rounded-lg mb-6 max-h-96 object-cover"
        />
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Description</h2>
        <div className="prose max-w-none">
          <ReactMarkdown>{recipe.description}</ReactMarkdown>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Ingredients</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing: { ingredientId: { name: string }; amount: string; unit: string }, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="font-medium">
                {ing.amount} {ing.unit}
              </span>
              <span>{ing.ingredientId?.name || "Unknown"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Instructions</h2>
        <div className="prose max-w-none">
          <ReactMarkdown>{recipe.steps}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
