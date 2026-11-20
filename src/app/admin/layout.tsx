import { redirect } from "next/navigation";
import { getCurrentUser, loginUrlFor } from "@/lib/auth/current-user";

/** Admin pages need the `admin` role in the clang-auth `cooking` grant. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // src/proxy.ts already redirects signed-out visitors; this is defense in depth.
  if (!user) redirect(await loginUrlFor("/admin"));
  if (user.role !== "admin") redirect("/");
  return <>{children}</>;
}
