import { NextResponse } from "next/server";
import { getAuthState, getCurrentUser } from "@/lib/auth/current-user";

/** Who is signed in, for the header and AuthProvider. 401 anonymous, 403 no grant. */
export async function GET() {
  const state = await getAuthState();
  if (state.status === "anonymous") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (state.status === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
}
