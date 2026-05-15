export default function RecipeDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="h-9 w-2/3 bg-[var(--muted)] rounded animate-pulse" />
      <div className="flex gap-4">
        <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-24 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-20 bg-[var(--muted)] rounded animate-pulse" />
      </div>
      <div className="h-64 bg-[var(--muted)] rounded-lg animate-pulse" />
      <div className="space-y-2">
        <div className="h-6 w-32 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-full bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-[var(--muted)] rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-28 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-[var(--muted)] rounded animate-pulse" />
      </div>
    </div>
  );
}
