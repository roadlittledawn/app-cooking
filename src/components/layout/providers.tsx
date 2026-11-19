"use client";

import { AuthProvider } from "./auth-provider";

export function Providers({
  authBaseUrl,
  children,
}: {
  authBaseUrl: string;
  children: React.ReactNode;
}) {
  return <AuthProvider authBaseUrl={authBaseUrl}>{children}</AuthProvider>;
}
