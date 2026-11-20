import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/auth/clang-auth";
import { loginUrlFor } from "@/lib/auth/current-user";

/**
 * Sign-in happens at clang-auth. This route only keeps old /login and
 * /login?callbackUrl=… links working.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  const path = safeReturnPath(Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl);
  redirect(await loginUrlFor(path));
}
