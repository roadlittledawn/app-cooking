import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-gray-600 mb-6">Page not found</p>
      <Link
        href="/recipes"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Back to Recipes
      </Link>
    </div>
  );
}
