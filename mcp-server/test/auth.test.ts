import { test } from "node:test";
import assert from "node:assert/strict";
import { apiKeyClient, ApiKeyRejectedError } from "../src/auth.js";

/** A fake clang-auth + app: counts exchanges, and the app 401s tokens in `rejected`. */
function harness(opts: { exchangeStatus?: number; expiresIn?: number } = {}) {
  let clock = 1_000_000;
  let exchanges = 0;
  const rejected = new Set<string>();
  const seen: string[] = [];

  const fakeFetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    if (url.endsWith("/api/token")) {
      assert.equal(auth, "Bearer ca_key_test");
      assert.equal(init?.method, "POST");
      exchanges++;
      // Let concurrent callers pile up before answering.
      await new Promise((r) => setTimeout(r, 5));
      if (opts.exchangeStatus) return new Response("{}", { status: opts.exchangeStatus });
      return Response.json({ token: `tok-${exchanges}`, token_type: "Bearer", expires_in: opts.expiresIn ?? 900 });
    }
    const token = auth.replace(/^Bearer /, "");
    seen.push(token);
    // Paths ending in /<n> answer after n × 10 ms, to order concurrent requests.
    const n = Number(url.split("/").pop());
    if (Number.isFinite(n)) await new Promise((r) => setTimeout(r, n * 10));
    return rejected.has(token) ? new Response("", { status: 401 }) : Response.json({ ok: true });
  }) as typeof fetch;

  const client = apiKeyClient({
    authBaseUrl: "http://auth.test",
    apiKey: "ca_key_test",
    fetch: fakeFetch,
    now: () => clock,
  });
  return {
    client,
    rejected,
    seen,
    exchanges: () => exchanges,
    advance: (ms: number) => (clock += ms),
  };
}

test("the first call exchanges the key and sends the token to the app", async () => {
  const h = harness();
  const res = await h.client.fetch("http://app.test/api/me");
  assert.equal(res.status, 200);
  assert.equal(h.exchanges(), 1);
  assert.deepEqual(h.seen, ["tok-1"]);
});

test("the token is reused until 60 s before it expires", async () => {
  const h = harness();
  await h.client.fetch("http://app.test/a");
  h.advance(839_000); // 13 min 59 s: still inside 900 s − 60 s
  await h.client.fetch("http://app.test/b");
  assert.equal(h.exchanges(), 1);
  h.advance(2_000); // past the refresh point
  await h.client.fetch("http://app.test/c");
  assert.equal(h.exchanges(), 2);
  assert.deepEqual(h.seen, ["tok-1", "tok-1", "tok-2"]);
});

test("a 401 from the app triggers one fresh exchange and a retry", async () => {
  const h = harness();
  await h.client.token();
  h.rejected.add("tok-1");
  const res = await h.client.fetch("http://app.test/api/recipes");
  assert.equal(res.status, 200);
  assert.equal(h.exchanges(), 2);
  assert.deepEqual(h.seen, ["tok-1", "tok-2"]);
});

test("a second 401 is returned, not retried forever", async () => {
  const h = harness();
  await h.client.token();
  h.rejected.add("tok-1");
  h.rejected.add("tok-2");
  const res = await h.client.fetch("http://app.test/api/recipes");
  assert.equal(res.status, 401);
  assert.equal(h.exchanges(), 2);
});

test("concurrent calls share one exchange", async () => {
  const h = harness();
  await Promise.all([1, 2, 3, 4].map((i) => h.client.fetch(`http://app.test/${i}`)));
  assert.equal(h.exchanges(), 1);
});

test("concurrent 401s share one re-exchange", async () => {
  // Request 1's 401 re-exchanges (tok-2) before requests 2 and 3 see their
  // 401s for tok-1: they must reuse tok-2, not discard it.
  const h = harness();
  await h.client.token();
  h.rejected.add("tok-1");
  const results = await Promise.all([1, 2, 3].map((i) => h.client.fetch(`http://app.test/${i}`)));
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
  assert.equal(h.exchanges(), 2);
});

test("the refresh skew is capped at half a short token lifetime", async () => {
  const h = harness({ expiresIn: 60 }); // skew 60 s would mean never caching
  await h.client.token();
  h.advance(29_000);
  await h.client.token();
  assert.equal(h.exchanges(), 1);
  h.advance(2_000); // past the 30 s halfway point
  await h.client.token();
  assert.equal(h.exchanges(), 2);
});

test("an exchange 401 throws ApiKeyRejectedError", async () => {
  const h = harness({ exchangeStatus: 401 });
  await assert.rejects(h.client.fetch("http://app.test/api/me"), ApiKeyRejectedError);
});

test("other exchange failures throw with the status", async () => {
  const h = harness({ exchangeStatus: 503 });
  await assert.rejects(h.client.fetch("http://app.test/api/me"), /503/);
});
