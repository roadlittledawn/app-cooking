import { redirect } from "next/navigation";
import { getCurrentUser, loginUrlFor } from "@/lib/auth/current-user";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function NewRecipePage() {
  const user = await getCurrentUser();
  if (!user) redirect(await loginUrlFor("/recipes/new"));

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create New Recipe</h1>
      <RecipeForm />
    </div>
  );
}
