"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  UtensilsCrossed,
  PlusCircle,
  Mail,
  Carrot,
  Tag,
  Menu,
  X,
  User,
  ChevronDown,
  Bookmark,
  ShieldCheck,
  LogOut,
} from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"admin" | "account" | null>(null);
  const desktopNavRef = useRef<HTMLElement>(null);

  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (desktopNavRef.current && !desktopNavRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function toggleDropdown(name: "admin" | "account") {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }

  const mainLinks = [
    { href: "/recipes", label: "Recipes", icon: UtensilsCrossed },
    ...(session?.user ? [{ href: "/recipes/new", label: "New Recipe", icon: PlusCircle }] : []),
  ];

  const adminLinks = [
    { href: "/admin/invites", label: "Invites", icon: Mail },
    { href: "/admin/ingredients", label: "Ingredients", icon: Carrot },
    { href: "/admin/tags", label: "Tags", icon: Tag },
  ];

  const accountLinks = [
    { href: "/saved", label: "Saved Recipes", icon: Bookmark },
  ];

  const dropdownItemClass =
    "flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors duration-100";

  const dropdownMenuClass =
    "absolute right-0 top-full mt-2 w-44 bg-[var(--card)] border border-[var(--border)] rounded-sm shadow-sm py-1 z-50";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-xl md:text-2xl tracking-tight text-[var(--foreground)] hover:text-[var(--accent)] transition-colors duration-200"
        >
          Abramogosch Cooking
        </Link>

        {/* Desktop nav */}
        <nav ref={desktopNavRef} className="hidden md:flex items-center gap-6">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
            >
              <link.icon className="w-3.5 h-3.5" />
              {link.label}
            </Link>
          ))}

          {/* Admin dropdown */}
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("admin")}
                className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${openDropdown === "admin" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "admin" && (
                <div className={dropdownMenuClass}>
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenDropdown(null)}
                      className={dropdownItemClass}
                    >
                      <link.icon className="w-3.5 h-3.5 shrink-0" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account dropdown / Sign in */}
          {session?.user ? (
            <div className="relative pl-4 border-l border-[var(--border)]">
              <button
                onClick={() => toggleDropdown("account")}
                className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-150"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[100px] truncate">{session.user.name}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${openDropdown === "account" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "account" && (
                <div className={dropdownMenuClass}>
                  {accountLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenDropdown(null)}
                      className={dropdownItemClass}
                    >
                      <link.icon className="w-3.5 h-3.5 shrink-0" />
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button
                      onClick={() => { signOut(); setOpenDropdown(null); }}
                      className={dropdownItemClass}
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
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

        {/* Mobile toggle */}
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
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background)] px-6 py-4 flex flex-col gap-1">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-sm text-[var(--foreground)] py-2"
            >
              <link.icon className="w-4 h-4 text-[var(--muted-foreground)]" />
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-1">
              <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Admin</span>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-sm text-[var(--foreground)] py-2"
                >
                  <link.icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {session?.user && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-col gap-1">
              <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1 truncate">
                {session.user.name}
              </span>
              {accountLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-sm text-[var(--foreground)] py-2"
                >
                  <link.icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
