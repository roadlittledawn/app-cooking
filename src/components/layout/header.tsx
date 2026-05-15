"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b">
      <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/recipes" className="text-xl font-bold">
          App Cooking
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/recipes" className="text-sm hover:underline">
            Recipes
          </Link>

          {session?.user ? (
            <>
              <Link href="/saved" className="text-sm hover:underline">
                Saved
              </Link>
              <Link href="/recipes/new" className="text-sm hover:underline">
                New Recipe
              </Link>
              {(session.user as { role?: string }).role === "admin" && (
                <Link href="/admin/invites" className="text-sm hover:underline">
                  Invites
                </Link>
              )}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-gray-600">
                  {session.user.name}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-red-600 hover:underline"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
