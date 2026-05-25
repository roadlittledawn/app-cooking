"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FeaturedToggleProps {
  recipeId: string;
  initialFeatured: boolean;
}

export function FeaturedToggle({ recipeId, initialFeatured }: FeaturedToggleProps) {
  const router = useRouter();
  const [featured, setFeatured] = useState(initialFeatured);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const next = !featured;
    setFeatured(next);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: next }),
      });
      if (!res.ok) {
        setFeatured(!next);
      } else {
        router.refresh();
      }
    } catch {
      setFeatured(!next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={featured ? "Remove from featured" : "Mark as featured"}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border transition-all duration-150 ${
        featured
          ? "bg-[var(--accent)] border-[var(--accent)] text-white"
          : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      } disabled:opacity-50`}
    >
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill={featured ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
      {featured ? "Featured" : "Feature"}
    </button>
  );
}
