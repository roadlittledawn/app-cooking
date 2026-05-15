import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function NewRecipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create New Recipe</h1>
      <RecipeForm />
    </div>
  );
}
