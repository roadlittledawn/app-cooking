"use client";

import { useState } from "react";

interface SaveButtonProps {
  recipeId: string;
  initialSaved: boolean;
}

export function SaveButton({ recipeId, initialSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggleSave() {
    setLoading(true);
    const method = saved ? "DELETE" : "POST";
    const res = await fetch(`/api/saved/${recipeId}`, { method });

    if (res.ok) {
      setSaved(!saved);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`p-2 rounded-md border transition-colors ${
        saved
          ? "text-red-500 border-red-200 bg-red-50 hover:bg-red-100"
          : "text-gray-400 hover:text-red-500 hover:border-red-200"
      }`}
      title={saved ? "Unsave recipe" : "Save recipe"}
    >
      <svg
        className="w-5 h-5"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
