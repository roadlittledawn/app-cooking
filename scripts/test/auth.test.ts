/**
 * clang-auth tests: token verification (cookie and Bearer), grant → role, the
 * API write policy, return-path validation, and the migration's link planning.
 *
 * Hermetic: signs tokens with a throwaway ES256 key and injects its public half
 * with setJwksForTesting, so no auth service, network or database is needed.
 * Cookie, proxy and DB behavior are checked manually (docs/clang-auth-migration.md, V1).
 *
 *   npm run test:auth
 */

import assert from "node:assert/strict";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { apiWriteDecision } from "../../src/lib/auth/api-write-policy";
import {
  displayName,
  requestToken,
  resolveToken,
  roleFromGrant,
  safeReturnPath,
  setJwksForTesting,
  type AuthSettings,
} from "../../src/lib/auth/clang-auth";
import { planSubLinks } from "../../src/lib/auth/link-plan";

let failed = 0;
let passed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err instanceof Error ? err.message : String(err)}`);
  }
}

const settings: AuthSettings = { authBaseUrl: "https://auth.test", appSlug: "cooking" };

interface SignOptions {
  apps?: Record<string, string[]>;
  issuer?: string;
  expiresIn?: string | number;
  kid?: string;
  key?: CryptoKey;
  sub?: string | null;
  alg?: string;
  /** e.g. ["api_key"] for a token exchanged from a clang-auth API key. */
  amr?: string[];
}

async function main() {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const other = await generateKeyPair("ES256");
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "test-key", alg: "ES256", use: "sig" };
  setJwksForTesting(createLocalJWKSet({ keys: [jwk] }));

  function sign(opts: SignOptions = {}): Promise<string> {
    const jwt = new SignJWT({
      email: "Me@Example.com",
      name: "Me",
      apps: opts.apps ?? { cooking: ["admin"] },
      ...(opts.amr ? { amr: opts.amr } : {}),
    })
      .setProtectedHeader({ alg: "ES256", kid: opts.kid ?? "test-key" })
      .setIssuer(opts.issuer ?? settings.authBaseUrl)
      .setIssuedAt()
      .setJti(crypto.randomUUID())
      .setExpirationTime(opts.expiresIn ?? "15m");
    if (opts.sub !== null) jwt.setSubject(opts.sub ?? "user-1");
    return jwt.sign(opts.key ?? privateKey);
  }

  console.log("token verification");

  await test("valid admin token → ok, admin, lowercased email", async () => {
    const state = await resolveToken(await sign(), settings);
    assert.equal(state.status, "ok");
    if (state.status !== "ok") return;
    assert.equal(state.identity.sub, "user-1");
    assert.equal(state.identity.email, "me@example.com");
    assert.equal(state.identity.role, "admin");
    assert.ok(state.identity.exp > Date.now() / 1000);
  });

  await test("grant with no roles → ok, user", async () => {
    const state = await resolveToken(await sign({ apps: { cooking: [] } }), settings);
    assert.equal(state.status, "ok");
    if (state.status === "ok") assert.equal(state.identity.role, "user");
  });

  await test("no grant for this app → forbidden", async () => {
    const state = await resolveToken(await sign({ apps: { kb: ["admin"] } }), settings);
    assert.deepEqual(state, { status: "forbidden", email: "Me@Example.com" });
  });

  await test("missing token → anonymous", async () => {
    assert.deepEqual(await resolveToken(undefined, settings), { status: "anonymous" });
  });

  await test("garbage token → anonymous", async () => {
    assert.deepEqual(await resolveToken("not.a.jwt", settings), { status: "anonymous" });
  });

  await test("expired token (beyond clock tolerance) → anonymous", async () => {
    const token = await sign({ expiresIn: Math.floor(Date.now() / 1000) - 120 });
    assert.deepEqual(await resolveToken(token, settings), { status: "anonymous" });
  });

  await test("wrong issuer → anonymous", async () => {
    const token = await sign({ issuer: "https://evil.test" });
    assert.deepEqual(await resolveToken(token, settings), { status: "anonymous" });
  });

  await test("signed by an unknown key (same kid) → anonymous", async () => {
    const token = await sign({ key: other.privateKey });
    assert.deepEqual(await resolveToken(token, settings), { status: "anonymous" });
  });

  await test("unknown kid → anonymous", async () => {
    const token = await sign({ kid: "other-key" });
    assert.deepEqual(await resolveToken(token, settings), { status: "anonymous" });
  });

  await test("HS256 token → anonymous", async () => {
    const secret = new TextEncoder().encode("a-shared-secret-that-is-long-enough!");
    const token = await new SignJWT({ email: "me@example.com", apps: { cooking: ["admin"] } })
      .setProtectedHeader({ alg: "HS256", kid: "test-key" })
      .setSubject("user-1")
      .setIssuer(settings.authBaseUrl)
      .setExpirationTime("15m")
      .sign(secret);
    assert.deepEqual(await resolveToken(token, settings), { status: "anonymous" });
  });

  await test("missing sub → anonymous", async () => {
    const token = await sign({ sub: null });
    assert.deepEqual(await resolveToken(token, settings), { status: "anonymous" });
  });

  console.log("helpers");

  await test("roleFromGrant", () => {
    assert.equal(roleFromGrant(["admin"]), "admin");
    assert.equal(roleFromGrant(["member", "admin"]), "admin");
    assert.equal(roleFromGrant([]), "user");
    assert.equal(roleFromGrant(["editor"]), "user");
  });

  await test("displayName falls back to the email's local part", () => {
    assert.equal(displayName({ name: "Kim", email: "k@x.com" }), "Kim");
    assert.equal(displayName({ name: null, email: "kim@x.com" }), "kim");
    assert.equal(displayName({ name: "  ", email: "kim@x.com" }), "kim");
  });

  await test("safeReturnPath keeps local paths and rejects everything else", () => {
    assert.equal(safeReturnPath("/saved"), "/saved");
    assert.equal(safeReturnPath("/recipes?tags=soup"), "/recipes?tags=soup");
    assert.equal(safeReturnPath(null), "/");
    assert.equal(safeReturnPath(""), "/");
    assert.equal(safeReturnPath("https://evil.test/"), "/");
    assert.equal(safeReturnPath("//evil.test/"), "/");
    assert.equal(safeReturnPath("/\\evil.test/"), "/");
    assert.equal(safeReturnPath("javascript:alert(1)"), "/");
  });

  console.log("bearer tokens (local MCP server)");

  await test("requestToken: no Authorization header → the cookie", () => {
    assert.equal(requestToken(null, "cookie-jwt"), "cookie-jwt");
    assert.equal(requestToken(undefined, undefined), undefined);
  });

  await test("requestToken: a Bearer header wins over the cookie", () => {
    assert.equal(requestToken("Bearer header-jwt", "cookie-jwt"), "header-jwt");
    assert.equal(requestToken("bearer  header-jwt ", undefined), "header-jwt");
  });

  await test("requestToken: a malformed header never falls back to the cookie", () => {
    for (const header of ["", "Bearer", "Bearer ", "Basic abc", "Bearer a b", "header-jwt"]) {
      assert.equal(requestToken(header, "cookie-jwt"), undefined, JSON.stringify(header));
    }
  });

  await test("valid Bearer token → ok", async () => {
    const state = await resolveToken(requestToken(`Bearer ${await sign()}`, undefined), settings);
    assert.equal(state.status, "ok");
  });

  await test("garbage Bearer token with a valid cookie → anonymous", async () => {
    const state = await resolveToken(requestToken("Bearer nope", await sign()), settings);
    assert.equal(state.status, "anonymous");
  });

  await test("expired Bearer token → anonymous", async () => {
    const token = await sign({ expiresIn: Math.floor(Date.now() / 1000) - 120 });
    const state = await resolveToken(requestToken(`Bearer ${token}`, undefined), settings);
    assert.equal(state.status, "anonymous");
  });

  await test("API-key token with no roles → ok, user (roles come from the key)", async () => {
    const token = await sign({ amr: ["api_key"], apps: { cooking: [] } });
    const state = await resolveToken(requestToken(`Bearer ${token}`, undefined), settings);
    assert.equal(state.status, "ok");
    if (state.status !== "ok") return;
    assert.equal(state.identity.role, "user");
  });

  await test("API-key token scoped to another app → forbidden", async () => {
    const token = await sign({ amr: ["api_key"], apps: { health: [] } });
    const state = await resolveToken(requestToken(`Bearer ${token}`, undefined), settings);
    assert.equal(state.status, "forbidden");
  });

  console.log("API write policy (proxy)");

  await test("reads always pass", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      assert.deepEqual(apiWriteDecision(method, false, false), { allow: true });
      assert.deepEqual(apiWriteDecision(method, true, false), { allow: true });
    }
  });

  await test("cookie writes must be same-origin", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assert.deepEqual(apiWriteDecision(method, false, true), { allow: true });
      const refused = apiWriteDecision(method, false, false);
      assert.equal(refused.allow, false);
      if (!refused.allow) assert.equal(refused.status, 403);
    }
  });

  await test("Bearer writes skip the origin check", () => {
    for (const method of ["POST", "PUT", "PATCH"]) {
      assert.deepEqual(apiWriteDecision(method, true, false), { allow: true });
    }
  });

  await test("Bearer DELETE is refused, even same-origin", () => {
    for (const sameOrigin of [true, false]) {
      const decision = apiWriteDecision("DELETE", true, sameOrigin);
      assert.equal(decision.allow, false);
      if (!decision.allow) assert.equal(decision.status, 403);
    }
  });

  console.log("migration link planning");

  const users = [
    { id: "u-me", email: "me@example.com" },
    { id: "u-kim", email: "kim@example.com" },
    { id: "u-linked", email: "linked@example.com", clangAuthSub: "sub-linked" },
    { id: "u-orphan", email: "orphan@example.com" },
  ];

  await test("links by email (case-insensitive) and reports both unmatched sides", () => {
    const plan = planSubLinks(
      [
        { email: "Me@Example.com", sub: "sub-me" },
        { email: "kim@example.com", sub: "sub-kim" },
        { email: "linked@example.com", sub: "sub-linked" },
        { email: "new@example.com", sub: "sub-new" },
      ],
      users
    );
    assert.deepEqual(plan.link, [
      { userId: "u-me", email: "me@example.com", sub: "sub-me" },
      { userId: "u-kim", email: "kim@example.com", sub: "sub-kim" },
    ]);
    assert.deepEqual(plan.alreadyLinked, [{ userId: "u-linked", email: "linked@example.com", sub: "sub-linked" }]);
    assert.deepEqual(plan.noLocalUser, [{ email: "new@example.com", sub: "sub-new" }]);
    assert.deepEqual(plan.noClangAuthUser.map((u) => u.id), ["u-orphan"]);
    assert.deepEqual(plan.conflicts, []);
  });

  await test("refuses to relink a user to a different sub", () => {
    const plan = planSubLinks([{ email: "linked@example.com", sub: "sub-other" }], users);
    assert.equal(plan.link.length, 0);
    assert.equal(plan.conflicts.length, 1);
  });

  await test("refuses a sub that's already on another user", () => {
    const plan = planSubLinks([{ email: "me@example.com", sub: "sub-linked" }], users);
    assert.equal(plan.link.length, 0);
    assert.match(plan.conflicts[0].reason, /already linked to user u-linked/);
  });

  await test("refuses duplicate entries in the mapping", () => {
    const plan = planSubLinks(
      [
        { email: "me@example.com", sub: "sub-me" },
        { email: "kim@example.com", sub: "sub-me" },
      ],
      users
    );
    assert.equal(plan.link.length, 1);
    assert.equal(plan.conflicts.length, 1);
  });

  await test("is idempotent: rerunning after apply links nothing", () => {
    const after = users.map((u) => (u.id === "u-me" ? { ...u, clangAuthSub: "sub-me" } : u));
    const plan = planSubLinks([{ email: "me@example.com", sub: "sub-me" }], after);
    assert.equal(plan.link.length, 0);
    assert.equal(plan.alreadyLinked.length, 1);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
