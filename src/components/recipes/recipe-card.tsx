import Link from "next/link";

interface RecipeCardProps {
  id: string;
  title: string;
  image: string | null;
  prepTime: number;
  cookTime: number;
  authorName: string;
  tags: string[];
}

export function RecipeCard({
  id,
  title,
  image,
  prepTime,
  cookTime,
  authorName,
  tags,
}: RecipeCardProps) {
  const totalTime = prepTime + cookTime;

  return (
    <Link
      href={`/recipes/${id}`}
      className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-video bg-gray-100 relative">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">by {authorName}</p>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          {totalTime > 0 && <span>{totalTime} min</span>}
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-gray-100 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
