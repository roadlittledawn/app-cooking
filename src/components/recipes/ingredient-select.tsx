"use client";

import { useState } from "react";
import AsyncCreatableSelect from "react-select/async-creatable";

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

  async function handleSelect(option: IngredientOption | null) {
    if (!option || !currentAmount || !currentUnit) return;

    let ingredientId = option.value;

    if (option.__isNew__) {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: option.label }),
      });
      if (!res.ok) return;
      const created = await res.json();
      ingredientId = created._id;
    }

    onChange([
      ...ingredients,
      {
        ingredientId,
        name: option.label,
        amount: currentAmount,
        unit: currentUnit,
      },
    ]);

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
              className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-md"
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

      <div className="flex gap-2 items-end">
        <div className="w-20">
          <label className="block text-xs text-gray-500 mb-1">Amount</label>
          <input
            type="text"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="1"
            className="w-full border rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <div className="w-20">
          <label className="block text-xs text-gray-500 mb-1">Unit</label>
          <input
            type="text"
            value={currentUnit}
            onChange={(e) => setCurrentUnit(e.target.value)}
            placeholder="cup"
            className="w-full border rounded-md px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Ingredient</label>
          <AsyncCreatableSelect
            cacheOptions
            defaultOptions
            loadOptions={loadOptions}
            onChange={handleSelect}
            placeholder="Search or add ingredient..."
            formatCreateLabel={(input: string) => `Add "${input}"`}
            value={null}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: "34px",
                fontSize: "0.875rem",
              }),
            }}
          />
        </div>
      </div>
    </div>
  );
}
