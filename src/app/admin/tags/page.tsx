"use client";

import { useState, useEffect, useCallback } from "react";

interface TagRow {
  name: string;
  tagId: string | null;
  showInFilter: boolean;
  recipeCount: number;
}

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/admin/tags");
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  async function toggleFilter(tag: TagRow) {
    setError("");
    setSuccess("");
    setLoading(true);

    if (!tag.tagId) {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tag.name, showInFilter: true }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update");
        return;
      }
    } else {
      const res = await fetch(`/api/admin/tags/${tag.tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showInFilter: !tag.showInFilter }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update");
        return;
      }
    }

    await fetchTags();
  }

  function startEdit(tag: TagRow) {
    setEditingName(tag.name);
    setEditValue(tag.name);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditingName(null);
    setEditValue("");
  }

  async function handleSaveEdit(tag: TagRow) {
    setError("");
    setLoading(true);

    const res = tag.tagId
      ? await fetch(`/api/admin/tags/${tag.tagId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editValue }),
        })
      : await fetch("/api/admin/tags", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tag.name, newName: editValue }),
        });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to rename");
      return;
    }

    setEditingName(null);
    setSuccess(`Renamed to "${data.name}"`);
    await fetchTags();
  }

  async function handleDelete(tagId: string, tagName: string) {
    setError("");
    setLoading(true);

    const res = await fetch(`/api/admin/tags/${tagId}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to delete");
      return;
    }

    setConfirmDeleteId(null);
    setSuccess(
      data.recipesAffected > 0
        ? `"${tagName}" deleted and removed from ${data.recipesAffected} recipe(s).`
        : `"${tagName}" deleted.`
    );
    await fetchTags();
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">Manage Tags</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Toggle &ldquo;Show in filter&rdquo; to control which tags appear as quick-filter chips on
        the recipes page. Tags must be enabled before they can be renamed or deleted.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4">{success}</div>
      )}

      <div className="border rounded-md divide-y">
        {tags.length === 0 && (
          <p className="p-4 text-[var(--muted-foreground)] text-sm">No tags found.</p>
        )}
        {tags.map((tag) => (
          <div key={tag.name} className="p-4">
            {editingName === tag.name ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(tag);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveEdit(tag)}
                  disabled={loading || !editValue.trim()}
                  className="text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
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
            ) : confirmDeleteId !== null && confirmDeleteId === tag.tagId ? (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-red-700">
                  Delete &ldquo;{tag.name}&rdquo;? Removes from all recipes.
                </span>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleDelete(tag.tagId!, tag.name)}
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{tag.name}</span>
                  <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                    {tag.recipeCount} {tag.recipeCount === 1 ? "recipe" : "recipes"}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={tag.showInFilter}
                        onChange={() => toggleFilter(tag)}
                        disabled={loading}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-[var(--border)] rounded-full peer peer-checked:bg-[var(--accent)] transition-colors duration-150" />
                      <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-150 peer-checked:translate-x-4" />
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">Show in filter</span>
                  </label>
                  <button
                    onClick={() => startEdit(tag)}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    Rename
                  </button>
                  {tag.tagId && (
                    <button
                      onClick={() => {
                        setConfirmDeleteId(tag.tagId);
                        setError("");
                        setSuccess("");
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
