"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface SearchFiltersProps {
  allTags: string[];
  currentQ: string;
  currentTags: string[];
  currentIngredient: string;
  currentSort: string;
}

export function SearchFilters({
  allTags,
  currentQ,
  currentTags,
  currentIngredient,
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

  const hasActiveFilters =
    currentQ || currentTags.length > 0 || currentIngredient || currentSort !== "newest";

  return (
    <div className="mb-8 space-y-4">
      {/* Search row */}
      <div className="flex gap-3">
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
        <input
          type="text"
          defaultValue={currentIngredient}
          placeholder="Filter by ingredient…"
          onChange={(e) => {
            const val = e.target.value;
            updateParams({ ingredient: val || null });
          }}
          className="w-52 border border-[var(--border)] bg-[var(--card)] rounded-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder:text-[var(--muted-foreground)] transition-colors"
        />
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
          {currentIngredient && (
            <span className="inline-flex items-center gap-1 text-xs bg-[var(--muted)] text-[var(--foreground)] px-2.5 py-1 rounded-full">
              ingredient: {currentIngredient}
              <button
                onClick={() => updateParams({ ingredient: null })}
                className="ml-0.5 hover:text-[var(--accent)] transition-colors"
                aria-label="Remove ingredient filter"
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
