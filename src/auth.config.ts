import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isAuthenticated = !!auth?.user;
      const role = (auth?.user as { role?: string })?.role;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        if (!isAuthenticated) return false;
        if (role !== "admin") {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      const protectedPaths = ["/saved", "/recipes/new"];
      const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );

      if (isProtected) return isAuthenticated;
      return true;
    },
  },
  providers: [],
};
