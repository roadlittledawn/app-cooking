"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "./markdown-editor";
import { IngredientSelect } from "./ingredient-select";

interface RecipeIngredient {
  ingredientId: string;
  name: string;
  amount: string;
  unit: string;
}

interface RecipeFormData {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  steps: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  image: string | null;
  tags: string[];
}

interface RecipeFormProps {
  initialData?: RecipeFormData;
  recipeId?: string;
}

const defaultData: RecipeFormData = {
  title: "",
  description: "",
  ingredients: [],
  steps: "",
  prepTime: 0,
  cookTime: 0,
  servings: 1,
  image: null,
  tags: [],
};

export function RecipeForm({ initialData, recipeId }: RecipeFormProps) {
  const router = useRouter();
  const [data, setData] = useState<RecipeFormData>(initialData || defaultData);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!recipeId;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setData({ ...data, image: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    let imageUrl = data.image;

    if (imageFile) {
      const form = new FormData();
      form.append("file", imageFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        setError(err.error || "Image upload failed");
        setLoading(false);
        return;
      }
      const { url } = await uploadRes.json();
      imageUrl = url;
    }

    const payload = {
      ...data,
      image: imageUrl,
      ingredients: data.ingredients.map(({ ingredientId, amount, unit }) => ({
        ingredientId,
        amount,
        unit,
      })),
    };

    const url = isEdit ? `/api/recipes/${recipeId}` : "/api/recipes";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Something went wrong");
      return;
    }

    const recipe = await res.json();
    router.push(`/recipes/${recipe._id}`);
    router.refresh();
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !data.tags.includes(tag)) {
      setData({ ...data, tags: [...data.tags, tag] });
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setData({ ...data, tags: data.tags.filter((t) => t !== tag) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={data.title}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          required
          className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <MarkdownEditor
        label="Description"
        value={data.description}
        onChange={(description) => setData({ ...data, description })}
        placeholder="Describe your recipe..."
      />

      <IngredientSelect
        ingredients={data.ingredients}
        onChange={(ingredients) => setData({ ...data, ingredients })}
      />

      <MarkdownEditor
        label="Steps / Instructions"
        value={data.steps}
        onChange={(steps) => setData({ ...data, steps })}
        placeholder="Write your cooking steps in markdown..."
      />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="prepTime" className="block text-sm font-medium mb-1">
            Prep Time (min)
          </label>
          <input
            id="prepTime"
            type="number"
            min={0}
            value={data.prepTime}
            onChange={(e) =>
              setData({ ...data, prepTime: parseInt(e.target.value) || 0 })
            }
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="cookTime" className="block text-sm font-medium mb-1">
            Cook Time (min)
          </label>
          <input
            id="cookTime"
            type="number"
            min={0}
            value={data.cookTime}
            onChange={(e) =>
              setData({ ...data, cookTime: parseInt(e.target.value) || 0 })
            }
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="servings" className="block text-sm font-medium mb-1">
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min={1}
            value={data.servings}
            onChange={(e) =>
              setData({ ...data, servings: parseInt(e.target.value) || 1 })
            }
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Image</label>
        {imagePreview ? (
          <div className="relative w-full max-w-sm">
            <img
              src={imagePreview}
              alt="Recipe preview"
              className="w-full rounded-lg object-cover max-h-48"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-black/80"
              title="Remove image"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full max-w-sm h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-[var(--muted)] transition-colors">
            <svg className="w-8 h-8 mb-1 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-[var(--muted-foreground)]">Click to upload image</span>
            <span className="text-xs text-[var(--muted-foreground)] mt-1">JPEG, PNG, WebP, GIF — max 5MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-600 hover:text-blue-800"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag and press Enter"
            className="flex-1 border rounded-md px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addTag}
            className="border px-3 py-2 rounded-md text-sm hover:opacity-80"
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading
          ? isEdit
            ? "Saving..."
            : "Creating..."
          : isEdit
            ? "Save Changes"
            : "Create Recipe"}
      </button>
    </form>
  );
}
