"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

interface SaveButtonProps {
  recipeId: string;
  initialSaved: boolean;
}

export function SaveButton({ recipeId, initialSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [popping, setPopping] = useState(false);

  async function toggleSave() {
    setLoading(true);
    const method = saved ? "DELETE" : "POST";
    const res = await fetch(`/api/saved/${recipeId}`, { method });

    if (res.ok) {
      const next = !saved;
      setSaved(next);
      if (next) {
        setPopping(true);
        setTimeout(() => setPopping(false), 700);
      }
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggleSave}
      disabled={loading}
      className={`relative p-2 rounded-md border transition-colors ${
        saved
          ? "text-red-500 border-red-200 bg-[var(--muted)] hover:bg-[var(--muted)]"
          : "text-[var(--muted-foreground)] hover:text-red-500 hover:border-red-200"
      }`}
      title={saved ? "Unsave recipe" : "Save recipe"}
    >
      {popping && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full bg-red-400 animate-[ripple-out_0.55s_ease-out_forwards]" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-red-400 animate-[ripple-out_0.55s_ease-out_0.18s_forwards]" />
        </>
      )}
      <Heart
        className={`w-5 h-5 ${popping ? "animate-[heart-pop_0.4s_ease-out]" : ""}`}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
