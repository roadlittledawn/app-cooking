"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import dynamic from "next/dynamic";

const AsyncSelect = dynamic(() => import("react-select/async"), { ssr: false });

interface IngredientOption {
  value: string;
  label: string;
}

interface SearchFiltersProps {
  allTags: string[];
  currentQ: string;
  currentTags: string[];
  currentIngredients: { id: string; name: string }[];
  currentSort: string;
}

export function SearchFilters({
  allTags,
  currentQ,
  currentTags,
  currentIngredients,
  currentSort,
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.set(key, value.join(","));
        } else {
          params.set(key, value);
        }
      }

      startTransition(() => {
        router.push(`/recipes?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const toggleTag = (tag: string) => {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateParams({ tags: next });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push("/recipes");
    });
  };

  async function loadIngredientOptions(inputValue: string): Promise<IngredientOption[]> {
    const res = await fetch(`/api/ingredients?q=${encodeURIComponent(inputValue)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((ing: { _id: string; name: string }) => ({
      value: ing._id,
      label: ing.name,
    }));
  }

  const selectedIngredientOptions: IngredientOption[] = currentIngredients.map((i) => ({
    value: i.id,
    label: i.name,
  }));

  const hasActiveFilters =
    currentQ || currentTags.length > 0 || currentIngredients.length > 0 || currentSort !== "newest";

  return (
    <div className="mb-8 space-y-4">
      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          defaultValue={currentQ}
          placeholder="Search recipes by title…"
          onChange={(e) => {
            const val = e.target.value;
            updateParams({ q: val || null });
          }}
          className="flex-1 border border-[var(--border)] bg-[var(--card)] rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)] transition-colors"
        />
        <div className="sm:w-64">
          <AsyncSelect
            isMulti
            cacheOptions
            defaultOptions
            loadOptions={loadIngredientOptions}
            value={selectedIngredientOptions}
            onChange={(selected) => {
              const opts = selected as IngredientOption[];
              updateParams({ ingredientIds: opts.map((o) => o.value) });
            }}
            placeholder="Filter by ingredient…"
            noOptionsMessage={({ inputValue }) =>
              inputValue.length < 1 ? "Type to search ingredients" : "No ingredients found"
            }
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "42px",
                fontSize: "0.875rem",
                backgroundColor: "var(--card)",
                borderColor: state.isFocused ? "var(--accent)" : "var(--border)",
                borderRadius: "2px",
                boxShadow: state.isFocused ? "0 0 0 1px var(--accent)" : "none",
                "&:hover": { borderColor: "var(--accent)" },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }),
              option: (base, state) => ({
                ...base,
                fontSize: "0.875rem",
                backgroundColor: state.isFocused ? "var(--muted)" : "var(--card)",
                color: "var(--foreground)",
              }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: "var(--accent)",
                borderRadius: "2px",
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: "white",
                fontSize: "0.75rem",
              }),
              multiValueRemove: (base) => ({
                ...base,
                color: "white",
                "&:hover": { backgroundColor: "var(--accent-dark)", color: "white" },
              }),
              input: (base) => ({ ...base, color: "var(--foreground)" }),
              placeholder: (base) => ({ ...base, color: "var(--muted-foreground)" }),
              indicatorSeparator: () => ({ display: "none" }),
              dropdownIndicator: (base) => ({
                ...base,
                color: "var(--muted-foreground)",
                "&:hover": { color: "var(--foreground)" },
              }),
            }}
          />
        </div>
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value === "newest" ? null : e.target.value })}
          className="border border-[var(--border)] bg-[var(--card)] rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--foreground)] cursor-pointer"
        >
          <option value="newest">Newest</option>
          <option value="alpha">A – Z</option>
          <option value="quickest">Quickest</option>
        </select>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = currentTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1 rounded-full border transition-all duration-150 ${
                  active
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--muted-foreground)]">Active filters:</span>
          {currentQ && (
            <span className="inline-flex items-center gap-1 text-xs bg-[var(--muted)] text-[var(--foreground)] px-2.5 py-1 rounded-full">
              &ldquo;{currentQ}&rdquo;
              <button
                onClick={() => updateParams({ q: null })}
                className="ml-0.5 hover:text-[var(--accent)] transition-colors"
                aria-label="Remove title filter"
              >
                ×
              </button>
            </span>
          )}
          {currentTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs bg-[var(--accent)] text-white px-2.5 py-1 rounded-full"
            >
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-0.5 hover:opacity-75 transition-opacity"
                aria-label={`Remove ${tag} filter`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
