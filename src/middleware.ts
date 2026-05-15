export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/admin/:path*", "/recipes/new", "/recipes/:id/edit", "/saved"],
};
