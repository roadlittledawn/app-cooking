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
      className="group block bg-[var(--card)] border border-[var(--border)] rounded-sm overflow-hidden hover:shadow-md transition-all duration-300 hover:border-[var(--muted-foreground)]"
    >
      <div className="aspect-[4/3] bg-[var(--muted)] relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--border)]">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-[family-name:var(--font-playfair)] text-xl leading-snug line-clamp-2 text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors duration-200">
          {title}
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-1.5 italic">
          by {authorName}
        </p>
        {totalTime > 0 && (
          <div className="mt-3">
            <span className="text-xs bg-[var(--muted)] text-[var(--muted-foreground)] px-2.5 py-1 rounded-full">
              {totalTime} min
            </span>
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs border border-[var(--border)] text-[var(--muted-foreground)] px-2 py-0.5 rounded-sm"
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
