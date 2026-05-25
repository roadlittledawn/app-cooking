"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const AsyncCreatableSelect = dynamic(
  () => import("react-select/async-creatable"),
  { ssr: false }
);

interface IngredientOption {
  value: string;
  label: string;
  __isNew__?: boolean;
}

interface RecipeIngredient {
  ingredientId: string;
  name: string;
  amount: string;
  unit: string;
}

interface IngredientSelectProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

export function IngredientSelect({ ingredients, onChange }: IngredientSelectProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientOption | null>(null);
  const [currentAmount, setCurrentAmount] = useState("");
  const [currentUnit, setCurrentUnit] = useState("");

  async function loadOptions(inputValue: string): Promise<IngredientOption[]> {
    const res = await fetch(`/api/ingredients?q=${encodeURIComponent(inputValue)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((ing: { _id: string; name: string }) => ({
      value: ing._id,
      label: ing.name,
    }));
  }

  async function handleSelect(option: unknown) {
    const opt = option as IngredientOption | null;
    if (!opt) {
      setSelectedIngredient(null);
      return;
    }

    if (opt.__isNew__) {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: opt.label }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setSelectedIngredient({ value: created._id, label: created.name });
    } else {
      setSelectedIngredient(opt);
    }
  }

  function handleAddToRecipe() {
    if (!selectedIngredient || !currentAmount || !currentUnit) return;

    onChange([
      ...ingredients,
      {
        ingredientId: selectedIngredient.value,
        name: selectedIngredient.label,
        amount: currentAmount,
        unit: currentUnit,
      },
    ]);

    setSelectedIngredient(null);
    setCurrentAmount("");
    setCurrentUnit("");
  }

  function removeIngredient(index: number) {
    onChange(ingredients.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Ingredients</label>

      {ingredients.length > 0 && (
        <ul className="space-y-2">
          {ingredients.map((ing, i) => (
            <li
              key={i}
              className="flex items-center gap-2 bg-[var(--muted)] px-3 py-2 rounded-md"
            >
              <span className="flex-1">
                {ing.amount} {ing.unit} — {ing.name}
              </span>
              <button
                type="button"
                onClick={() => removeIngredient(i)}
                className="text-red-500 text-sm hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex gap-2 sm:contents">
          <div className="w-1/2 sm:w-20">
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Amount</label>
            <input
              type="text"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="1"
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div className="w-1/2 sm:w-20">
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Unit</label>
            <input
              type="text"
              value={currentUnit}
              onChange={(e) => setCurrentUnit(e.target.value)}
              placeholder="cup"
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="sm:flex-1">
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">Ingredient</label>
          <AsyncCreatableSelect
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            onChange={handleSelect}
            placeholder="Search or create ingredient..."
            formatCreateLabel={(input: string) => `Create "${input}"`}
            value={selectedIngredient}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: "34px",
                fontSize: "0.875rem",
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "var(--muted)" : "var(--card)",
                color: "var(--foreground)",
              }),
              input: (base) => ({
                ...base,
                color: "var(--foreground)",
              }),
              placeholder: (base) => ({
                ...base,
                color: "var(--muted-foreground)",
              }),
              singleValue: (base) => ({
                ...base,
                color: "var(--foreground)",
              }),
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleAddToRecipe}
          disabled={!selectedIngredient || !currentAmount || !currentUnit}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap sm:self-end"
        >
          Add to Recipe
        </button>
      </div>
    </div>
  );
}
