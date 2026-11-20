/**
 * Pure planning for scripts/migrate-clang-auth-sub.ts: decide which local
 * users get which clang-auth `sub`. No I/O, so it's unit-tested in
 * scripts/test/auth.test.ts.
 */

export interface SubMapping {
  email: string;
  sub: string;
}

export interface LocalUser {
  id: string;
  email: string;
  clangAuthSub?: string | null;
}

export interface LinkPlan {
  /** Writes to make: set clangAuthSub on these users. */
  link: { userId: string; email: string; sub: string }[];
  /** Already linked to the same sub: nothing to do. */
  alreadyLinked: { userId: string; email: string; sub: string }[];
  /** Refused: the write would break the one-to-one mapping. */
  conflicts: { email: string; sub: string; reason: string }[];
  /** clang-auth users with no local User; they get a new one on first sign-in. */
  noLocalUser: SubMapping[];
  /** Local users with no clang-auth account in the mapping. */
  noClangAuthUser: LocalUser[];
}

export function planSubLinks(mappings: SubMapping[], users: LocalUser[]): LinkPlan {
  const plan: LinkPlan = { link: [], alreadyLinked: [], conflicts: [], noLocalUser: [], noClangAuthUser: [] };

  const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const subOwner = new Map<string, string>(); // sub -> userId, existing links
  for (const u of users) if (u.clangAuthSub) subOwner.set(u.clangAuthSub, u.id);

  const matchedUserIds = new Set<string>();
  const seenSubs = new Set<string>();
  const seenEmails = new Set<string>();

  for (const raw of mappings) {
    const m = { email: raw.email.trim().toLowerCase(), sub: raw.sub.trim() };
    if (!m.email || !m.sub) {
      plan.conflicts.push({ ...m, reason: "empty email or sub in mapping" });
      continue;
    }
    if (seenSubs.has(m.sub) || seenEmails.has(m.email)) {
      plan.conflicts.push({ ...m, reason: "duplicate email or sub in mapping" });
      continue;
    }
    seenSubs.add(m.sub);
    seenEmails.add(m.email);

    const user = byEmail.get(m.email);
    if (!user) {
      // Its sub may still be linked to a user with a different email.
      if (subOwner.has(m.sub)) {
        plan.conflicts.push({ ...m, reason: `sub already linked to user ${subOwner.get(m.sub)}` });
      } else {
        plan.noLocalUser.push(m);
      }
      continue;
    }
    matchedUserIds.add(user.id);

    const entry = { userId: user.id, email: m.email, sub: m.sub };
    if (user.clangAuthSub === m.sub) {
      plan.alreadyLinked.push(entry);
    } else if (user.clangAuthSub) {
      plan.conflicts.push({ ...m, reason: `user already linked to a different sub (${user.clangAuthSub})` });
    } else if (subOwner.has(m.sub)) {
      plan.conflicts.push({ ...m, reason: `sub already linked to user ${subOwner.get(m.sub)}` });
    } else {
      plan.link.push(entry);
    }
  }

  plan.noClangAuthUser = users.filter((u) => !matchedUserIds.has(u.id) && !u.clangAuthSub);
  return plan;
}
