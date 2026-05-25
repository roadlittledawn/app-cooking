"use client";

import { useState, useEffect, useCallback } from "react";

interface Ingredient {
  _id: string;
  name: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminIngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [mergeSource, setMergeSource] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchIngredients = useCallback(async (page: number, q: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/ingredients?${params}`);
    if (res.ok) {
      const data = await res.json();
      setIngredients(data.ingredients);
      setPagination(data.pagination);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchIngredients(1, "");
  }, [fetchIngredients]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(search);
    fetchIngredients(1, search);
  }

  function startEdit(ing: Ingredient) {
    setEditingId(ing._id);
    setEditName(ing.name);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleSaveEdit(id: string) {
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch(`/api/admin/ingredients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setEditingId(null);
    setSuccess(`Renamed to "${data.name}"`);
    fetchIngredients(pagination.page, activeSearch);
  }

  async function handleDelete(id: string) {
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch(`/api/admin/ingredients/${id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setConfirmDeleteId(null);
    const msg = data.recipesAffected > 0
      ? `Ingredient deleted. ${data.recipesAffected} recipe(s) still reference it.`
      : "Ingredient deleted.";
    setSuccess(msg);
    fetchIngredients(pagination.page, activeSearch);
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/admin/ingredients/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: mergeSource, targetId: mergeTarget }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setMergeSource("");
    setMergeTarget("");
    setSuccess(`${data.message}. ${data.recipesUpdated} recipe(s) updated.`);
    fetchIngredients(pagination.page, activeSearch);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Manage Ingredients</h1>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4">{success}</div>
      )}

      <h2 className="text-lg font-semibold mb-3">
        Ingredients{pagination.total > 0 && ` (${pagination.total})`}
      </h2>

      <div className="border rounded-md divide-y mb-6">
        {ingredients.length === 0 && (
          <p className="p-4 text-[var(--muted-foreground)] text-sm">No ingredients found.</p>
        )}
        {ingredients.map((ing) => (
          <div key={ing._id} className="p-4">
            {editingId === ing._id ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveEdit(ing._id)}
                  disabled={loading || !editName.trim()}
                  className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-sm text-[var(--muted-foreground)] hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : confirmDeleteId === ing._id ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-red-700">Delete &ldquo;{ing.name}&rdquo;? This cannot be undone.</span>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleDelete(ing._id)}
                    disabled={loading}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-sm text-[var(--muted-foreground)] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{ing.name}</span>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => startEdit(ing)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setConfirmDeleteId(ing._id); setError(""); setSuccess(""); }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {pagination.pages > 1 && (
        <div className="flex gap-3 justify-center mb-8">
          <button
            onClick={() => fetchIngredients(pagination.page - 1, activeSearch)}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-[var(--muted)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm self-center text-[var(--muted-foreground)]">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => fetchIngredients(pagination.page + 1, activeSearch)}
            disabled={pagination.page >= pagination.pages}
            className="px-3 py-1.5 border rounded-md text-sm hover:bg-[var(--muted)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      <div className="border rounded-md p-6">
        <h2 className="text-lg font-semibold mb-1">Merge Duplicates</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          The source ingredient will be deleted and all recipe references will point to the target.
        </p>
        <form onSubmit={handleMerge} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Source (delete this)</label>
              <select
                value={mergeSource}
                onChange={(e) => setMergeSource(e.target.value)}
                required
                className="w-full border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select ingredient…</option>
                {ingredients.map((ing) => (
                  <option key={ing._id} value={ing._id}>{ing.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Target (keep this)</label>
              <select
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
                required
                className="w-full border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select ingredient…</option>
                {ingredients.map((ing) => (
                  <option key={ing._id} value={ing._id}>{ing.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !mergeSource || !mergeTarget || mergeSource === mergeTarget}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Merging…" : "Merge"}
          </button>
        </form>
      </div>
    </div>
  );
}
