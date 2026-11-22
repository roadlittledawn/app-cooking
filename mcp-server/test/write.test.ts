import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ApiError, type CookingApi } from "../src/api.js";
import { resolveIngredients, UnknownIngredientsError } from "../src/resolve.js";
import { createServer } from "../src/server.js";

const BASE = "http://cooking.test";
const RECIPE_ID = "6b0339a4fe56ad03f2195a39";

/** Ingredients by exact name, plus a record of writes. */
function fakeApi(known: Record<string, string>, opts: { putError?: ApiError } = {}) {
  const lookups: string[] = [];
  const writes: { method: string; path: string; body: unknown }[] = [];
  const api: CookingApi = {
    baseUrl: BASE,
    async get<T>(path: string, query?: Record<string, string | number | undefined>) {
      assert.equal(path, "/api/ingredients");
      const name = String(query?.name);
      lookups.push(name);
      return (known[name] ? [{ _id: known[name], name }] : []) as T;
    },
    async post<T>(path: string, body: unknown) {
      writes.push({ method: "POST", path, body });
      if (path === "/api/ingredients") {
        return { _id: "new-id", name: (body as { name: string }).name } as T;
      }
      return { _id: RECIPE_ID, title: (body as { title: string }).title } as T;
    },
    async put<T>(path: string, body: unknown) {
      writes.push({ method: "PUT", path, body });
      if (opts.putError) throw opts.putError;
      return { _id: RECIPE_ID, title: "Updated" } as T;
    },
  };
  return { api, lookups, writes };
}

async function connect(api: CookingApi) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([
    createServer({ api, authBaseUrl: "http://auth.test" }).connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { text: string }[])[0].text;

const draft = {
  title: "Tomato soup",
  servings: 2,
  prepTime: 5,
  cookTime: 20,
  steps: "1. Simmer",
  tags: ["soup"],
};

test("resolveIngredients maps names to ids, case- and space-insensitively", async () => {
  const { api, lookups } = fakeApi({ tomato: "t1", "olive oil": "o1" });
  const lines = await resolveIngredients(api, [
    { name: " Tomato ", amount: "4 " },
    { name: "Olive Oil", amount: "2", unit: " tbsp" },
    { name: "tomato", amount: "1" },
  ]);
  assert.deepEqual(lines, [
    { ingredientId: "t1", amount: "4", unit: "" },
    { ingredientId: "o1", amount: "2", unit: "tbsp" },
    { ingredientId: "t1", amount: "1", unit: "" },
  ]);
  assert.deepEqual(lookups.sort(), ["olive oil", "tomato"], "each name looked up once");
});

test("resolveIngredients lists every unknown name", async () => {
  const { api } = fakeApi({ tomato: "t1" });
  await assert.rejects(
    resolveIngredients(api, [
      { name: "Shallot", amount: "1" },
      { name: "tomato", amount: "4" },
      { name: "gochujang", amount: "1", unit: "tbsp" },
    ]),
    (err: unknown) => err instanceof UnknownIngredientsError && err.names.join() === "shallot,gochujang"
  );
});

test("create_recipe resolves names and posts the API's shape", async () => {
  const { api, writes } = fakeApi({ tomato: "t1" });
  const client = await connect(api);
  const result = await client.callTool({
    name: "create_recipe",
    arguments: { ...draft, ingredients: [{ name: "Tomato", amount: "4" }] },
  });
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(text(result)), {
    id: RECIPE_ID,
    title: "Tomato soup",
    url: `${BASE}/recipes/${RECIPE_ID}`,
  });
  assert.deepEqual(writes, [
    {
      method: "POST",
      path: "/api/recipes",
      body: { ...draft, description: "", ingredients: [{ ingredientId: "t1", amount: "4", unit: "" }] },
    },
  ]);
});

test("create_recipe with an unknown ingredient writes nothing and never creates it", async () => {
  const { api, writes } = fakeApi({ tomato: "t1" });
  const client = await connect(api);
  const result = await client.callTool({
    name: "create_recipe",
    arguments: { ...draft, ingredients: [{ name: "tomato", amount: "4" }, { name: "shallot", amount: "1" }] },
  });
  assert.equal(result.isError, true);
  assert.match(text(result), /^Unknown ingredients: shallot\. Nothing was saved/);
  assert.deepEqual(writes, []);
});

test("create_ingredient returns an existing match instead of a duplicate", async () => {
  const { api, writes } = fakeApi({ shallot: "s1" });
  const client = await connect(api);
  const existing = JSON.parse(text(await client.callTool({ name: "create_ingredient", arguments: { name: "Shallot " } })));
  assert.deepEqual(existing, { id: "s1", name: "shallot", created: false });
  const created = JSON.parse(text(await client.callTool({ name: "create_ingredient", arguments: { name: "Gochujang" } })));
  assert.deepEqual(created, { id: "new-id", name: "gochujang", created: true });
  assert.deepEqual(writes, [{ method: "POST", path: "/api/ingredients", body: { name: "gochujang" } }]);
});

test("update_recipe sends only the given fields", async () => {
  const { api, writes } = fakeApi({ tomato: "t1" });
  const client = await connect(api);
  await client.callTool({ name: "update_recipe", arguments: { id: RECIPE_ID, cookTime: 25 } });
  await client.callTool({
    name: "update_recipe",
    arguments: { id: RECIPE_ID, ingredients: [{ name: "tomato", amount: "5" }] },
  });
  assert.deepEqual(writes, [
    { method: "PUT", path: `/api/recipes/${RECIPE_ID}`, body: { cookTime: 25 } },
    {
      method: "PUT",
      path: `/api/recipes/${RECIPE_ID}`,
      body: { ingredients: [{ ingredientId: "t1", amount: "5", unit: "" }] },
    },
  ]);
});

test("update_recipe with no changes, or on someone else's recipe, is an error", async () => {
  const { api, writes } = fakeApi({}, { putError: new ApiError(403, "Forbidden") });
  const client = await connect(api);
  const empty = await client.callTool({ name: "update_recipe", arguments: { id: RECIPE_ID } });
  assert.equal(empty.isError, true);
  assert.match(text(empty), /Nothing to update/);
  assert.equal(writes.length, 0);
  const forbidden = await client.callTool({ name: "update_recipe", arguments: { id: RECIPE_ID, title: "Mine now" } });
  assert.equal(forbidden.isError, true);
  assert.match(text(forbidden), /only edit your own recipes/);
});
