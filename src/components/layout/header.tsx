"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  const navLinks = [
    { href: "/recipes", label: "Recipes" },
    ...(session?.user
      ? [
          { href: "/saved", label: "Saved" },
          { href: "/recipes/new", label: "New Recipe" },
          ...(isAdmin
            ? [
                { href: "/admin/invites", label: "Invites" },
                { href: "/admin/ingredients", label: "Ingredients" },
                { href: "/admin/tags", label: "Tags" },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-xl md:text-2xl tracking-tight text-[var(--foreground)] hover:text-[var(--accent)] transition-colors duration-200"
        >
          Abramogosch Cooking
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}

          {session?.user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-[var(--border)]">
              <span className="text-sm text-[var(--muted-foreground)] max-w-[120px] truncate">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-[var(--accent)] text-white px-4 py-1.5 rounded-sm hover:bg-[var(--accent-dark)] transition-colors duration-150 tracking-wide"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: right side */}
        <div className="flex md:hidden items-center gap-3">
          {!session?.user && (
            <Link
              href="/login"
              className="text-sm bg-[var(--accent)] text-white px-3 py-1.5 rounded-sm hover:bg-[var(--accent-dark)] transition-colors duration-150"
            >
              Sign in
            </Link>
          )}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm text-[var(--foreground)] py-1"
            >
              {link.label}
            </Link>
          ))}
          {session?.user && (
            <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">{session.user.name}</span>
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
