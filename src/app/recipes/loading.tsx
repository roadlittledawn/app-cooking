export default function RecipesLoading() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="mb-6 h-10 bg-gray-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            <div className="aspect-video bg-gray-200 animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
